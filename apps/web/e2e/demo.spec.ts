import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { eq, schema as s } from '@gutta/db';
import { becomeAdmin, ownerDb, setFeatures, signIn, uniqueEmail } from './helpers';

// Conta de teste para o QA (admin /admin/demo): cadastro completo e semestre preenchido, com os
// PDFs de teste processados pelo worker como num envio de verdade.
test.describe('conta de teste', () => {
  test.beforeAll(() => setFeatures(['disciplinas', 'materiais', 'faltas', 'notas', 'agenda']));
  test.afterAll(() => setFeatures([]));

  test('admin cria; o aluno entra com a senha gerada e acha o semestre pronto', async ({
    browser,
  }) => {
    test.setTimeout(150_000);
    const admin = await (await browser.newContext()).newPage();
    await becomeAdmin(admin, 'Rita Admin');
    await admin.goto('/admin/demo');
    await expect(admin.getByRole('heading', { name: 'Conta de teste' })).toBeVisible();
    expect(
      (await new AxeBuilder({ page: admin }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze())
        .violations,
    ).toEqual([]);
    const email = uniqueEmail('demo-aluno');
    await admin.getByLabel('E-mail da conta de teste').fill(email);
    await admin.getByRole('button', { name: 'Criar conta de teste' }).click();
    await expect(admin.getByText('Conta criada.')).toBeVisible({ timeout: 30_000 });
    const password = (await admin.locator('code').nth(1).innerText()).trim();
    expect(password).toHaveLength(16);

    // Mesmo e-mail de novo: recusa sem criar outra conta.
    await admin.getByLabel('E-mail da conta de teste').fill(email);
    await admin.getByRole('button', { name: 'Criar conta de teste' }).click();
    await expect(admin.getByText('Já existe uma conta com esse e-mail. Use outro.')).toBeVisible();

    const aluno = await (await browser.newContext()).newPage();
    await signIn(aluno, email, password, '/app/minhas-disciplinas');
    await expect(aluno).toHaveURL(/\/app\/minhas-disciplinas/);
    for (const name of ['Fisiologia cardiovascular', 'Patologia geral', 'Farmacologia básica'])
      await expect(aluno.getByRole('link', { name })).toBeVisible();

    await aluno.goto('/app/materiais');
    const slides = aluno.getByRole('link', { name: 'Slides: Inflamação aguda e crônica' });
    await expect(slides).toBeVisible();
    await expect(aluno.getByRole('link', { name: 'Prova anterior: P1 de 2025/2' })).toBeVisible();
    // Os slides passam pelo worker (antivírus, texto e miniaturas) e ficam prontos.
    const db = ownerDb();
    const user = await db.query.authUsers.findFirst({ where: eq(s.authUsers.email, email) });
    await expect
      .poll(
        async () =>
          (
            await db
              .select({
                name: s.files.originalName,
                status: s.files.status,
                pages: s.files.pageCount,
              })
              .from(s.files)
              .where(eq(s.files.ownerId, user!.id))
          )
            .map((f) => `${f.name}:${f.status}:${f.pages}`)
            .sort(),
        { timeout: 60_000 },
      )
      .toEqual(['Prova anterior de Patologia.pdf:ready:2', 'Slides de inflamação.pdf:ready:6']);
  });
});
