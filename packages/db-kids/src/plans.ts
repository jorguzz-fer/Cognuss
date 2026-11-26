import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, inArray, ne } from 'drizzle-orm';
import type { Tx } from './client';
import * as s from './schema';
import { newInviteToken } from './school';

// Regras da Fase 2 (SPEC Kids: PLA-01 a PLA-05, RES-01 a RES-02). Rodam dentro de
// withTenantUser: o RLS e o gatilho editorial do banco conferem quem pode o quê.

export type PlanStatus = (typeof s.planStatus.enumValues)[number];

export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
  draft: 'Rascunho',
  in_review: 'Em revisão',
  approved: 'Aprovado',
  published: 'Publicado',
  archived: 'Arquivado',
};

/** Próximos status possíveis, na mesma regra do gatilho enforce_plan_transition. */
export const NEXT_STATUS: Record<PlanStatus, PlanStatus[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'draft'],
  approved: ['published', 'draft'],
  published: ['archived'],
  archived: ['published', 'draft'],
};

export async function createPlan(
  tx: Tx,
  input: {
    tenantId: string;
    gradeId: string;
    subjectId: string;
    schoolYear: number;
    title: string;
    authorId: string;
  },
) {
  const id = randomUUID();
  await tx.insert(s.studyPlans).values({ id, rootId: id, version: 1, ...input });
  return id;
}

/**
 * Muda o status. Ao publicar, a versão publicada anterior do mesmo plano é arquivada, para o
 * aluno ver uma versão só (PLA-05).
 */
export async function transitionPlan(
  tx: Tx,
  input: { planId: string; to: PlanStatus; note?: string | null },
) {
  const plan = await tx.query.studyPlans.findFirst({ where: eq(s.studyPlans.id, input.planId) });
  if (!plan) throw new Error('plano não encontrado');
  if (input.to === 'published') {
    const previous = await tx
      .update(s.studyPlans)
      .set({ status: 'archived' })
      .where(
        and(
          eq(s.studyPlans.rootId, plan.rootId),
          eq(s.studyPlans.status, 'published'),
          ne(s.studyPlans.id, plan.id),
        ),
      )
      .returning({ id: s.studyPlans.id });
    // Simulados e provas seguem para a versão publicada (as tentativas antigas ficam como estão).
    if (previous.length) {
      await tx
        .update(s.assessments)
        .set({ planId: plan.id })
        .where(
          inArray(
            s.assessments.planId,
            previous.map((p) => p.id),
          ),
        );
    }
  }
  await tx
    .update(s.studyPlans)
    .set({ status: input.to, ...(input.note !== undefined ? { reviewNote: input.note } : {}) })
    .where(eq(s.studyPlans.id, input.planId));
}

/**
 * Nova versão em rascunho a partir de um plano (PLA-05): copia tópicos, conteúdos,
 * flashcards e questões. O original continua como está (publicado, por exemplo) até a nova sair.
 */
