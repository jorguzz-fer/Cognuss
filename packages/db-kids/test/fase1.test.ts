import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { withAnonymous, withTenantUser, withUser } from '../src/client';
import * as s from '../src/schema';
import {
  createStudent,
  generateJoinCode,
  hashToken,
  newInviteToken,
  NicknameTakenError,
  normalizeNickname,
  simplePassword,
  studentUsername,
} from '../src/school';
import { addMember, connect, makeTenant, makeUser, pgCode, seedSchool } from './helpers';

// Fase 1 da SPEC Kids: estrutura, turmas, professores, alunos sem e-mail e convites.
const { app, owner, appPool, ownerPool } = connect();
let escola: string;
let outra: string;
let gestora: string;
let prof: string;
let profSemTurma: string;
let aluno: string;
let school: Awaited<ReturnType<typeof seedSchool>>;
let outraSchool: Awaited<ReturnType<typeof seedSchool>>;

beforeAll(async () => {
  escola = await makeTenant(owner);
  outra = await makeTenant(owner);
  gestora = await makeUser(owner);
  prof = await makeUser(owner);
  profSemTurma = await makeUser(owner);
  aluno = await makeUser(owner);
  await addMember(owner, escola, gestora, 'manager');
  await addMember(owner, escola, prof, 'teacher');
  await addMember(owner, escola, profSemTurma, 'teacher');
  await addMember(owner, escola, aluno, 'student');
  school = await seedSchool(owner, escola, { teacher: prof, student: aluno, inviter: gestora });
  const g2 = await makeUser(owner);
  const p2 = await makeUser(owner);
  const a2 = await makeUser(owner);
  await addMember(owner, outra, g2, 'manager');
  outraSchool = await seedSchool(owner, outra, { teacher: p2, student: a2, inviter: g2 });
});

afterAll(async () => {
  await appPool.end();
  await ownerPool.end();
});

describe('regras puras', () => {
  it('código de turma com 6 caracteres sem letras confusas', () => {
    for (let i = 0; i < 50; i++) expect(generateJoinCode()).toMatch(/^[a-hjkmnp-z2-9]{6}$/);
  });

  it('apelido sem acento, minúsculo, de 3 a 20 caracteres', () => {
    expect(normalizeNickname('  Júlia Ávila ')).toBe('juliaavila');
    expect(normalizeNickname('Zé')).toBeNull();
    expect(normalizeNickname('a'.repeat(21))).toBeNull();
    expect(studentUsername('abc234', 'julia')).toBe('abc234.julia');
  });

  it('senha simples no formato palavra-cor-número', () => {
    expect(simplePassword()).toMatch(/^[a-z]+-[a-z]+-\d{2}$/);
  });

  it('token de convite: só o hash vai para o banco', () => {
    const { token, hash } = newInviteToken();
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(hash).toBe(hashToken(token));
    expect(hash).not.toContain(token);
  });
});

