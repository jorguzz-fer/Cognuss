import { sql } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

export type Schema = typeof schema;
export type Db = NodePgDatabase<Schema>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export function createPool(url: string, max = Number(process.env.DB_POOL_MAX ?? 10)) {
  return new pg.Pool({
    connectionString: url,
    max,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    options: '-c timezone=UTC',
  });
}

export function createDb(pool: pg.Pool): Db {
  return drizzle(pool, { schema, casing: 'snake_case' });
}

/** O usuário não é membro ativo da instituição pedida (ou ela está suspensa). */
export class TenantAccessError extends Error {
  constructor() {
    super('sem acesso a esta instituição');
    this.name = 'TenantAccessError';
  }
}

/** O usuário não é Super Admin da plataforma. */
export class PlatformAccessError extends Error {
  constructor() {
    super('acesso restrito ao Super Admin');
    this.name = 'PlatformAccessError';
  }
}

async function setContext(tx: Tx, ctx: { userId: string; tenantId: string; platform: boolean }) {
  // set_config(..., true) vale só para esta transação: o contexto não vaza para a próxima
  // requisição que pegar a mesma conexão do pool.
  await tx.execute(sql`select
    set_config('app.user_id', ${ctx.userId}, true),
    set_config('app.tenant_id', ${ctx.tenantId}, true),
    set_config('app.platform_admin', ${ctx.platform ? 'on' : ''}, true)`);
}

/**
 * Transação com instituição e usuário no contexto do RLS (ADR 0022). O tenant vem da sessão,
 * nunca do corpo da requisição, e é conferido aqui contra `memberships`: quem não é membro
 * ativo de instituição ativa recebe TenantAccessError antes de qualquer consulta.
 * As políticas do banco fazem a mesma conferência, então esquecer esta checagem não vaza dado.
 */
export async function withTenantUser<T>(
  db: Db,
  tenantId: string,
  userId: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  if (!tenantId || !userId) throw new Error('withTenantUser exige tenantId e userId');
  return db.transaction(async (tx) => {
    await setContext(tx, { userId, tenantId, platform: false });
    const r = await tx.execute<{ ok: boolean }>(sql`select app_is_tenant_member() as ok`);
    if (!r.rows[0]?.ok) throw new TenantAccessError();
    return fn(tx);
  });
}

/**
 * Transação só com o usuário: serve para listar as instituições de que ele é membro e
 * escolher a ativa (USR-05). Nenhum dado de domínio de instituição aparece aqui.
 */
export async function withUser<T>(db: Db, userId: string, fn: (tx: Tx) => Promise<T>) {
  if (!userId) throw new Error('withUser exige um userId');
  return db.transaction(async (tx) => {
    await setContext(tx, { userId, tenantId: '', platform: false });
    return fn(tx);
  });
}

/**
 * Super Admin agindo na plataforma (tenantId nulo) ou dentro de uma instituição. O motivo é
 * gravado na auditoria antes de abrir o contexto (SPEC Kids, seção 3). Quem não está em
 * platform_admins recebe PlatformAccessError, e as políticas do banco também recusam.
 */
export async function withPlatformAdmin<T>(
  db: Db,
  opts: { userId: string; tenantId: string | null; reason: string },
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  const reason = opts.reason.trim();
  if (!opts.userId) throw new Error('withPlatformAdmin exige um userId');
  if (reason.length < 3) throw new Error('withPlatformAdmin exige um motivo');
  return db.transaction(async (tx) => {
    await setContext(tx, { userId: opts.userId, tenantId: opts.tenantId ?? '', platform: true });
    const r = await tx.execute<{ ok: boolean }>(sql`select app_is_platform_admin() as ok`);
    if (!r.rows[0]?.ok) throw new PlatformAccessError();
    await tx.insert(schema.auditLogs).values({
      tenantId: opts.tenantId,
      actorId: opts.userId,
      action: 'platform.access',
      entityType: opts.tenantId ? 'tenant' : 'platform',
      entityId: opts.tenantId,
      metadata: { reason },
    });
    return fn(tx);
  });
}

/** Sem usuário nem instituição: toda política falha fechada. */
export async function withAnonymous<T>(db: Db, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await setContext(tx, { userId: '', tenantId: '', platform: false });
    return fn(tx);
  });
}