export async function newPlanVersion(tx: Tx, input: { planId: string; authorId: string }) {
  const plan = await tx.query.studyPlans.findFirst({ where: eq(s.studyPlans.id, input.planId) });
  if (!plan) throw new Error('plano não encontrado');
  const last = await tx
    .select({ version: s.studyPlans.version })
    .from(s.studyPlans)
    .where(eq(s.studyPlans.rootId, plan.rootId))
    .orderBy(desc(s.studyPlans.version))
    .limit(1);
  const id = randomUUID();
  await tx.insert(s.studyPlans).values({
    id,
    tenantId: plan.tenantId,
    gradeId: plan.gradeId,
    subjectId: plan.subjectId,
    schoolYear: plan.schoolYear,
    title: plan.title,
    periodLabel: plan.periodLabel,
    helperTipsMd: plan.helperTipsMd,
    rootId: plan.rootId,
    version: (last[0]?.version ?? plan.version) + 1,
    authorId: input.authorId,
  });
  const topics = await tx
    .select()
    .from(s.planTopics)
    .where(eq(s.planTopics.planId, plan.id))
    .orderBy(asc(s.planTopics.orderIndex));
  const idMap = new Map<string, string>();
  for (const t of topics) idMap.set(t.id, randomUUID());
  // Pais antes dos filhos (parent_id aponta para um tópico já copiado).
  const ordered = [...topics.filter((t) => !t.parentId), ...topics.filter((t) => t.parentId)];
  for (const t of ordered) {
    await tx.insert(s.planTopics).values({
      id: idMap.get(t.id)!,
      tenantId: t.tenantId,
      planId: id,
      parentId: t.parentId ? (idMap.get(t.parentId) ?? null) : null,
      title: t.title,
      summary: t.summary,
      orderIndex: t.orderIndex,
      dayNumber: t.dayNumber,
    });
  }
  if (topics.length) {
    const oldIds = topics.map((t) => t.id);
    const contents = await tx
      .select()
      .from(s.topicContents)
      .where(inArray(s.topicContents.topicId, oldIds));
    for (const c of contents) {
      await tx.insert(s.topicContents).values({
        tenantId: c.tenantId,
        topicId: idMap.get(c.topicId)!,
        kind: c.kind,
        title: c.title,
        bodyMd: c.bodyMd,
        url: c.url,
        data: c.data,
        orderIndex: c.orderIndex,
      });
    }
    const cards = await tx.select().from(s.flashcards).where(inArray(s.flashcards.topicId, oldIds));
    for (const c of cards) {
      await tx.insert(s.flashcards).values({
        tenantId: c.tenantId,
        topicId: idMap.get(c.topicId)!,
        front: c.front,
        back: c.back,
        orderIndex: c.orderIndex,
      });
    }
    // Questões: cada conceito (group_id) ganha um id novo, comum aos formatos dele.
    const qs = await tx.select().from(s.questions).where(inArray(s.questions.topicId, oldIds));
    const groupMap = new Map<string, string>();
    for (const q of qs) {
      if (!groupMap.has(q.groupId)) groupMap.set(q.groupId, randomUUID());
      await tx.insert(s.questions).values({
        tenantId: q.tenantId,
        topicId: idMap.get(q.topicId)!,
        groupId: groupMap.get(q.groupId)!,
        kind: q.kind,
        stem: q.stem,
        options: q.options,
        answer: q.answer,
        modelAnswer: q.modelAnswer,
        explanation: q.explanation,
        orderIndex: q.orderIndex,
      });
    }
  }
  return id;
}

export const GUARDIAN_LINK_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Versão do texto que o responsável aceita. Muda junto com o texto da página. */
export const GUARDIAN_POLICY_VERSION = 'kids-2026-11-v1';

/**
 * Liga um responsável ao aluno (RES-01) e gera o link de acesso dele (válido por 30 dias).
 * Reaproveita o responsável se o e-mail já existir na escola.
 */
export async function linkGuardian(
  tx: Tx,
  input: { tenantId: string; studentUserId: string; name: string; email: string },
) {
  const email = input.email.trim().toLowerCase();
  let guardian = await tx.query.guardians.findFirst({ where: eq(s.guardians.email, email) });
  if (!guardian) {
    [guardian] = await tx
      .insert(s.guardians)
      .values({ tenantId: input.tenantId, name: input.name.trim(), email })
      .returning();
  }
  await tx
    .insert(s.guardianLinks)
    .values({
      tenantId: input.tenantId,
      guardianId: guardian!.id,
      studentUserId: input.studentUserId,
    })
    .onConflictDoNothing();
  const token = await guardianToken(tx, { tenantId: input.tenantId, guardianId: guardian!.id });
  return { guardianId: guardian!.id, email, token };
}

export async function guardianToken(tx: Tx, input: { tenantId: string; guardianId: string }) {
  const { token, hash } = newInviteToken();
  await tx.insert(s.guardianAccessTokens).values({
    tenantId: input.tenantId,
    guardianId: input.guardianId,
    tokenHash: hash,
    expiresAt: new Date(Date.now() + GUARDIAN_LINK_TTL_MS),
  });
  return token;
}