describe('estrutura da escola (EST)', () => {
  it('gestora cria matéria e turma; professor e aluno não', async () => {
    await withTenantUser(app, escola, gestora, (tx) =>
      tx.insert(s.subjects).values({ tenantId: escola, name: 'Matemática' }),
    );
    for (const user of [prof, aluno]) {
      await expect(
        withTenantUser(app, escola, user, (tx) =>
          tx.insert(s.subjects).values({ tenantId: escola, name: `Arte ${user.slice(0, 4)}` }),
        ),
      ).rejects.toSatisfy((e) => pgCode(e) === '42501');
    }
  });

  it('turma não aponta para ano de outra escola, mesmo com o id certo (FK composta)', async () => {
    const outroAno = await owner.query.grades.findFirst({ where: eq(s.grades.tenantId, outra) });
    await expect(
      withTenantUser(app, escola, gestora, (tx) =>
        tx.insert(s.classes).values({
          tenantId: escola,
          gradeId: outroAno!.id,
          name: '3º Z',
          schoolYear: 2027,
          joinCode: generateJoinCode(),
        }),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '23503');
  });

  it('professor não é ligado a matéria de outra escola (FK composta)', async () => {
    await expect(
      withTenantUser(app, escola, gestora, (tx) =>
        tx.insert(s.teacherAssignments).values({
          tenantId: escola,
          classId: school.classId,
          subjectId: outraSchool.subjectId,
          userId: prof,
        }),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '23503');
  });

  it('nome de matéria repetido na mesma escola é recusado, sem diferenciar maiúsculas', async () => {
    await expect(
      withTenantUser(app, escola, gestora, (tx) =>
        tx.insert(s.subjects).values({ tenantId: escola, name: 'MATEMÁTICA' }),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '23505');
  });
});

describe('quem vê o quê nas turmas (USR-04)', () => {
  it('aluno vê só a própria turma e o próprio vínculo nela', async () => {
    const r = await withTenantUser(app, escola, aluno, async (tx) => ({
      classes: await tx.select().from(s.classes),
      members: await tx.select().from(s.classMembers),
    }));
    expect(r.classes.map((c) => c.id)).toEqual([school.classId]);
    expect(r.members.map((m) => m.userId)).toEqual([aluno]);
  });

  it('professor vê os alunos das turmas dele; sem turma, não vê nenhum', async () => {
    const own = await withTenantUser(app, escola, prof, (tx) => tx.select().from(s.classMembers));
    expect(own.map((m) => m.userId)).toEqual([aluno]);
    const studentsSeen = await withTenantUser(app, escola, prof, (tx) =>
      tx.select().from(s.memberships).where(eq(s.memberships.role, 'student')),
    );
    expect(studentsSeen.map((m) => m.userId)).toEqual([aluno]);
    const none = await withTenantUser(app, escola, profSemTurma, (tx) =>
      tx.select().from(s.classMembers),
    );
    expect(none).toHaveLength(0);
  });

  it('professor não matricula aluno (só a gestão)', async () => {
    const novo = await makeUser(owner);
    await expect(
      withTenantUser(app, escola, prof, (tx) =>
        tx
          .insert(s.classMembers)
          .values({ tenantId: escola, classId: school.classId, userId: novo }),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '42501');
  });
});

describe('aluno sem e-mail (USR-02, USR-03, K-D07)', () => {
  it('gestora cria aluno com usuário da turma; apelido repetido na turma é recusado', async () => {
    const created = await withTenantUser(app, escola, gestora, (tx) =>
      createStudent(tx, {
        tenantId: escola,
        classId: school.classId,
        joinCode: school.joinCode,
        name: 'Júlia Ávila',
        nickname: 'julia',
        password: 'gato-azul-42',
        actorId: gestora,
      }),
    );
    expect(created.username).toBe(`${school.joinCode}.julia`);
    const user = await owner.query.authUsers.findFirst({
      where: eq(s.authUsers.id, created.userId),
    });
    expect(user?.email.endsWith('@aluno.kids.invalid')).toBe(true);
    expect(user?.emailVerified).toBe(true);
    await expect(
      withTenantUser(app, escola, gestora, (tx) =>
        createStudent(tx, {
          tenantId: escola,
          classId: school.classId,
          joinCode: school.joinCode,
          name: 'Outra Júlia',
          nickname: 'julia',
          password: 'sol-verde-11',
          actorId: gestora,
        }),
      ),
    ).rejects.toBeInstanceOf(NicknameTakenError);
  });

  it('professor não cria aluno', async () => {
    await expect(
      withTenantUser(app, escola, prof, (tx) =>
        createStudent(tx, {
          tenantId: escola,
          classId: school.classId,
          joinCode: school.joinCode,
          name: 'Pedro',
          nickname: 'pedro',
          password: 'lua-rosa-33',
          actorId: prof,
        }),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '42501');
  });
});

describe('convites (USR-01, INS-03)', () => {
  // Único por rodada: o banco de teste local é reaproveitado entre execuções.
  const run = randomUUID().slice(0, 8);
  async function invite(email: string, role: 'manager' | 'teacher' = 'teacher', ttl = 86_400_000) {
    const { token, hash } = newInviteToken();
    await withTenantUser(app, escola, gestora, (tx) =>
      tx.insert(s.invitations).values({
        tenantId: escola,
        email,
        role,
        tokenHash: hash,
        invitedBy: gestora,
        expiresAt: new Date(Date.now() + ttl),
      }),
    );
    return token;
  }

  it('sem sessão, o convite só é lido pela função, pelo hash do token', async () => {
    const token = await invite(`nova.prof-${run}@teste.kids`);
    const direct = await withAnonymous(app, (tx) => tx.select().from(s.invitations));
    expect(direct).toHaveLength(0);
    const r = await withAnonymous(app, (tx) =>
      tx.execute<{ email: string; status: string; role: string }>(
        sql`select email, status, role from invitation_lookup(${hashToken(token)})`,
      ),
    );
    expect(r.rows).toEqual([
      { email: `nova.prof-${run}@teste.kids`, status: 'open', role: 'teacher' },
    ]);
  });

  it('aceite cria o vínculo, usa o convite uma vez e confere o e-mail da conta', async () => {
    const token = await invite(`aceita-${run}@teste.kids`);
    const certo = await makeUser(owner);
    await owner
      .update(s.authUsers)
      .set({ email: `aceita-${run}@teste.kids` })
      .where(eq(s.authUsers.id, certo));
    const errado = await makeUser(owner);
    await expect(
      withUser(app, errado, (tx) => tx.execute(sql`select invitation_accept(${hashToken(token)})`)),
    ).rejects.toSatisfy((e) => pgCode(e) === '42501');
    const r = await withUser(app, certo, (tx) =>
      tx.execute<{ t: string }>(sql`select invitation_accept(${hashToken(token)}) as t`),
    );
    expect(r.rows[0]!.t).toBe(escola);
    const roles = await withTenantUser(app, escola, certo, (tx) =>
      tx.select().from(s.memberships).where(eq(s.memberships.userId, certo)),
    );
    expect(roles.map((m) => m.role)).toEqual(['teacher']);
    await expect(
      withUser(app, certo, (tx) => tx.execute(sql`select invitation_accept(${hashToken(token)})`)),
    ).rejects.toSatisfy((e) => pgCode(e) === '22023');
  });

  it('convite vencido não é aceito', async () => {
    const token = await invite(`vencido-${run}@teste.kids`, 'teacher', -1000);
    const u = await makeUser(owner);
    await owner
      .update(s.authUsers)
      .set({ email: `vencido-${run}@teste.kids` })
      .where(eq(s.authUsers.id, u));
    const look = await withAnonymous(app, (tx) =>
      tx.execute<{ status: string }>(
        sql`select status from invitation_lookup(${hashToken(token)})`,
      ),
    );
    expect(look.rows[0]!.status).toBe('expired');
    await expect(
      withUser(app, u, (tx) => tx.execute(sql`select invitation_accept(${hashToken(token)})`)),
    ).rejects.toSatisfy((e) => pgCode(e) === '22023');
  });

  it('professor não convida; convite de aluno não existe (aluno é criado pela gestão)', async () => {
    const { hash } = newInviteToken();
    await expect(
      withTenantUser(app, escola, prof, (tx) =>
        tx.insert(s.invitations).values({
          tenantId: escola,
          email: 'x@teste.kids',
          role: 'teacher',
          tokenHash: hash,
          invitedBy: prof,
          expiresAt: new Date(Date.now() + 1000),
        }),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '42501');
    await expect(
      withTenantUser(app, escola, gestora, (tx) =>
        tx.insert(s.invitations).values({
          tenantId: escola,
          email: 'y@teste.kids',
          role: 'student',
          tokenHash: newInviteToken().hash,
          invitedBy: gestora,
          expiresAt: new Date(Date.now() + 1000),
        }),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '23514');
  });
});
