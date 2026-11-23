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

/**
 * Estrutura de uma escola para os testes da Fase 1: matéria, turma do 3º ano, aluno na turma,
 * professor na turma × matéria e um convite. Criada como dono (sem RLS).
 */
export async function seedSchool(
  owner: Db,
  tenantId: string,
  people: { teacher: string; student: string; inviter: string },
) {
  const grade = await owner.query.grades.findFirst({
    where: (g, { eq: e }) => e(g.tenantId, tenantId),
  });
  const [subject] = await owner
    .insert(s.subjects)
    .values({ tenantId, name: `Ciências ${randomUUID().slice(0, 4)}` })
    .returning();
  const code = randomUUID()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 6)
    .padEnd(6, 'a');
  const [klass] = await owner
    .insert(s.classes)
    .values({ tenantId, gradeId: grade!.id, name: `3º ${code}`, schoolYear: 2027, joinCode: code })
    .returning();
  await owner
    .insert(s.classMembers)
    .values({ tenantId, classId: klass!.id, userId: people.student });
  await owner.insert(s.teacherAssignments).values({
    tenantId,
    classId: klass!.id,
    subjectId: subject!.id,
    userId: people.teacher,
  });
  await owner.insert(s.invitations).values({
    tenantId,
    email: `convidado-${code}@teste.kids`,
    role: 'teacher',
    tokenHash: randomUUID(),
    invitedBy: people.inviter,
    expiresAt: new Date(Date.now() + 86_400_000),
  });
  return { gradeId: grade!.id, subjectId: subject!.id, classId: klass!.id, joinCode: code };
}

/**
 * Fase 2: plano publicado de Ciências da turma, com tópico, conteúdo, flashcard, progresso e
 * revisão do aluno, responsável ligado, token, consentimento e pedido. Criado como dono.
 */
export async function seedPlan(
  owner: Db,
  tenantId: string,
  school: { gradeId: string; subjectId: string },
  people: { author: string; student: string },
) {
  const planId = randomUUID();
  await owner.insert(s.studyPlans).values({
    id: planId,
    rootId: planId,
    tenantId,
    gradeId: school.gradeId,
    subjectId: school.subjectId,
    schoolYear: 2027,
    title: 'Vertebrados',
    status: 'published',
    authorId: people.author,
    publishedAt: new Date(),
  });
  const [topic] = await owner
    .insert(s.planTopics)
    .values({ tenantId, planId, title: 'Peixes', dayNumber: 1 })
    .returning();
  await owner.insert(s.topicContents).values({
    tenantId,
    topicId: topic!.id,
    kind: 'text',
    bodyMd: 'Peixes respiram por brânquias.',
  });
  const [card] = await owner
    .insert(s.flashcards)
    .values({
      tenantId,
      topicId: topic!.id,
      front: 'Por onde o peixe respira?',
      back: 'Brânquias.',
    })
    .returning();
  await owner.insert(s.flashcardSchedules).values({
    tenantId,
    flashcardId: card!.id,
    userId: people.student,
    dueAt: new Date(),
  });
  await owner
    .insert(s.topicProgress)
    .values({ tenantId, topicId: topic!.id, userId: people.student });
  const [guardian] = await owner
    .insert(s.guardians)
    .values({ tenantId, name: 'Responsável', email: `resp-${randomUUID().slice(0, 8)}@teste.kids` })
    .returning();
  await owner
    .insert(s.guardianLinks)
    .values({ tenantId, guardianId: guardian!.id, studentUserId: people.student });
  await owner.insert(s.guardianAccessTokens).values({
    tenantId,
    guardianId: guardian!.id,
    tokenHash: randomUUID(),
    expiresAt: new Date(Date.now() + 86_400_000),
  });
  await owner.insert(s.guardianConsents).values({
    tenantId,
    guardianId: guardian!.id,
    studentUserId: people.student,
    purpose: 'platform',
    policyVersion: 'teste',
    granted: true,
    source: 'online',
  });
  await owner.insert(s.guardianRequests).values({
    tenantId,
    guardianId: guardian!.id,
    studentUserId: people.student,
    kind: 'access',
  });
  // Fase 3: um conceito em dois formatos, uma prova e uma tentativa com item.
  const groupId = randomUUID();
  const [mc] = await owner
    .insert(s.questions)
    .values({
      tenantId,
      topicId: topic!.id,
      groupId,
      kind: 'multiple_choice',
      stem: 'Os peixes respiram por...',
      options: ['brânquias', 'pulmões', 'pele'],
      answer: { correct: 0 },
      explanation: 'Pelas brânquias.',
    })
    .returning();
  await owner.insert(s.questions).values({
    tenantId,
    topicId: topic!.id,
    groupId,
    kind: 'true_false',
    stem: 'Os peixes respiram por pulmões.',
    answer: { value: false },
  });
  const [exam] = await owner
    .insert(s.assessments)
    .values({
      tenantId,
      planId,
      kind: 'exam',
      title: 'Prova',
      questionCount: 1,
      createdBy: people.author,
    })
    .returning();
  const [attempt] = await owner
    .insert(s.assessmentAttempts)
    .values({
      tenantId,
      assessmentId: exam!.id,
      userId: people.student,
      clientKey: randomUUID(),
      total: 1,
    })
    .returning();
  await owner
    .insert(s.attemptItems)
    .values({ tenantId, attemptId: attempt!.id, position: 1, questionId: mc!.id });
  return {
    planId,
    topicId: topic!.id,
    cardId: card!.id,
    guardianId: guardian!.id,
    examId: exam!.id,
  };
}
