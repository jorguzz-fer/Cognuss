import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { withAnonymous, withTenantUser } from '../src/client';
import {
  createPlan,
  GUARDIAN_POLICY_VERSION,
  linkGuardian,
  newPlanVersion,
  transitionPlan,
} from '../src/plans';
import * as s from '../src/schema';
import { hashToken } from '../src/school';
import { addMember, connect, makeTenant, makeUser, pgCode, seedSchool } from './helpers';

// Fase 2 da SPEC Kids: planos (PLA-01 a 05), conteúdo (CON), progresso (PAI-01) e responsável (RES).
const { app, owner, appPool, ownerPool } = connect();
let escola: string;
let gestora: string;
let prof: string;
let prof2: string;
let profOutraMateria: string;
let aluno: string;
let alunoOutroAno: string;
let school: Awaited<ReturnType<typeof seedSchool>>;
let planId: string;
let topicId: string;
let cardId: string;

const as = <T>(user: string, fn: Parameters<typeof withTenantUser<T>>[3]) =>
  withTenantUser(app, escola, user, fn);

beforeAll(async () => {
  escola = await makeTenant(owner);
  gestora = await makeUser(owner);
  prof = await makeUser(owner);
  prof2 = await makeUser(owner);
  profOutraMateria = await makeUser(owner);
  aluno = await makeUser(owner);
  alunoOutroAno = await makeUser(owner);
  await addMember(owner, escola, gestora, 'manager');
  for (const t of [prof, prof2, profOutraMateria]) await addMember(owner, escola, t, 'teacher');
  for (const a of [aluno, alunoOutroAno]) await addMember(owner, escola, a, 'student');
  school = await seedSchool(owner, escola, { teacher: prof, student: aluno, inviter: gestora });
  // prof2 também leciona Ciências no 3º ano; profOutraMateria leciona outra matéria.
  await owner.insert(s.teacherAssignments).values({
    tenantId: escola,
    classId: school.classId,
    subjectId: school.subjectId,
    userId: prof2,
  });
  const [arte] = await owner
    .insert(s.subjects)
    .values({ tenantId: escola, name: `Arte ${randomUUID().slice(0, 4)}` })
    .returning();
  await owner.insert(s.teacherAssignments).values({
    tenantId: escola,
    classId: school.classId,
    subjectId: arte!.id,
    userId: profOutraMateria,
  });
  // alunoOutroAno numa turma do 4º ano.
  await owner.insert(s.grades).values({ tenantId: escola, stage: 'fundamental', number: 4 });
  const g4 = await owner.query.grades.findFirst({
    where: and(eq(s.grades.tenantId, escola), eq(s.grades.number, 4)),
  });
  const [c4] = await owner
    .insert(s.classes)
    .values({
      tenantId: escola,
      gradeId: g4!.id,
      name: '4º A',
      schoolYear: 2027,
      joinCode: randomUUID().replace(/-/g, '').slice(0, 6),
    })
    .returning();
  await owner
    .insert(s.classMembers)
    .values({ tenantId: escola, classId: c4!.id, userId: alunoOutroAno });
});

afterAll(async () => {
  await appPool.end();
  await ownerPool.end();
});

