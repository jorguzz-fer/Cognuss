import { randomUUID } from 'node:crypto';
import { and, createDb, createPool, eq, schema as s, sql, withUser } from '@gutta/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as admin from '@/features/admin/service';
import type { CurrentUser, Role } from '@/lib/auth/session';
import { forget } from '@/lib/memo';
import * as svc from './service';

/*
  Disciplina do semestre ligada ao catálogo e curso do aluno pelo admin (ADR 0026). A ligação só
  vale para disciplinas do curso do aluno; o admin troca o curso por uma função que mexe só nele,
  e o perfil continua fechado para o resto.
*/
const ownerPool = createPool(
  process.env.TEST_DATABASE_OWNER_URL ??
    'postgres://gutta_owner:gutta_owner_dev@localhost:5432/gutta_test',
  2,
);
const owner = createDb(ownerPool);
const appPool = createPool(
  process.env.TEST_DATABASE_URL ?? 'postgres://gutta_app:gutta_app_dev@localhost:5432/gutta_test',
  2,
);
const app = createDb(appPool);

async function user(roles: Role[] = []): Promise<CurrentUser> {
  const id = randomUUID();
  await owner
    .insert(s.authUsers)
    .values({ id, name: 'Teste', email: `${id}@teste.gutta`, emailVerified: true });
  await owner.insert(s.profiles).values({ userId: id, displayName: 'Teste' });
  for (const role of roles) await owner.insert(s.roleAssignments).values({ userId: id, role });
  return { id, name: 'Teste', email: `${id}@teste.gutta`, twoFactorEnabled: true, roles };
}

async function course(name: string) {
  const tag = randomUUID().slice(0, 6);
  const [c] = await owner
    .insert(s.courses)
    .values({ name: `${name} ${tag}`, slug: `${name.toLowerCase()}-${tag}`, active: true })
    .returning();
  return c!;
}

async function discipline(courseId: string, name: string, published: number) {
  const tag = randomUUID().slice(0, 6);
  const [d] = await owner
    .insert(s.disciplines)
    .values({ courseId, name, slug: `${name.toLowerCase()}-${tag}`, active: true })
    .returning();
  const [topic] = await owner
    .insert(s.topics)
    .values({ disciplineId: d!.id, name: 'Assunto', slug: `assunto-${tag}` })
    .returning();
  for (let i = 0; i < published; i++)
    await owner.insert(s.modules).values({
      disciplineId: d!.id,
      topicId: topic!.id,
      slug: `m${i}-${tag}`,
      title: `Módulo ${i + 1}`,
      status: 'published',
      orderIndex: i,
    });
  await owner.insert(s.modules).values({
    disciplineId: d!.id,
    topicId: topic!.id,
    slug: `rascunho-${tag}`,
    title: 'Rascunho',
    status: 'draft',
  });
  return d!;
}

let adm: CurrentUser;
let aluno: CurrentUser;
let farmacia: Awaited<ReturnType<typeof course>>;
let medicina: Awaited<ReturnType<typeof course>>;
let farmaco: Awaited<ReturnType<typeof discipline>>;
let quimica: Awaited<ReturnType<typeof discipline>>;
let anatomia: Awaited<ReturnType<typeof discipline>>;

beforeAll(async () => {
  await owner
    .insert(s.appSettings)
    .values({ key: 'features', value: { cadastro: true, disciplinas: true } })
    .onConflictDoUpdate({
      target: s.appSettings.key,
      set: { value: { cadastro: true, disciplinas: true } },
    });
  forget('flags:');
  adm = await user(['admin']);
  aluno = await user();
  farmacia = await course('Farmacia');
  medicina = await course('Medicina');
  farmaco = await discipline(farmacia.id, 'Farmacologia', 2);
  quimica = await discipline(farmacia.id, 'Química', 0);
  anatomia = await discipline(medicina.id, 'Anatomia', 1);
  await owner
    .insert(s.studentProfiles)
    .values({ userId: aluno.id, courseId: farmacia.id, semester: 2 });
});
afterAll(async () => {
  await owner.delete(s.appSettings).where(eq(s.appSettings.key, 'features'));
  forget('flags:');
  await ownerPool.end();
  await appPool.end();
});

