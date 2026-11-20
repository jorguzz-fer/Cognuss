import { eq } from 'drizzle-orm';
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
  it('é idempotente e cria o 3º ao 9º ano', async () => {
    const a = await runSeed(owner);
    const b = await runSeed(owner);
    expect(b.tenantId).toBe(a.tenantId);
    const grades = await withTenantUser(app, a.tenantId, a.manager, (tx) =>
      tx.select().from(s.grades).where(eq(s.grades.tenantId, a.tenantId)),
    );
    expect(grades.map((g) => g.number).sort((x, y) => x - y)).toEqual([3, 4, 5, 6, 7, 8, 9]);
    expect(DEMO_USERS.manager).toContain('@kids.test');
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
