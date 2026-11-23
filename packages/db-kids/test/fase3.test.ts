import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { withTenantUser } from '../src/client';
import { addConcept, parseKeywordGroups } from '../src/assessments';
import * as s from '../src/schema';
import { addMember, connect, makeTenant, makeUser, pgCode, seedPlan, seedSchool } from './helpers';

// Fase 3 da SPEC Kids: simulado, prova, nota mínima e recuperação em outro formato (AVA).
const { app, owner, appPool, ownerPool } = connect();
let escola: string;
let prof: string;
let aluno: string;
let colega: string;
let semAutorizacao: string;
let planId: string;
let topicId: string;

type ViewRow = {
  pos: number;
  kind: string;
  stem: string;
  options: string[] | null;
  is_correct: boolean | null;
  explanation: string | null;
  correct: { correct?: number; value?: boolean } | null;
};

const as = <T>(user: string, fn: Parameters<typeof withTenantUser<T>>[3]) =>
  withTenantUser(app, escola, user, fn);
const start = (user: string, assessmentId: string, key: string, retakeOf: string | null = null) =>
  as(user, async (tx) => {
    const r = await tx.execute<{ id: string }>(
      sql`select attempt_start(${assessmentId}, ${key}, ${retakeOf}) as id`,
    );
    return r.rows[0]!.id;
  });
const view = (user: string, attemptId: string) =>
  as(
    user,
    async (tx) => (await tx.execute<ViewRow>(sql`select * from attempt_view(${attemptId})`)).rows,
  );
const answer = (user: string, attemptId: string, pos: number, a: object) =>
  as(user, async (tx) => {
    const r = await tx.execute<{ r: Record<string, unknown> }>(
      sql`select attempt_answer(${attemptId}, ${pos}, ${JSON.stringify(a)}::jsonb) as r`,
    );
    return r.rows[0]!.r;
  });
const submit = (user: string, attemptId: string) =>
  as(user, async (tx) => {
    const r = await tx.execute<{ r: { score: string; passed: boolean | null; correct: number } }>(
      sql`select attempt_submit(${attemptId}) as r`,
    );
    return r.rows[0]!.r;
  });

/** Resposta certa de cada questão, lida como dono (só para o teste). */
async function rightAnswer(attemptId: string, pos: number) {
  const r = await owner.execute<{ kind: string; answer: Record<string, unknown> }>(sql`
    select q.kind, q.answer from attempt_items ai join questions q on q.id = ai.question_id
    where ai.attempt_id = ${attemptId} and ai.position = ${pos}`);
  const { kind, answer: key } = r.rows[0]!;
  if (kind === 'multiple_choice') return { choice: key.correct };
  if (kind === 'true_false') return { value: key.value };
  return { text: 'Respiram pelas brânquias, que tiram o oxigênio da água' };
}

beforeAll(async () => {
  escola = await makeTenant(owner);
  prof = await makeUser(owner);
  aluno = await makeUser(owner);
  colega = await makeUser(owner);
  semAutorizacao = await makeUser(owner);
  const gestora = await makeUser(owner);
  await addMember(owner, escola, gestora, 'manager');
  await addMember(owner, escola, prof, 'teacher');
  for (const a of [aluno, colega, semAutorizacao]) await addMember(owner, escola, a, 'student');
  const school = await seedSchool(owner, escola, {
    teacher: prof,
    student: aluno,
    inviter: gestora,
  });
  const seeded = await seedPlan(owner, escola, school, { author: prof, student: aluno });
  planId = seeded.planId;
  topicId = seeded.topicId;
  // colega: mesma turma e autorizado; semAutorizacao: mesma turma, sem consentimento.
  for (const u of [colega, semAutorizacao]) {
    await owner
      .insert(s.classMembers)
      .values({ tenantId: escola, classId: school.classId, userId: u });
  }
  await owner
    .insert(s.guardianLinks)
    .values({ tenantId: escola, guardianId: seeded.guardianId, studentUserId: colega });
  await owner.insert(s.guardianConsents).values({
    tenantId: escola,
    guardianId: seeded.guardianId,
    studentUserId: colega,
    purpose: 'platform',
    policyVersion: 'teste',
    granted: true,
    source: 'online',
  });
  // Mais três conceitos, cada um nos três formatos.
  for (let i = 0; i < 3; i++) {
    await owner.transaction((tx) =>
      addConcept(tx, {
        tenantId: escola,
        topicId,
        explanation: `Explicação ${i}`,
        multipleChoice: { stem: `Pergunta ${i}?`, options: ['certa', 'errada'], correct: 0 },
        trueFalse: { stem: `Afirmação ${i}.`, value: true },
        shortAnswer: {
          stem: `Explique ${i}.`,
          groups: parseKeywordGroups('brânqui/guelra; oxigênio'),
          min: 2,
          modelAnswer: 'Pelas brânquias, que tiram o oxigênio da água.',
        },
      }),
    );
  }
});

