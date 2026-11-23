import { eq, sql } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { gradeLabel, stageLabel } from '../src/labels';
import { withTenantUser } from '../src/client';
import * as s from '../src/schema';
import { bootstrapPlatformAdmins, parseEmails } from '../src/scripts/bootstrap';
import { DEMO_USERS, runSeed } from '../src/scripts/seed';
import { connect, makeUser } from './helpers';

const { app, owner, appPool, ownerPool } = connect();

afterAll(async () => {
  await appPool.end();
  await ownerPool.end();
});

describe('rótulos (EST-03)', () => {
  it('Fundamental em anos, Médio em séries', () => {
    expect(gradeLabel('fundamental', 3)).toBe('3º ano');
    expect(gradeLabel('medio', 1)).toBe('1ª série');
    expect(stageLabel('medio')).toBe('Ensino Médio');
    expect(() => gradeLabel('medio', 4)).toThrow(RangeError);
  });
});

describe('seed da escola de demonstração', () => {
  it('é idempotente; 1º ao 9º cadastrados e só do 3º ao 9º ativos', async () => {
    const a = await runSeed(owner);
    const b = await runSeed(owner);
    expect(b.tenantId).toBe(a.tenantId);
    const grades = await withTenantUser(app, a.tenantId, a.manager, (tx) =>
      tx.select().from(s.grades).where(eq(s.grades.tenantId, a.tenantId)),
    );
    expect(
      grades
        .filter((g) => g.active)
        .map((g) => g.number)
        .sort((x, y) => x - y),
    ).toEqual([3, 4, 5, 6, 7, 8, 9]);
    expect(grades).toHaveLength(9);
    expect(DEMO_USERS.manager).toContain('@kids.test');
  });
});

describe('plano de Ciências do piloto (PLA-08)', () => {
  it('publicado, com 7 tópicos e os 56 flashcards, visível para a aluna autorizada', async () => {
    const seed = await runSeed(owner);
    const topics = await owner
      .select()
      .from(s.planTopics)
      .where(eq(s.planTopics.planId, seed.planId));
    expect(topics).toHaveLength(7);
    const cards = await owner.execute<{ n: number }>(
      sql`select count(*)::int as n from flashcards f join plan_topics t on t.id = f.topic_id where t.plan_id = ${seed.planId}`,
    );
    expect(cards.rows[0]!.n).toBe(56);
    const seen = await withTenantUser(app, seed.tenantId, seed.studentWithoutEmail, (tx) =>
      tx.select().from(s.studyPlans),
    );
    expect(seen.map((p) => p.id)).toEqual([seed.planId]);
  });
});

describe('bootstrap do Super Admin', () => {
  it('normaliza a lista de e-mails', () => {
    expect(parseEmails(' A@x.com, b@x.com ,a@x.com,,sem-arroba')).toEqual(['a@x.com', 'b@x.com']);
  });

  it('só concede a quem já confirmou o e-mail, e uma vez', async () => {
    const id = await makeUser(owner);
    const user = await owner.query.authUsers.findFirst({ where: eq(s.authUsers.id, id) });
    const first = await bootstrapPlatformAdmins(owner, [user!.email]);
    const second = await bootstrapPlatformAdmins(owner, [user!.email]);
    expect(first.granted).toEqual([id]);
    expect(second.granted).toEqual([]);
  });
});
