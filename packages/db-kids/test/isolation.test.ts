import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  PlatformAccessError,
  TenantAccessError,
  withAnonymous,
  withPlatformAdmin,
  withTenantUser,
  withUser,
} from '../src/client';
import * as s from '../src/schema';
import { addMember, connect, makeTenant, makeUser, pgCode, seedSchool } from './helpers';

// Blueprint §7 e SPEC Kids §13: a instituição A nunca lê nem escreve dados da instituição B.
const { app, owner, appPool, ownerPool } = connect();
let escolaA: string;
let escolaB: string;
let gestoraA: string;
let alunoA: string;
let gestorB: string;
let superAdmin: string;

beforeAll(async () => {
  escolaA = await makeTenant(owner);
  escolaB = await makeTenant(owner);
  gestoraA = await makeUser(owner);
  alunoA = await makeUser(owner);
  gestorB = await makeUser(owner);
  superAdmin = await makeUser(owner);
  await addMember(owner, escolaA, gestoraA, 'manager');
  await addMember(owner, escolaA, alunoA, 'student');
  await addMember(owner, escolaB, gestorB, 'manager');
  await owner.insert(s.platformAdmins).values({ userId: superAdmin, grantedBy: 'teste' });
  // Uma linha da escola B em toda tabela com tenant_id, para o teste genérico abaixo.
  await owner.insert(s.auditLogs).values({
    tenantId: escolaB,
    actorId: gestorB,
    action: 'teste',
    entityType: 'tenant',
    entityId: escolaB,
  });
  const profB = await makeUser(owner);
  const alunoB = await makeUser(owner);
  await addMember(owner, escolaB, profB, 'teacher');
  await addMember(owner, escolaB, alunoB, 'student');
  await seedSchool(owner, escolaB, { teacher: profB, student: alunoB, inviter: gestorB });
});

afterAll(async () => {
  await appPool.end();
  await ownerPool.end();
});

/** Tabelas do schema public que têm a coluna tenant_id. Tabela nova entra sozinha no teste. */
async function tenantTables(): Promise<string[]> {
  const r = await owner.execute<{ table_name: string }>(sql`
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'tenant_id' order by table_name`);
  return r.rows.map((x) => x.table_name);
}