afterAll(async () => {
  await appPool.end();
  await ownerPool.end();
});

async function makeExam(
  questionCount: number,
  extra: Partial<typeof s.assessments.$inferInsert> = {},
) {
  return as(prof, async (tx) => {
    const [e] = await tx
      .insert(s.assessments)
      .values({
        tenantId: escola,
        planId,
        kind: 'exam',
        title: `Prova ${randomUUID().slice(0, 4)}`,
        questionCount,
        maxAttempts: 1,
        createdBy: prof,
        ...extra,
      })
      .returning();
    return e!.id;
  });
}

describe('correção (AVA-01)', () => {
  it('palavras-chave: radicais alternativos por grupo, sem acento, contra o mínimo', async () => {
    expect(parseKeywordGroups(' Brânqui / guelra ;oxigênio;; ')).toEqual([
      ['brânqui', 'guelra'],
      ['oxigênio'],
    ]);
    const grade = async (text: string) =>
      (
        await owner.execute<{ ok: boolean }>(sql`select kids_grade('short_answer',
          '{"groups":[["branqui","guelra"],["oxigenio"]],"min":2}'::jsonb,
          ${JSON.stringify({ text })}::jsonb) as ok`)
      ).rows[0]!.ok;
    expect(await grade('Pelas BRÂNQUIAS, tirando o OXIGÊNIO')).toBe(true);
    expect(await grade('Pelas guelras e oxigenio')).toBe(true);
    expect(await grade('Pelas brânquias')).toBe(false);
  });
});

