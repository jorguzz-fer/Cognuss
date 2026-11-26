import { randomUUID } from 'node:crypto';
import { createDb, createPool, eq, schema as s } from '@gutta/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { CurrentUser, Role } from '@/lib/auth/session';
import * as svc from './service';

/*
  Admin da empresa: o serviço faz CRUD do catálogo, instituições e papéis, e o banco (RLS)
  recusa quem não é admin mesmo que a tela falhe. Cada mudança vira auditoria.
*/
const ownerPool = createPool(
  process.env.TEST_DATABASE_OWNER_URL ??
    'postgres://gutta_owner:gutta_owner_dev@localhost:5432/gutta_test',
  2,
);
const owner = createDb(ownerPool);
let admin: CurrentUser;
let editor: CurrentUser;
let student: CurrentUser;

async function user(roles: Role[] = []): Promise<CurrentUser> {
  const id = randomUUID();
  await owner.insert(s.authUsers).values({
    id,
    name: `Teste ${id.slice(0, 4)}`,
    email: `${id}@teste.gutta`,
    emailVerified: false,
  });
  await owner.insert(s.profiles).values({ userId: id, displayName: 'Teste' });
  for (const role of roles) await owner.insert(s.roleAssignments).values({ userId: id, role });
  return { id, name: 'Teste', email: `${id}@teste.gutta`, twoFactorEnabled: true, roles };
}

beforeAll(async () => {
  admin = await user(['admin']);
  editor = await user(['editor']);
  student = await user();
});
afterAll(async () => {
  await ownerPool.end();
});

describe('admin: catálogo', () => {
  it('cria curso, disciplina, assunto e módulo, com auditoria', async () => {
    const tag = randomUUID().slice(0, 6);
    const course = await svc.saveCourse(admin, null, { name: `Enfermagem ${tag}`, active: 'on' });
    expect(course.slug).toBe(`enfermagem-${tag}`);
    const disc = await svc.saveDiscipline(
      admin,
      { courseId: course.id },
      { name: 'Anatomia Básica', periodHint: '1', active: 'on' },
    );
    const topic = await svc.saveTopic(
      admin,
      { disciplineId: disc.id },
      { name: 'Sistema esquelético' },
    );
    const mod = await svc.saveModule(
      admin,
      { disciplineId: disc.id },
      { title: 'Ossos do crânio', topicId: topic.id },
    );
    expect(mod.status).toBe('draft');
    expect(mod.isDemo).toBe(false);
    const logs = await owner.select().from(s.auditLogs).where(eq(s.auditLogs.entityId, mod.id));
    expect(logs.map((l) => l.action)).toContain('module.created');
  });

  it('o admin aprova o próprio módulo; o revisor autor, não (ADR 0024)', async () => {
    const course = await svc.saveCourse(admin, null, { name: `Curso ${randomUUID().slice(0, 6)}` });
    const disc = await svc.saveDiscipline(admin, { courseId: course.id }, { name: 'Disciplina X' });
    const topic = await svc.saveTopic(admin, { disciplineId: disc.id }, { name: 'Assunto X' });
    const mod = await svc.saveModule(
      admin,
      { disciplineId: disc.id },
      { title: 'Módulo X', topicId: topic.id },
    );
    await svc.transitionModule(admin, mod.id, { to: 'in_review' });
    // Pular etapa continua proibido; aprovar o próprio, para o admin, vale.
    await expect(svc.transitionModule(admin, mod.id, { to: 'published' })).rejects.toThrow();
    const approved = await svc.transitionModule(admin, mod.id, { to: 'approved' });
    expect(approved.status).toBe('approved');
    expect(approved.reviewerId).toBe(admin.id);

    const reviewer = await user(['reviewer']);
    const own = await owner
      .insert(s.modules)
      .values({
        disciplineId: disc.id,
        topicId: topic.id,
        slug: `rev-${randomUUID().slice(0, 6)}`,
        title: 'Do revisor',
        status: 'in_review',
        authorId: reviewer.id,
      })
      .returning();
    await expect(svc.transitionModule(reviewer, own[0]!.id, { to: 'approved' })).rejects.toThrow(
      /autor não aprova/,
    );
  });

  it('quem não é admin não cria curso, mesmo chamando o serviço direto (RLS)', async () => {
    await expect(svc.saveCourse(editor, null, { name: 'Curso pirata' })).rejects.toMatchObject({
      status: 403,
    });
    await expect(svc.saveCourse(student, null, { name: 'Curso pirata 2' })).rejects.toMatchObject({
      status: 403,
    });
  });

  it('move o assunto com subassuntos, módulos e questões para outra disciplina', async () => {
    const tag = randomUUID().slice(0, 6);
    const course = await svc.saveCourse(admin, null, { name: `Farmácia ${tag}` });
    const from = await svc.saveDiscipline(admin, { courseId: course.id }, { name: 'Conceitos' });
    const to = await svc.saveDiscipline(admin, { courseId: course.id }, { name: 'Farmacologia' });
    const topic = await svc.saveTopic(
      admin,
      { disciplineId: from.id },
      { name: 'Farmacocinética' },
    );
    const child = await svc.saveTopic(
      admin,
      { disciplineId: from.id },
      { name: 'Absorção', parentId: topic.id },
    );
    const mod = await svc.saveModule(
      admin,
      { disciplineId: from.id },
      { title: 'Vias de administração', topicId: child.id },
    );
    const [q] = await owner
      .insert(s.questions)
      .values({ topicId: topic.id, disciplineId: from.id, stem: 'O que é biodisponibilidade?' })
      .returning();

    expect((await svc.moveTopic(admin, topic.id, to.id)).targetName).toBe('Farmacologia');
    const moved = await owner.select().from(s.topics).where(eq(s.topics.disciplineId, to.id));
    expect(moved.map((t) => t.name).sort()).toEqual(['Absorção', 'Farmacocinética']);
    expect(moved.find((t) => t.id === child.id)?.parentId).toBe(topic.id);
    const [m] = await owner.select().from(s.modules).where(eq(s.modules.id, mod.id));
    expect(m!.disciplineId).toBe(to.id);
    const [qq] = await owner.select().from(s.questions).where(eq(s.questions.id, q!.id));
    expect(qq!.disciplineId).toBe(to.id);

    // Nome repetido no destino: recusa com o motivo, sem mexer em nada.
    const other = await svc.saveTopic(
      admin,
      { disciplineId: from.id },
      { name: 'Farmacocinética' },
    );
    await expect(svc.moveTopic(admin, other.id, to.id)).rejects.toThrow(/já tem um assunto/);
    // Quem não é admin não move (RLS).
    await expect(svc.moveTopic(student, other.id, to.id)).rejects.toThrow();
  });

  it('assunto em uso por questões não é excluído', async () => {
    const q = await owner.query.questions.findFirst();
    await expect(svc.deleteTopic(admin, q!.topicId)).rejects.toMatchObject({ status: 409 });
  });
});