describe('papel da aplicação', () => {
  it('kids_app não ignora RLS e não é dono das tabelas', async () => {
    const r = await app.execute<{ rolbypassrls: boolean; rolsuper: boolean }>(
      sql`select rolbypassrls, rolsuper from pg_roles where rolname = current_user`,
    );
    expect(r.rows[0]).toEqual({ rolbypassrls: false, rolsuper: false });
    const owned = await app.execute<{ n: number }>(
      sql`select count(*)::int as n from pg_tables where schemaname = 'public' and tableowner = current_user`,
    );
    expect(owned.rows[0]!.n).toBe(0);
  });

  it('toda tabela de domínio tem RLS ativo e forçado', async () => {
    const r = await owner.execute<{ relname: string; on: boolean; forced: boolean }>(sql`
      select c.relname, c.relrowsecurity as on, c.relforcerowsecurity as forced
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and c.relname not like 'auth\\_%'`);
    expect(r.rows.length).toBeGreaterThanOrEqual(6);
    for (const row of r.rows)
      expect([row.relname, row.on, row.forced]).toEqual([row.relname, true, true]);
  });

  it('kids_app não altera nem apaga a auditoria', async () => {
    await expect(
      withTenantUser(app, escolaA, gestoraA, (tx) =>
        tx.execute(sql`update audit_logs set action = 'x'`),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '42501');
  });
});

describe('isolamento entre instituições', () => {
  it('cada tabela com tenant_id tem linha da escola B no teste (cobertura)', async () => {
    for (const table of await tenantTables()) {
      const r = await owner.execute<{ n: number }>(
        sql`select count(*)::int as n from ${sql.identifier(table)} where tenant_id = ${escolaB}`,
      );
      expect([table, r.rows[0]!.n > 0]).toEqual([table, true]);
    }
  });

  it('gestora da escola A não lê nenhuma linha da escola B, em nenhuma tabela', async () => {
    for (const table of await tenantTables()) {
      const n = await withTenantUser(app, escolaA, gestoraA, async (tx) => {
        const r = await tx.execute<{ n: number }>(
          sql`select count(*)::int as n from ${sql.identifier(table)} where tenant_id = ${escolaB}`,
        );
        return r.rows[0]!.n;
      });
      expect([table, n]).toEqual([table, 0]);
    }
  });

  it('gestora da escola A não altera nem apaga linhas da escola B', async () => {
    for (const table of await tenantTables()) {
      if (table === 'audit_logs') continue; // sem UPDATE/DELETE para kids_app (teste acima)
      // invitations: sem UPDATE para kids_app (o aceite é só por invitation_accept).
      const canUpdate = table !== 'invitations';
      const changed = await withTenantUser(app, escolaA, gestoraA, async (tx) => {
        const u = canUpdate
          ? await tx.execute(
              sql`update ${sql.identifier(table)} set tenant_id = tenant_id where tenant_id = ${escolaB}`,
            )
          : { rowCount: 0 };
        const d = await tx.execute(
          sql`delete from ${sql.identifier(table)} where tenant_id = ${escolaB}`,
        );
        return (u.rowCount ?? 0) + (d.rowCount ?? 0);
      });
      expect([table, changed]).toEqual([table, 0]);
    }
  });

  it('gestora da escola A não grava na escola B, mesmo informando o tenant_id', async () => {
    await expect(
      withTenantUser(app, escolaA, gestoraA, (tx) =>
        tx.insert(s.grades).values({ tenantId: escolaB, stage: 'fundamental', number: 3 }),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '42501');
  });

  it('quem não é membro não abre contexto na escola B', async () => {
    await expect(
      withTenantUser(app, escolaB, gestoraA, async () => 'nunca'),
    ).rejects.toBeInstanceOf(TenantAccessError);
  });

  it('instituição suspensa bloqueia seus membros (INS-02)', async () => {
    const suspensa = await makeTenant(owner, 'suspended');
    const u = await makeUser(owner);
    await addMember(owner, suspensa, u, 'manager');
    await expect(withTenantUser(app, suspensa, u, async () => 'nunca')).rejects.toBeInstanceOf(
      TenantAccessError,
    );
  });

  it('o usuário vê só as escolas de que é membro', async () => {
    const rows = await withUser(app, gestoraA, (tx) => tx.select().from(s.tenants));
    expect(rows.map((r) => r.id)).toEqual([escolaA]);
  });

  it('sem contexto, nada aparece', async () => {
    const t = await withAnonymous(app, (tx) => tx.select().from(s.tenants));
    expect(t).toHaveLength(0);
    const g = await app.select().from(s.grades);
    expect(g).toHaveLength(0);
  });
});

describe('papéis dentro da instituição', () => {
  it('aluno lê a estrutura, mas não altera', async () => {
    const grades = await withTenantUser(app, escolaA, alunoA, (tx) => tx.select().from(s.grades));
    expect(grades.map((g) => g.tenantId)).toEqual([escolaA]);
    await expect(
      withTenantUser(app, escolaA, alunoA, (tx) =>
        tx.insert(s.grades).values({ tenantId: escolaA, stage: 'fundamental', number: 4 }),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '42501');
  });

  it('gestora ativa um ano; o intervalo por etapa é conferido no banco', async () => {
    await withTenantUser(app, escolaA, gestoraA, (tx) =>
      tx.insert(s.grades).values({ tenantId: escolaA, stage: 'fundamental', number: 9 }),
    );
    // Médio não está ativo na escola A: a FK da etapa recusa.
    await expect(
      withTenantUser(app, escolaA, gestoraA, (tx) =>
        tx.insert(s.grades).values({ tenantId: escolaA, stage: 'medio', number: 1 }),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '23503');
    // Fundamental vai até o 9º ano.
    await expect(
      withTenantUser(app, escolaA, gestoraA, (tx) =>
        tx.insert(s.grades).values({ tenantId: escolaA, stage: 'fundamental', number: 10 }),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '23514');
  });

  it('aluno vê só o próprio vínculo; gestora vê os da escola', async () => {
    const own = await withTenantUser(app, escolaA, alunoA, (tx) => tx.select().from(s.memberships));
    expect(own.map((m) => m.userId)).toEqual([alunoA]);
    const all = await withTenantUser(app, escolaA, gestoraA, (tx) =>
      tx.select().from(s.memberships),
    );
    expect(new Set(all.map((m) => m.userId))).toEqual(new Set([gestoraA, alunoA]));
  });
});

describe('Super Admin', () => {
  it('fora de withPlatformAdmin, o Super Admin não vê escola nenhuma', async () => {
    const rows = await withUser(app, superAdmin, (tx) => tx.select().from(s.tenants));
    expect(rows).toHaveLength(0);
  });

  it('cria instituição e registra o motivo na auditoria', async () => {
    const id = await withPlatformAdmin(
      app,
      { userId: superAdmin, tenantId: null, reason: 'cadastro de escola nova' },
      async (tx) => {
        const [t] = await tx
          .insert(s.tenants)
          .values({
            name: 'Escola Nova',
            slug: 'escola-nova-teste',
            city: 'Recife',
            state: 'PE',
            kind: 'public',
          })
          .returning();
        return t!.id;
      },
    );
    const log = await owner.select().from(s.auditLogs).where(eq(s.auditLogs.actorId, superAdmin));
    expect(
      log.some(
        (l) => l.action === 'platform.access' && l.metadata.reason === 'cadastro de escola nova',
      ),
    ).toBe(true);
    // Convida o primeiro gestor (INS-03) dentro da escola recém-criada.
    await withPlatformAdmin(
      app,
      { userId: superAdmin, tenantId: id, reason: 'primeiro gestor' },
      (tx) => tx.insert(s.memberships).values({ tenantId: id, userId: gestorB, role: 'manager' }),
    );
  });

  it('quem não é Super Admin é recusado e nada é gravado', async () => {
    await expect(
      withPlatformAdmin(
        app,
        { userId: gestoraA, tenantId: null, reason: 'tentativa' },
        async () => 1,
      ),
    ).rejects.toBeInstanceOf(PlatformAccessError);
    await expect(
      withTenantUser(app, escolaA, gestoraA, (tx) =>
        tx
          .insert(s.tenants)
          .values({ name: 'X', slug: 'x-teste', city: 'X', state: 'SP', kind: 'public' }),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '42501');
  });

  it('a aplicação não concede o papel de Super Admin', async () => {
    await expect(
      withPlatformAdmin(app, { userId: superAdmin, tenantId: null, reason: 'conceder' }, (tx) =>
        tx.insert(s.platformAdmins).values({ userId: gestoraA }),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '42501');
  });
});
