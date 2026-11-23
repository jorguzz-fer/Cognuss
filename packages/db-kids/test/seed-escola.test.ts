import { and, eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { withTenantUser } from '../src/client';
import { verifyPassword } from '../src/password';
import * as s from '../src/schema';
import { studentUsername } from '../src/school';
import { formatSchoolSeed, seedSchool } from '../src/scripts/seed-escola';
import { connect } from './helpers';

const { app, owner, appPool, ownerPool } = connect();

afterAll(async () => {
  await appPool.end();
  await ownerPool.end();
});

async function passwordOf(userId: string) {
  const acc = await owner.query.authAccounts.findFirst({
    where: and(eq(s.authAccounts.userId, userId), eq(s.authAccounts.providerId, 'credential')),
  });
  return acc!.password!;
}

describe('seed da instituição completa', () => {
  const slug = `modelo-${Date.now()}`;

  it('cria as duas etapas, 10 turmas, equipe, 30 alunos, responsáveis e 3 planos', async () => {
    const r = await seedSchool(owner, { slug, appUrl: 'https://kids.exemplo.test/' });
    if (r.status !== 'created') throw new Error('esperava criar');
    expect(r.staff).toHaveLength(5);
    expect(r.classes).toHaveLength(10);
    expect(r.classes.flatMap((c) => c.students)).toHaveLength(30);
    expect(r.pendingGuardians).toHaveLength(10);
    expect(r.pendingGuardians[0]!.link).toMatch(
      /^https:\/\/kids\.exemplo\.test\/responsavel\/.{20,}/,
    );
    expect(r.plans.map((p) => p.status)).toEqual(['publicado', 'em revisão', 'rascunho']);

    // As senhas mostradas são as que entram: equipe por e-mail, aluno por código + apelido.
    const manager = r.staff[0]!;
    const managerUser = await owner.query.authUsers.findFirst({
      where: eq(s.authUsers.email, manager.email),
    });
    expect(
      await verifyPassword({ hash: await passwordOf(managerUser!.id), password: manager.password }),
    ).toBe(true);
    const klass = r.classes[0]!;
    const kid = klass.students[0]!;
    const kidUser = await owner.query.authUsers.findFirst({
      where: eq(s.authUsers.username, studentUsername(klass.joinCode, kid.nickname)),
    });
    expect(
      await verifyPassword({ hash: await passwordOf(kidUser!.id), password: kid.password }),
    ).toBe(true);

    // A gestora vê a escola pelo RLS: 12 anos (9 + 3, com 1º e 2º inativos) e 30 alunos.
    const seen = await withTenantUser(app, r.tenantId, managerUser!.id, async (tx) => ({
      grades: await tx.select().from(s.grades),
      students: await tx.select().from(s.memberships).where(eq(s.memberships.role, 'student')),
      consents: await tx.select().from(s.guardianConsents),
    }));
    expect(seen.grades).toHaveLength(12);
    expect(seen.grades.filter((g) => !g.active)).toHaveLength(2);
    expect(seen.students).toHaveLength(30);
    expect(seen.consents).toHaveLength(20);

    // O texto do terminal traz as senhas, e os hashes não.
    const text = formatSchoolSeed(r);
    expect(text).toContain(manager.password);
    expect(text).toContain(klass.joinCode);
    expect(text).not.toContain('$argon2');
  });

  it('não mexe em nada se a instituição já existe', async () => {
    const before = await owner.$count(s.authUsers);
    const r = await seedSchool(owner, { slug });
    expect(r).toEqual({ status: 'exists', slug });
    expect(await owner.$count(s.authUsers)).toBe(before);
    expect(formatSchoolSeed(r)).toMatch(/já existe/);
  });

  it('não cria nada se um e-mail da equipe já tem conta', async () => {
    const other = `outra-${Date.now()}`;
    await expect(
      seedSchool(owner, { slug: other, emailDomain: `${slug}.kids.test` }),
    ).rejects.toThrow(/já existe conta/);
    const t = await owner.query.tenants.findFirst({ where: eq(s.tenants.slug, other) });
    expect(t).toBeUndefined();
  });
});