describe('admin: instituições e usuários', () => {
  it('aprova instituição pendente; aluno não consegue', async () => {
    const [inst] = await owner
      .insert(s.institutions)
      .values({ name: `Faculdade ${randomUUID()}`, status: 'pending', suggestedBy: student.id })
      .returning();
    await expect(svc.setInstitutionStatus(student, inst!.id, 'active')).rejects.toThrow();
    const row = await svc.setInstitutionStatus(admin, inst!.id, 'active');
    expect(row.status).toBe('active');
  });

  it('dá e tira papel, confirma e-mail e não deixa o admin se rebaixar', async () => {
    await svc.setRole(admin, student.id, 'teacher', true);
    let roles = await owner
      .select()
      .from(s.roleAssignments)
      .where(eq(s.roleAssignments.userId, student.id));
    expect(roles.map((r) => r.role)).toEqual(['teacher']);
    await svc.setRole(admin, student.id, 'teacher', false);
    roles = await owner
      .select()
      .from(s.roleAssignments)
      .where(eq(s.roleAssignments.userId, student.id));
    expect(roles).toHaveLength(0);
    await expect(svc.setRole(admin, admin.id, 'admin', false)).rejects.toMatchObject({
      status: 409,
    });
    await expect(svc.setRole(editor, student.id, 'admin', true)).rejects.toThrow();

    await svc.verifyEmail(admin, student.id);
    const u = await owner.query.authUsers.findFirst({ where: eq(s.authUsers.id, student.id) });
    expect(u!.emailVerified).toBe(true);
  });

  it('a lista de usuários traz os papéis', async () => {
    const rows = await svc.listUsers(admin, { q: admin.email });
    expect(rows[0]!.roles).toEqual(['admin']);
  });
});