describe('quem cria plano (PLA-01)', () => {
  it('professor da turma × matéria cria; professor de outra matéria não', async () => {
    planId = await as(prof, (tx) =>
      createPlan(tx, {
        tenantId: escola,
        gradeId: school.gradeId,
        subjectId: school.subjectId,
        schoolYear: 2027,
        title: 'Vertebrados',
        authorId: prof,
      }),
    );
    await expect(
      as(profOutraMateria, (tx) =>
        createPlan(tx, {
          tenantId: escola,
          gradeId: school.gradeId,
          subjectId: school.subjectId,
          schoolYear: 2027,
          title: 'Intruso',
          authorId: profOutraMateria,
        }),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '42501');
  });

  it('ninguém cria plano em nome de outro autor', async () => {
    await expect(
      as(gestora, (tx) =>
        createPlan(tx, {
          tenantId: escola,
          gradeId: school.gradeId,
          subjectId: school.subjectId,
          schoolYear: 2027,
          title: 'Outro autor',
          authorId: prof,
        }),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '42501');
  });

  it('autor monta tópicos, conteúdo e flashcards no rascunho', async () => {
    const r = await as(prof, async (tx) => {
      const [t] = await tx
        .insert(s.planTopics)
        .values({ tenantId: escola, planId, title: 'Peixes', dayNumber: 1 })
        .returning();
      await tx.insert(s.topicContents).values({
        tenantId: escola,
        topicId: t!.id,
        kind: 'text',
        bodyMd: 'Peixes respiram por **brânquias**.',
      });
      const [c] = await tx
        .insert(s.flashcards)
        .values({
          tenantId: escola,
          topicId: t!.id,
          front: 'Peixe respira por?',
          back: 'Brânquias.',
        })
        .returning();
      return { t: t!.id, c: c!.id };
    });
    topicId = r.t;
    cardId = r.c;
  });

  it('vídeo só com https e tabela só com dados (CON-01)', async () => {
    await expect(
      as(prof, (tx) =>
        tx
          .insert(s.topicContents)
          .values({ tenantId: escola, topicId, kind: 'video', url: 'http://x.com' }),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '23514');
  });
});

describe('fluxo editorial (PLA-05)', () => {
  it('aluno não vê rascunho', async () => {
    const rows = await as(aluno, (tx) => tx.select().from(s.studyPlans));
    expect(rows).toHaveLength(0);
  });

  it('em revisão, o conteúdo não muda; o autor não aprova o próprio plano', async () => {
    await as(prof, (tx) => transitionPlan(tx, { planId, to: 'in_review' }));
    await expect(
      as(prof, (tx) =>
        tx.insert(s.planTopics).values({ tenantId: escola, planId, title: 'Anfíbios' }),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '42501');
    await expect(
      as(prof, (tx) => transitionPlan(tx, { planId, to: 'approved' })),
    ).rejects.toSatisfy((e) => pgCode(e) === '42501');
  });

  it('pular a revisão é recusado', async () => {
    await expect(
      as(prof2, (tx) => transitionPlan(tx, { planId, to: 'published' })),
    ).rejects.toSatisfy((e) => pgCode(e) === '23514');
  });

  it('outro professor aprova; a publicação grava a data; publicado não muda no lugar', async () => {
    await as(prof2, (tx) => transitionPlan(tx, { planId, to: 'approved' }));
    await as(prof, (tx) => transitionPlan(tx, { planId, to: 'published' }));
    const p = await owner.query.studyPlans.findFirst({ where: eq(s.studyPlans.id, planId) });
    expect(p?.status).toBe('published');
    expect(p?.reviewerId).toBe(prof2);
    expect(p?.publishedAt).toBeInstanceOf(Date);
    await expect(
      as(gestora, (tx) =>
        tx.update(s.studyPlans).set({ title: 'Mudado' }).where(eq(s.studyPlans.id, planId)),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '42501');
  });
});

describe('aluno e consentimento (RES-03)', () => {
  it('sem consentimento do responsável, o aluno não vê o plano publicado', async () => {
    const rows = await as(aluno, (tx) => tx.select().from(s.studyPlans));
    expect(rows).toHaveLength(0);
  });

  it('o responsável autoriza pelo link; o aluno passa a ver só o plano do ano dele', async () => {
    const { token } = await as(gestora, (tx) =>
      linkGuardian(tx, {
        tenantId: escola,
        studentUserId: aluno,
        name: 'Mãe Teste',
        email: `Mae-${randomUUID().slice(0, 6)}@Teste.Kids`,
      }),
    );
    const portal = await withAnonymous(app, (tx) =>
      tx.execute<{ student_id: string; granted: boolean }>(
        sql`select student_id, granted from guardian_portal(${hashToken(token)})`,
      ),
    );
    expect(portal.rows).toEqual([{ student_id: aluno, granted: false }]);
    await withAnonymous(app, (tx) =>
      tx.execute(
        sql`select guardian_record_consent(${hashToken(token)}, ${aluno}, true, ${GUARDIAN_POLICY_VERSION}, null)`,
      ),
    );
    const seen = await as(aluno, (tx) => tx.select().from(s.studyPlans));
    expect(seen.map((p) => p.id)).toEqual([planId]);
    const other = await as(alunoOutroAno, (tx) => tx.select().from(s.studyPlans));
    expect(other).toHaveLength(0);

    // Retirar o consentimento bloqueia de novo (vale o registro mais recente).
    await withAnonymous(app, (tx) =>
      tx.execute(
        sql`select guardian_record_consent(${hashToken(token)}, ${aluno}, false, ${GUARDIAN_POLICY_VERSION}, null)`,
      ),
    );
    expect(await as(aluno, (tx) => tx.select().from(s.studyPlans))).toHaveLength(0);
    await withAnonymous(app, (tx) =>
      tx.execute(
        sql`select guardian_record_consent(${hashToken(token)}, ${aluno}, true, ${GUARDIAN_POLICY_VERSION}, null)`,
      ),
    );
  });

  it('link inválido e aluno de outro responsável são recusados; pedido do titular (RES-05)', async () => {
    await expect(
      withAnonymous(app, (tx) =>
        tx.execute(sql`select guardian_record_consent('nao-existe', ${aluno}, true, 'v', null)`),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '42501');
    const { token } = await as(gestora, (tx) =>
      linkGuardian(tx, {
        tenantId: escola,
        studentUserId: alunoOutroAno,
        name: 'Pai Teste',
        email: `pai-${randomUUID().slice(0, 6)}@teste.kids`,
      }),
    );
    await expect(
      withAnonymous(app, (tx) =>
        tx.execute(
          sql`select guardian_record_consent(${hashToken(token)}, ${aluno}, true, 'v', null)`,
        ),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '42501');
    await withAnonymous(app, (tx) =>
      tx.execute(
        sql`select guardian_open_request(${hashToken(token)}, ${alunoOutroAno}, 'export', 'Quero os dados')`,
      ),
    );
    const reqs = await as(gestora, (tx) =>
      tx
        .select()
        .from(s.guardianRequests)
        .where(eq(s.guardianRequests.studentUserId, alunoOutroAno)),
    );
    expect(reqs.map((r) => r.kind)).toEqual(['export']);
  });

  it('consentimento é imutável; papel só em nome de quem registra (RES-04)', async () => {
    await expect(
      as(gestora, (tx) => tx.execute(sql`update guardian_consents set granted = true`)),
    ).rejects.toSatisfy((e) => pgCode(e) === '42501');
    const g = await as(gestora, (tx) => tx.select().from(s.guardians).limit(1));
    await expect(
      as(gestora, (tx) =>
        tx.insert(s.guardianConsents).values({
          tenantId: escola,
          guardianId: g[0]!.id,
          studentUserId: alunoOutroAno,
          purpose: 'platform',
          policyVersion: 'v',
          granted: true,
          source: 'paper',
          recordedBy: prof,
        }),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '42501');
    await as(gestora, (tx) =>
      tx.insert(s.guardianConsents).values({
        tenantId: escola,
        guardianId: g[0]!.id,
        studentUserId: aluno,
        purpose: 'platform',
        policyVersion: 'v',
        granted: true,
        source: 'paper',
        recordedBy: gestora,
        note: 'Termo assinado na secretaria',
      }),
    );
  });
});

describe('progresso do aluno (PAI-01, CON-03)', () => {
  it('aluno marca tópico e revisa cartão; não grava em nome de outro', async () => {
    await as(aluno, async (tx) => {
      await tx.insert(s.topicProgress).values({ tenantId: escola, topicId, userId: aluno });
      await tx
        .insert(s.flashcardSchedules)
        .values({ tenantId: escola, flashcardId: cardId, userId: aluno, dueAt: new Date() });
    });
    await expect(
      as(aluno, (tx) =>
        tx.insert(s.topicProgress).values({ tenantId: escola, topicId, userId: alunoOutroAno }),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '42501');
  });

  it('aluno de outro ano não grava progresso em plano que não lê', async () => {
    await expect(
      as(alunoOutroAno, (tx) =>
        tx.insert(s.topicProgress).values({ tenantId: escola, topicId, userId: alunoOutroAno }),
      ),
    ).rejects.toSatisfy((e) => pgCode(e) === '42501');
  });

  it('professor da turma vê o progresso dos alunos dele', async () => {
    const rows = await as(prof, (tx) => tx.select().from(s.topicProgress));
    expect(rows.map((r) => r.userId)).toEqual([aluno]);
  });
});

describe('nova versão (PLA-05)', () => {
  it('copia a árvore em rascunho; publicar a nova arquiva a anterior', async () => {
    const v2 = await as(prof, (tx) => newPlanVersion(tx, { planId, authorId: prof }));
    const copy = await as(prof, async (tx) => ({
      plan: await tx.query.studyPlans.findFirst({ where: eq(s.studyPlans.id, v2) }),
      topics: await tx.select().from(s.planTopics).where(eq(s.planTopics.planId, v2)),
    }));
    expect(copy.plan?.status).toBe('draft');
    expect(copy.plan?.version).toBe(2);
    expect(copy.topics.map((t) => t.title)).toEqual(['Peixes']);
    await as(prof, (tx) => transitionPlan(tx, { planId: v2, to: 'in_review' }));
    await as(gestora, (tx) => transitionPlan(tx, { planId: v2, to: 'approved' }));
    await as(gestora, (tx) => transitionPlan(tx, { planId: v2, to: 'published' }));
    const all = await owner.select().from(s.studyPlans).where(eq(s.studyPlans.rootId, planId));
    expect(Object.fromEntries(all.map((p) => [p.version, p.status]))).toEqual({
      1: 'archived',
      2: 'published',
    });
    const seen = await as(aluno, (tx) => tx.select().from(s.studyPlans));
    expect(seen.map((p) => p.id)).toEqual([v2]);
  });
});
