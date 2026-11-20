import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Db } from '../client';
import { hashPassword } from '../password';
import * as s from '../schema';

// Senha dos usuários de demonstração, só para desenvolvimento e E2E (mesma do Cognuss).
export const DEMO_PASSWORD = 'gutta-demo-2026';

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
  for (const number of [3, 4, 5, 6, 7, 8, 9]) {
    await db
      .insert(s.grades)
      .values({ tenantId, stage: 'fundamental', number })
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
  return { tenantId, ...ids };
}
