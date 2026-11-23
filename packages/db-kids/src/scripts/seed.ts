import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Db } from '../client';
import { hashPassword } from '../password';
import * as s from '../schema';
import { SUGGESTED_SUBJECTS, studentPlaceholderEmail, studentUsername } from '../school';

// Senha dos usuários de demonstração, só para desenvolvimento e E2E (mesma do Cognuss).
export const DEMO_PASSWORD = 'gutta-demo-2026';

// Turma de demonstração: a aluna sem e-mail entra com demo3a / luna / gato-azul-42.
export const DEMO_CLASS_CODE = 'demo3a';
export const DEMO_STUDENT_PASSWORD = 'gato-azul-42';

export const DEMO_USERS = {
  superAdmin: 'superadmin@kids.test',
  manager: 'gestor@kids.test',
  teacher: 'professor@kids.test',
  student: 'aluno@kids.test',
} as const;

async function ensureUser(db: Db, email: string, name: string) {
  const found = await db.query.authUsers.findFirst({ where: eq(s.authUsers.email, email) });
  if (found) return found.id;
  const id = randomUUID();
  await db.insert(s.authUsers).values({ id, name, email, emailVerified: true });
  await db.insert(s.authAccounts).values({
    id: randomUUID(),
    accountId: id,
    providerId: 'credential',
    userId: id,
    password: await hashPassword(DEMO_PASSWORD),
  });
  return id;
}

/**
 * Escola de demonstração (PLA-08 começa aqui na Fase 2): Fundamental com o 3º ao 9º ano
 * ativos, um gestor, um professor e um aluno. Idempotente. Roda como dono do banco.
 */
export async function runSeed(db: Db) {
  const ids = {
    superAdmin: await ensureUser(db, DEMO_USERS.superAdmin, 'Super Admin'),
    manager: await ensureUser(db, DEMO_USERS.manager, 'Gestora Demonstração'),
    teacher: await ensureUser(db, DEMO_USERS.teacher, 'Professor Demonstração'),
    student: await ensureUser(db, DEMO_USERS.student, 'Aluna Demonstração'),
  };
  await db
    .insert(s.platformAdmins)
    .values({ userId: ids.superAdmin, grantedBy: 'seed' })
    .onConflictDoNothing();

  let tenant = await db.query.tenants.findFirst({ where: eq(s.tenants.slug, 'escola-demo') });
  if (!tenant) {
    [tenant] = await db
      .insert(s.tenants)
      .values({
        name: 'Escola de Demonstração',
        slug: 'escola-demo',
        city: 'São Paulo',
        state: 'SP',
        kind: 'private',
      })
      .returning();
  }
  const tenantId = tenant!.id;
  await db.insert(s.tenantStages).values({ tenantId, stage: 'fundamental' }).onConflictDoNothing();
  // 1º ao 9º ano cadastrados; só do 3º ao 9º ativos (a escola de exemplo não tem o 1º e o 2º).
  for (const number of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    await db
      .insert(s.grades)
      .values({ tenantId, stage: 'fundamental', number, active: number >= 3 })
      .onConflictDoNothing();
  }
  const roles = [
    [ids.manager, 'manager'],
    [ids.teacher, 'teacher'],
    [ids.student, 'student'],
  ] as const;
  for (const [userId, role] of roles) {
    await db.insert(s.memberships).values({ tenantId, userId, role }).onConflictDoNothing();
  }

  // Fase 1: matérias sugeridas, a turma 3º A (código demo3a), o professor em Ciências e dois
  // alunos: um com e-mail e um do Fundamental I com usuário da turma (K-D07).
  for (const name of SUGGESTED_SUBJECTS.fundamental) {
    await db.insert(s.subjects).values({ tenantId, name }).onConflictDoNothing();
  }
  const third = await db.query.grades.findFirst({
    where: (g, { and: a, eq: e }) => a(e(g.tenantId, tenantId), e(g.number, 3)),
  });
  let klass = await db.query.classes.findFirst({ where: eq(s.classes.joinCode, DEMO_CLASS_CODE) });
  if (!klass) {
    [klass] = await db
      .insert(s.classes)
      .values({
        tenantId,
        gradeId: third!.id,
        name: '3º A',
        schoolYear: 2027,
        joinCode: DEMO_CLASS_CODE,
      })
      .returning();
  }
  const ciencias = await db.query.subjects.findFirst({
    where: (x, { and: a, eq: e }) => a(e(x.tenantId, tenantId), e(x.name, 'Ciências')),
  });
  await db
    .insert(s.teacherAssignments)
    .values({ tenantId, classId: klass!.id, subjectId: ciencias!.id, userId: ids.teacher })
    .onConflictDoNothing();
  const username = studentUsername(DEMO_CLASS_CODE, 'luna');
  let luna = await db.query.authUsers.findFirst({ where: eq(s.authUsers.username, username) });
  if (!luna) {
    const id = randomUUID();
    await db.insert(s.authUsers).values({
      id,
      name: 'Luna Demonstração',
      email: studentPlaceholderEmail(username),
      emailVerified: true,
      username,
      displayUsername: username,
    });
    await db.insert(s.authAccounts).values({
      id: randomUUID(),
      accountId: id,
      providerId: 'credential',
      userId: id,
      password: await hashPassword(DEMO_STUDENT_PASSWORD),
    });
    luna = await db.query.authUsers.findFirst({ where: eq(s.authUsers.id, id) });
  }
  await db
    .insert(s.memberships)
    .values({ tenantId, userId: luna!.id, role: 'student' })
    .onConflictDoNothing();
  for (const userId of [ids.student, luna!.id]) {
    await db
      .insert(s.classMembers)
      .values({ tenantId, classId: klass!.id, userId })
      .onConflictDoNothing();
  }
  return { tenantId, classId: klass!.id, studentWithoutEmail: luna!.id, ...ids };
}
