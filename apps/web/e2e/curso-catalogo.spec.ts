import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { eq, schema as s } from '@gutta/db';
import { becomeAdmin, ownerDb, setFeatures, signIn, uniqueEmail } from './helpers';

/*
  Curso do aluno e disciplina do semestre ligada ao catálogo (ADR 0026): a conta de teste nasce
  no curso escolhido, com as disciplinas de módulo publicado já ligadas; a tela da disciplina
  mostra as aulas do Cognuss; o admin troca o curso; o aluno liga uma disciplina pela sugestão.
*/
async function catalogCourse(name: string, discipline: string) {
  const db = ownerDb();
  const tag = randomUUID().slice(0, 6);
  const [course] = await db
    .insert(s.courses)
    .values({ name: `${name} ${tag}`, slug: `${name.toLowerCase()}-${tag}`, active: true })
    .returning();
  const [disc] = await db
    .insert(s.disciplines)
    .values({
      courseId: course!.id,
      name: `${discipline} ${tag}`,
      slug: `${discipline.toLowerCase()}-${tag}`,
      active: true,
    })
    .returning();
  const [topic] = await db
    .insert(s.topics)
    .values({ disciplineId: disc!.id, name: 'Conceitos', slug: `conceitos-${tag}` })
    .returning();
  await db.insert(s.modules).values({
    disciplineId: disc!.id,
    topicId: topic!.id,
    slug: `introducao-${tag}`,
    title: `Introdução a ${discipline} ${tag}`,
    lead: 'Primeira aula.',
    summaryMd: 'Resumo da aula.',
    status: 'published',
    publishedAt: new Date(),
  });
  return { course: course!, discipline: disc!, module: `Introdução a ${discipline} ${tag}` };
}

test.describe('curso do aluno e catálogo', () => {
  test.beforeAll(() => setFeatures(['disciplinas']));
  test.afterAll(() => setFeatures([]));

  test('conta de teste no curso escolhido, aulas na disciplina, troca de curso e sugestão', async ({
    browser,
  }) => {
    test.setTimeout(150_000);
    const farmacia = await catalogCourse('Farmacia', 'Farmacologia');
    const bio = await catalogCourse('Biomedicina', 'Bioquimica');

    const admin = await (await browser.newContext()).newPage();
    await becomeAdmin(admin, 'Rita Admin');
    await admin.goto('/admin/demo');
    const email = uniqueEmail('curso');
    await admin.getByLabel('E-mail da conta de teste').fill(email);
    await admin.getByLabel('Curso').selectOption({ label: farmacia.course.name });
    await admin.getByRole('button', { name: 'Criar conta de teste' }).click();
    await expect(admin.getByText('Conta criada.')).toBeVisible({ timeout: 30_000 });
    const password = (await admin.locator('code').nth(1).innerText()).trim();

    // O aluno acha a disciplina do catálogo no semestre, ligada, e as aulas dentro dela.
    const aluno = await (await browser.newContext()).newPage();
    await signIn(aluno, email, password, '/app/minhas-disciplinas');
    await expect(aluno.getByText(`Conteúdo do Cognuss: ${farmacia.discipline.name}`)).toBeVisible();
    await aluno.getByRole('link', { name: farmacia.discipline.name, exact: true }).first().click();
    await expect(aluno.getByRole('heading', { name: 'Aulas do Cognuss' })).toBeVisible();
    await aluno.getByRole('link', { name: farmacia.module }).click();
    await expect(aluno.getByRole('heading', { name: farmacia.module })).toBeVisible();

    // A lista de cursos conta o aluno, e o admin troca o curso dele.
    await admin.goto('/admin/cursos');
    await expect(
      admin
        .getByRole('row', { name: new RegExp(farmacia.course.name) })
        .getByRole('cell')
        .nth(2),
    ).toHaveText('1');
    const user = await ownerDb().query.authUsers.findFirst({
      where: eq(s.authUsers.email, email),
    });
    await admin.goto(`/admin/usuarios/${user!.id}`);
    const curso = admin.getByRole('region', { name: 'Curso do aluno' });
    await expect(curso.getByLabel('Curso')).toHaveValue(farmacia.course.id);
    await curso.getByLabel('Curso').selectOption({ label: bio.course.name });
    await curso.getByRole('button', { name: 'Trocar curso' }).click();
    await expect(admin.getByText('Curso do aluno atualizado.')).toBeVisible();
    await expect(admin.getByText('student.course_changed')).toBeVisible();

    // No curso novo, a ligação antiga não vale e a sugestão é a do curso novo.
    await aluno.goto('/app/minhas-disciplinas');
    await expect(aluno.getByText(`Conteúdo do Cognuss: ${farmacia.discipline.name}`)).toHaveCount(
      0,
    );
    await aluno.getByRole('button', { name: `${bio.discipline.name} · 1 módulo` }).click();
    await expect(aluno.getByLabel('Nome da disciplina')).toHaveValue(bio.discipline.name);
    await aluno.getByRole('button', { name: 'Adicionar disciplina' }).click();
    await expect(aluno.getByText(`Conteúdo do Cognuss: ${bio.discipline.name}`)).toBeVisible();
    await expect(
      aluno.getByRole('button', { name: `${bio.discipline.name} · 1 módulo` }),
    ).toHaveCount(0);
  });
});