describe('o gabarito nunca vai ao aluno (AVA-02)', () => {
  it('aluno não lê a tabela de questões', async () => {
    expect(await as(aluno, (tx) => tx.select().from(s.questions))).toHaveLength(0);
  });

  it('prova: a tentativa mostra as questões sem resposta certa até o envio', async () => {
    const exam = await makeExam(4);
    const att = await start(aluno, exam, `chave-${randomUUID()}`);
    const rows = await view(aluno, att);
    expect(rows).toHaveLength(4);
    for (const r of rows) {
      expect(r.correct).toBeNull();
      expect(r.explanation).toBeNull();
      expect(r.is_correct).toBeNull();
    }
    expect(await answer(aluno, att, 1, { choice: 0 })).toEqual({});
    expect(await view(colega, att)).toHaveLength(0);
  });

  it('o aluno não grava tentativa nem item direto na tabela', async () => {
    await expect(
      as(aluno, (tx) =>
        tx.insert(s.assessmentAttempts).values({
          tenantId: escola,
          assessmentId: randomUUID(),
          userId: aluno,
          clientKey: 'x'.repeat(10),
          total: 1,
        }),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '42501');
  });
});

describe('prova, nota e recuperação (AVA-04, AVA-05, AVA-07)', () => {
  it('a mesma chave devolve a mesma tentativa; tentativas esgotadas são recusadas', async () => {
    const exam = await makeExam(3);
    const key = `chave-${randomUUID()}`;
    const a1 = await start(aluno, exam, key);
    expect(await start(aluno, exam, key)).toBe(a1);
    await expect(start(aluno, exam, `chave-${randomUUID()}`)).rejects.toSatisfy(
      (e) => pgCode(e) === '22023',
    );
  });

  it('tudo certo: nota 10 e aprovada; enviar de novo não muda nada', async () => {
    const exam = await makeExam(4);
    const att = await start(aluno, exam, `chave-${randomUUID()}`);
    for (let pos = 1; pos <= 4; pos++) await answer(aluno, att, pos, await rightAnswer(att, pos));
    const r = await submit(aluno, att);
    expect([Number(r.score), r.passed, r.correct]).toEqual([10, true, 4]);
    expect(await submit(aluno, att)).toEqual(r);
    const after = await view(aluno, att);
    expect(after.every((x) => x.is_correct === true)).toBe(true);
  });

  it('abaixo de 8: recuperação com as erradas, em outro formato do mesmo conceito', async () => {
    const exam = await makeExam(4);
    const att = await start(colega, exam, `chave-${randomUUID()}`);
    // Acerta só a primeira: 2,5.
    await answer(colega, att, 1, await rightAnswer(att, 1));
    const r = await submit(colega, att);
    expect([Number(r.score), r.passed]).toEqual([2.5, false]);
    const wrong = await owner.execute<{ group_id: string; kind: string }>(sql`
      select q.group_id, q.kind from attempt_items ai join questions q on q.id = ai.question_id
      where ai.attempt_id = ${att} and ai.position > 1 order by ai.position`);
    const retake = await start(colega, exam, `chave-${randomUUID()}`, att);
    const items = await owner.execute<{ group_id: string; kind: string }>(sql`
      select q.group_id, q.kind from attempt_items ai join questions q on q.id = ai.question_id
      where ai.attempt_id = ${retake} order by ai.position`);
    expect(items.rows).toHaveLength(3);
    items.rows.forEach((it, i) => {
      expect(it.group_id).toBe(wrong.rows[i]!.group_id);
      expect(it.kind).not.toBe(wrong.rows[i]!.kind);
    });
    for (let pos = 1; pos <= 3; pos++)
      await answer(colega, retake, pos, await rightAnswer(retake, pos));
    const r2 = await submit(colega, retake);
    expect([Number(r2.score), r2.passed]).toEqual([10, true]);
    // Recuperação só de prova reprovada, uma vez por tentativa.
    await expect(start(colega, exam, `chave-${randomUUID()}`, retake)).rejects.toSatisfy(
      (e) => pgCode(e) === '22023',
    );
    await expect(start(colega, exam, `chave-${randomUUID()}`, att)).rejects.toSatisfy(
      (e) => pgCode(e) === '22023',
    );
  });

  it('sem consentimento do responsável, o aluno não começa a prova', async () => {
    const exam = await makeExam(2);
    await expect(start(semAutorizacao, exam, `chave-${randomUUID()}`)).rejects.toSatisfy(
      (e) => pgCode(e) === '42501',
    );
  });

  it('fora do prazo, não começa', async () => {
    const exam = await makeExam(2, { opensAt: new Date(Date.now() + 86_400_000) });
    await expect(start(aluno, exam, `chave-${randomUUID()}`)).rejects.toSatisfy(
      (e) => pgCode(e) === '22023',
    );
  });
});

describe('simulado (AVA-03)', () => {
  it('corrige na hora, com a explicação; cada questão é respondida uma vez; sem nota mínima', async () => {
    const practice = await as(prof, async (tx) => {
      const [p] = await tx
        .insert(s.assessments)
        .values({
          tenantId: escola,
          planId,
          kind: 'practice',
          title: 'Simulado',
          questionCount: 3,
          createdBy: prof,
        })
        .returning();
      return p!.id;
    });
    const att = await start(aluno, practice, `chave-${randomUUID()}`);
    const feedback = await answer(aluno, att, 1, await rightAnswer(att, 1));
    expect(feedback.correct).toBe(true);
    await expect(answer(aluno, att, 1, { choice: 1 })).rejects.toSatisfy(
      (e) => pgCode(e) === '22023',
    );
    const rows = await view(aluno, att);
    expect(rows[0]!.is_correct).toBe(true);
    expect(rows[1]!.is_correct).toBeNull();
    const r = await submit(aluno, att);
    expect(r.passed).toBeNull();
  });
});

describe('quem vê os resultados (AVA-08, PAI-02)', () => {
  it('o professor da turma vê as tentativas dos alunos dele; o colega não vê as do outro', async () => {
    const seen = await as(prof, (tx) =>
      tx.select().from(s.assessmentAttempts).where(eq(s.assessmentAttempts.userId, colega)),
    );
    expect(seen.length).toBeGreaterThan(0);
    const other = await as(aluno, (tx) =>
      tx.select().from(s.assessmentAttempts).where(eq(s.assessmentAttempts.userId, colega)),
    );
    expect(other).toHaveLength(0);
  });
});
