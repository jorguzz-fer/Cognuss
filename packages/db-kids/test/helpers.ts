import { randomUUID } from 'node:crypto';
import { createDb, createPool, type Db } from '../src/client';
import * as s from '../src/schema';
import { TEST_APP_URL, TEST_OWNER_URL } from './env';

export function connect() {
  const appPool = createPool(TEST_APP_URL, 2);
  const ownerPool = createPool(TEST_OWNER_URL, 2);
  return { appPool, ownerPool, app: createDb(appPool), owner: createDb(ownerPool) };
}

/** Usuário criado direto no banco (como dono). */
export async function makeUser(owner: Db) {
  const id = randomUUID();
  await owner.insert(s.authUsers).values({
    id,
    name: `Teste ${id.slice(0, 6)}`,
    email: `${id}@teste.kids`,
    emailVerified: true,
  });
  return id;
}

/** Instituição com o Fundamental e o 3º ano, criada como dono. */
export async function makeTenant(owner: Db, status: 'active' | 'suspended' = 'active') {
  const slug = `escola-${randomUUID().slice(0, 8)}`;
  const [t] = await owner
    .insert(s.tenants)
    .values({
      name: `Escola ${slug}`,
      slug,
      city: 'São Paulo',
      state: 'SP',
      kind: 'private',
      status,
    })
    .returning();
  await owner.insert(s.tenantStages).values({ tenantId: t!.id, stage: 'fundamental' });
  await owner.insert(s.grades).values({ tenantId: t!.id, stage: 'fundamental', number: 3 });
  return t!.id;
}

export async function addMember(
  owner: Db,
  tenantId: string,
  userId: string,
  role: (typeof s.memberRole.enumValues)[number],
) {
  await owner.insert(s.memberships).values({ tenantId, userId, role });
}

/** Erro do Postgres por código SQLSTATE (o Drizzle embrulha em `cause`). */
export function pgCode(err: unknown): string | undefined {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code ?? e?.cause?.code;
}