describe('disciplina do semestre ligada ao catálogo', () => {
  it('oferece só as disciplinas ativas do curso do aluno, com módulos publicados', async () => {
    const options = await svc.catalogOptions(aluno.id);
    expect(options.map((o) => [o.name, o.modules])).toEqual([
      ['Farmacologia', 2],
      ['Química', 0],
    ]);
  });

  it('cria ligada, mostra o conteúdo e recusa ligar duas vezes ou fora do curso', async () => {
    const { discipline } = await svc.createDiscipline(aluno.id, {
      name: 'Farmacologia I',
      shortName: null,
      color: 1,
      teachers: [],
      catalogDisciplineId: farmaco.id,
    });
    expect(discipline.catalog).toEqual({
      id: farmaco.id,
      name: 'Farmacologia',
      slug: farmaco.slug,
      modules: 2,
    });
    await expect(
      svc.createDiscipline(aluno.id, {
        name: 'Farmaco de novo',
        shortName: null,
        color: 2,
        teachers: [],
        catalogDisciplineId: farmaco.id,
      }),
    ).rejects.toThrow('já está ligado à sua disciplina Farmacologia I');
    await expect(
      svc.createDiscipline(aluno.id, {
        name: 'Anatomia',
        shortName: null,
        color: 2,
        teachers: [],
        catalogDisciplineId: anatomia.id,
      }),
    ).rejects.toThrow('não é do seu curso');
  });

  it('na edição: ausente mantém, outro troca, null desliga', async () => {
    const { discipline } = await svc.createDiscipline(aluno.id, {
      name: 'Farmácia (digitada)',
      shortName: null,
      color: 3,
      teachers: [],
    });
    expect(discipline.catalog).toBeNull();
    const linked = await svc.updateDiscipline(aluno.id, discipline.id, {
      name: 'Farmácia (digitada)',
      shortName: null,
      color: 3,
      teachers: [],
      catalogDisciplineId: quimica.id,
    });
    expect(linked.discipline.catalog?.id).toBe(quimica.id);
    const kept = await svc.updateDiscipline(aluno.id, discipline.id, {
      name: 'Química geral',
      shortName: null,
      color: 3,
      teachers: [],
    });
    expect(kept.discipline.catalog?.id).toBe(quimica.id);
    const off = await svc.updateDiscipline(aluno.id, discipline.id, {
      name: 'Química geral',
      shortName: null,
      color: 3,
      teachers: [],
      catalogDisciplineId: null,
    });
    expect(off.discipline.catalog).toBeNull();
  });
});

describe('curso do aluno pelo admin', () => {
  it('o admin vê o curso e a contagem de alunos por curso', async () => {
    const { student } = await admin.getUserAdmin(adm, aluno.id);
    expect(student).toMatchObject({
      courseId: farmacia.id,
      courseName: farmacia.name,
      semester: 2,
    });
    const courses = await admin.listCourses(adm);
    expect(courses.find((c) => c.id === farmacia.id)?.students).toBe(1);
  });

  it('troca o curso com auditoria; a ligação de outro curso deixa de valer', async () => {
    expect(await admin.setStudentCourse(adm, aluno.id, medicina.id)).toBe(true);
    expect(await admin.setStudentCourse(adm, aluno.id, medicina.id)).toBe(false);
    const [profile] = await owner
      .select()
      .from(s.studentProfiles)
      .where(eq(s.studentProfiles.userId, aluno.id));
    expect(profile!.courseId).toBe(medicina.id);
    const logs = await owner
      .select()
      .from(s.auditLogs)
      .where(
        and(eq(s.auditLogs.action, 'student.course_changed'), eq(s.auditLogs.entityId, aluno.id)),
      );
    expect(logs).toHaveLength(1);
    expect(logs[0]!.metadata).toMatchObject({ from: farmacia.id, to: medicina.id });
    // Farmacologia é de Farmácia: no curso novo, a disciplina dele fica sem conteúdo ligado.
    const items = (await svc.listDisciplines(aluno.id)).items;
    expect(items.find((d) => d.name === 'Farmacologia I')?.catalog).toBeNull();
    expect((await svc.catalogOptions(aluno.id)).map((o) => o.name)).toEqual(['Anatomia']);
  });

  it('recusa curso inativo e quem não tem cadastro de aluno', async () => {
    const [inactive] = await owner
      .insert(s.courses)
      .values({ name: 'Inativo', slug: `inativo-${randomUUID().slice(0, 6)}`, active: false })
      .returning();
    await expect(admin.setStudentCourse(adm, aluno.id, inactive!.id)).rejects.toThrow(
      'Curso indisponível',
    );
    const semPerfil = await user();
    await expect(admin.setStudentCourse(adm, semPerfil.id, farmacia.id)).rejects.toThrow(
      'ainda não fez o cadastro',
    );
  });

  it('no banco, só o admin chama as funções; o perfil segue fechado para os outros', async () => {
    const outro = await user(['editor']);
    await expect(
      withUser(app, outro.id, (tx) =>
        tx.execute(sql`select admin_set_student_course(${aluno.id}, ${farmacia.id}::uuid)`),
      ),
    ).rejects.toThrow();
    await expect(
      withUser(app, outro.id, (tx) =>
        tx.execute(sql`select * from admin_student_course(${aluno.id})`),
      ),
    ).rejects.toThrow();
    const seen = await withUser(app, adm.id, (tx) =>
      tx.select().from(s.studentProfiles).where(eq(s.studentProfiles.userId, aluno.id)),
    );
    expect(seen).toHaveLength(0);
  });
});
