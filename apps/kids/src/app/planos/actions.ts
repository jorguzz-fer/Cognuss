'use server';
import {
  addConcept,
  and,
  asc,
  createPlan,
  eq,
  newPlanVersion,
  NEXT_STATUS,
  parseKeywordGroups,
  schema,
  transitionPlan,
  withTenantUser,
  type PlanStatus,
} from '@gutta/db-kids';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireTenant } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { formObject } from '@/lib/forms';
import { parseContent } from '@/lib/plan-content';

// Editor de planos (PLA, CON). Quem pode editar o quê é conferido pelo RLS e pelo gatilho
// editorial do banco: aqui só se valida a entrada e se escolhe a mensagem de volta.

const EDITORS = ['manager', 'teacher'] as const;
const uuid = z.uuid();

function pgCode(err: unknown): string | undefined {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code ?? e?.cause?.code;
}

const back = (planId: string, aviso: string): never => redirect(`/planos/${planId}?aviso=${aviso}`);

/** Roda a escrita no plano; recusa do banco vira aviso em vez de página de erro. */
async function onPlan(planId: string, okKey: string, fn: Parameters<typeof withTenantUser>[3]) {
  const ctx = await requireTenant([...EDITORS], `/planos/${planId}`);
  try {
    await withTenantUser(db(), ctx.tenantId, ctx.user.id, fn);
  } catch (err) {
    const code = pgCode(err);
    if (code === '42501') back(planId, 'plano-sem-permissao');
    if (code === '23514' || code === '22P02') back(planId, 'dados-invalidos');
    throw err;
  }
  revalidatePath(`/planos/${planId}`);
  back(planId, okKey);
}

const newPlanForm = z.object({
  pair: z.string().regex(/^[0-9a-f-]{36}:[0-9a-f-]{36}$/),
  title: z.string().trim().min(3).max(120),
  schoolYear: z.coerce.number().int().min(2020).max(2100),
});

/** PLA-01: novo plano em rascunho para um ano e uma matéria. */
export async function createPlanAction(fd: FormData) {
  const ctx = await requireTenant([...EDITORS], '/planos');
  const parsed = newPlanForm.safeParse(formObject(fd));
  if (!parsed.success) redirect('/planos?aviso=dados-invalidos');
  const [gradeId, subjectId] = parsed.data.pair.split(':') as [string, string];
  let id: string;
  try {
    id = await withTenantUser(db(), ctx.tenantId, ctx.user.id, (tx) =>
      createPlan(tx, {
        tenantId: ctx.tenantId,
        gradeId,
        subjectId,
        schoolYear: parsed.data.schoolYear,
        title: parsed.data.title,
        authorId: ctx.user.id,
      }),
    );
  } catch (err) {
    if (pgCode(err) === '42501') redirect('/planos?aviso=plano-sem-permissao');
    throw err;
  }
  redirect(`/planos/${id}?aviso=plano-criado`);
}

const detailsForm = z.object({
  planId: uuid,
  title: z.string().trim().min(3).max(120),
  periodLabel: z.string().trim().max(60),
  helperTipsMd: z.string().trim().max(4000),
});

/** Título, período e "Dicas para quem ajuda" (PLA-04). */
export async function savePlanDetails(fd: FormData) {
  const p = detailsForm.safeParse(formObject(fd));
  if (!p.success) redirect('/planos?aviso=dados-invalidos');
  const f = p.data;
  await onPlan(f.planId, 'plano-salvo', (tx) =>
    tx
      .update(schema.studyPlans)
      .set({
        title: f.title,
        periodLabel: f.periodLabel || null,
        helperTipsMd: f.helperTipsMd || null,
      })
      .where(eq(schema.studyPlans.id, f.planId)),
  );
}

const transitionForm = z.object({
  planId: uuid,
  to: z.enum(['draft', 'in_review', 'approved', 'published', 'archived']),
  note: z.string().trim().max(1000).optional(),
});

/** PLA-05: enviar para revisão, aprovar, devolver, publicar, arquivar. */
export async function transitionAction(fd: FormData) {
  const p = transitionForm.safeParse(formObject(fd));
  if (!p.success) redirect('/planos?aviso=dados-invalidos');
  const { planId, to, note } = p.data;
  await onPlan(planId, `plano-${to}`, async (tx) => {
    const plan = await tx.query.studyPlans.findFirst({ where: eq(schema.studyPlans.id, planId) });
    if (!plan || !NEXT_STATUS[plan.status as PlanStatus].includes(to))
      back(planId, 'dados-invalidos');
    await transitionPlan(tx, { planId, to, note: to === 'draft' ? (note ?? null) : undefined });
  });
}

/** PLA-05: nova versão em rascunho a partir do plano (publicado, por exemplo). */
export async function newVersionAction(fd: FormData) {
  const ctx = await requireTenant([...EDITORS], '/planos');
  const p = z.object({ planId: uuid }).safeParse(formObject(fd));
  if (!p.success) redirect('/planos?aviso=dados-invalidos');
  let id: string;
  try {
    id = await withTenantUser(db(), ctx.tenantId, ctx.user.id, (tx) =>
      newPlanVersion(tx, { planId: p.data.planId, authorId: ctx.user.id }),
    );
  } catch (err) {
    if (pgCode(err) === '42501') back(p.data.planId, 'plano-sem-permissao');
    throw err;
  }
  redirect(`/planos/${id}?aviso=versao-criada`);
}

export async function deleteDraftAction(fd: FormData) {
  const ctx = await requireTenant([...EDITORS], '/planos');
  const p = z.object({ planId: uuid }).safeParse(formObject(fd));
  if (!p.success) redirect('/planos?aviso=dados-invalidos');
  await withTenantUser(db(), ctx.tenantId, ctx.user.id, (tx) =>
    tx
      .delete(schema.studyPlans)
      .where(and(eq(schema.studyPlans.id, p.data.planId), eq(schema.studyPlans.status, 'draft'))),
  );
  revalidatePath('/planos');
  redirect('/planos?aviso=plano-apagado');
}

const topicForm = z.object({
  planId: uuid,
  title: z.string().trim().min(2).max(120),
  dayNumber: z.union([z.literal(''), z.coerce.number().int().min(1).max(366)]),
  summary: z.string().trim().max(500),
});

/** PLA-02 e PLA-03: novo tópico, no fim da lista. */
export async function addTopic(fd: FormData) {
  const p = topicForm.safeParse(formObject(fd));
  if (!p.success) redirect('/planos?aviso=dados-invalidos');
  const f = p.data;
  await onPlan(f.planId, 'topico-salvo', async (tx) => {
    const last = await tx
      .select({ o: schema.planTopics.orderIndex })
      .from(schema.planTopics)
      .where(eq(schema.planTopics.planId, f.planId))
      .orderBy(asc(schema.planTopics.orderIndex));
    await tx.insert(schema.planTopics).values({
      tenantId: (await tx.query.studyPlans.findFirst({
        where: eq(schema.studyPlans.id, f.planId),
      }))!.tenantId,
      planId: f.planId,
      title: f.title,
      dayNumber: f.dayNumber === '' ? null : f.dayNumber,
      summary: f.summary || null,
      orderIndex: (last.at(-1)?.o ?? -1) + 1,
    });
  });
}

export async function updateTopic(fd: FormData) {
  const p = topicForm.extend({ topicId: uuid }).safeParse(formObject(fd));
  if (!p.success) redirect('/planos?aviso=dados-invalidos');
  const f = p.data;
  await onPlan(f.planId, 'topico-salvo', (tx) =>
    tx
      .update(schema.planTopics)
      .set({
        title: f.title,
        dayNumber: f.dayNumber === '' ? null : f.dayNumber,
        summary: f.summary || null,
      })
      .where(and(eq(schema.planTopics.id, f.topicId), eq(schema.planTopics.planId, f.planId))),
  );
}

/** Sobe ou desce um tópico trocando a ordem com o vizinho. */
export async function moveTopic(fd: FormData) {
  const p = z
    .object({ planId: uuid, topicId: uuid, dir: z.enum(['up', 'down']) })
    .safeParse(formObject(fd));
  if (!p.success) redirect('/planos?aviso=dados-invalidos');
  const f = p.data;
  await onPlan(f.planId, 'topico-salvo', async (tx) => {
    const topics = await tx
      .select({ id: schema.planTopics.id })
      .from(schema.planTopics)
      .where(eq(schema.planTopics.planId, f.planId))
      .orderBy(asc(schema.planTopics.orderIndex), asc(schema.planTopics.createdAt));
    const i = topics.findIndex((t) => t.id === f.topicId);
    const j = f.dir === 'up' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= topics.length) return;
    [topics[i], topics[j]] = [topics[j]!, topics[i]!];
    for (const [k, t] of topics.entries()) {
      await tx
        .update(schema.planTopics)
        .set({ orderIndex: k })
        .where(eq(schema.planTopics.id, t.id));
    }
  });
}

export async function deleteTopic(fd: FormData) {
  const p = z.object({ planId: uuid, topicId: uuid }).safeParse(formObject(fd));
  if (!p.success) redirect('/planos?aviso=dados-invalidos');
  await onPlan(p.data.planId, 'topico-apagado', (tx) =>
    tx.delete(schema.planTopics).where(eq(schema.planTopics.id, p.data.topicId)),
  );
}

const contentForm = z.object({
  planId: uuid,
  topicId: uuid,
  kind: z.enum(['text', 'video', 'table', 'timeline']),
  title: z.string().trim().max(120),
  body: z.string().trim().min(1).max(8000),
});

/** CON-01: texto (Markdown), vídeo (link https), tabela ou linha do tempo. */
export async function addContent(fd: FormData) {
  const p = contentForm.safeParse(formObject(fd));
  if (!p.success) redirect('/planos?aviso=dados-invalidos');
  const f = p.data;
  const content = parseContent(f.kind, f.body);
  if (!content) back(f.planId, 'conteudo-invalido');
  await onPlan(f.planId, 'conteudo-salvo', async (tx) => {
    const topic = await tx.query.planTopics.findFirst({
      where: and(eq(schema.planTopics.id, f.topicId), eq(schema.planTopics.planId, f.planId)),
    });
    if (!topic) back(f.planId, 'dados-invalidos');
    const count = await tx
      .select({ id: schema.topicContents.id })
      .from(schema.topicContents)
      .where(eq(schema.topicContents.topicId, f.topicId));
    await tx.insert(schema.topicContents).values({
      tenantId: topic!.tenantId,
      topicId: f.topicId,
      kind: f.kind,
      title: f.title || null,
      orderIndex: count.length,
      ...content!,
    });
  });
}

export async function deleteContent(fd: FormData) {
  const p = z.object({ planId: uuid, contentId: uuid }).safeParse(formObject(fd));
  if (!p.success) redirect('/planos?aviso=dados-invalidos');
  await onPlan(p.data.planId, 'conteudo-apagado', (tx) =>
    tx.delete(schema.topicContents).where(eq(schema.topicContents.id, p.data.contentId)),
  );
}

/** CON-03: flashcards em lote, um por linha, "frente | verso". */
export async function addFlashcards(fd: FormData) {
  const p = z
    .object({ planId: uuid, topicId: uuid, lines: z.string().trim().min(3).max(20_000) })
    .safeParse(formObject(fd));
  if (!p.success) redirect('/planos?aviso=dados-invalidos');
  const f = p.data;
  const cards = f.lines
    .split(/\r?\n/)
    .map((l) => l.split('|').map((x) => x.trim()))
    .filter(([front, back]) => front && back)
    .map(([front, back]) => ({ front: front!.slice(0, 300), back: back!.slice(0, 600) }));
  if (cards.length === 0) back(f.planId, 'flashcards-invalidos');
  await onPlan(f.planId, 'flashcards-salvos', async (tx) => {
    const topic = await tx.query.planTopics.findFirst({
      where: and(eq(schema.planTopics.id, f.topicId), eq(schema.planTopics.planId, f.planId)),
    });
    if (!topic) back(f.planId, 'dados-invalidos');
    const existing = await tx
      .select({ id: schema.flashcards.id })
      .from(schema.flashcards)
      .where(eq(schema.flashcards.topicId, f.topicId));
    await tx.insert(schema.flashcards).values(
      cards.map((c, i) => ({
        tenantId: topic!.tenantId,
        topicId: f.topicId,
        orderIndex: existing.length + i,
        ...c,
      })),
    );
  });
}

export async function deleteFlashcard(fd: FormData) {
  const p = z.object({ planId: uuid, cardId: uuid }).safeParse(formObject(fd));
  if (!p.success) redirect('/planos?aviso=dados-invalidos');
  await onPlan(p.data.planId, 'flashcard-apagado', (tx) =>
    tx.delete(schema.flashcards).where(eq(schema.flashcards.id, p.data.cardId)),
  );
}

// ── Questões e avaliações (Fase 3: AVA-01, AVA-03, AVA-04) ─────────────────

const conceptForm = z.object({
  planId: uuid,
  topicId: uuid,
  explanation: z.string().trim().max(600),
  mcStem: z.string().trim().max(500),
  mcOptions: z.string().trim().max(2000),
  tfStem: z.string().trim().max(500),
  tfValue: z.enum(['true', 'false']),
  saStem: z.string().trim().max(500),
  saKeywords: z.string().trim().max(500),
  saMin: z.coerce.number().int().min(1).max(10),
  saModel: z.string().trim().max(600),
});

/**
 * AVA-01: um conceito em até três formatos. Alternativas: uma por linha, a certa começa com
 * "*". Escrita: grupos de palavras-chave separados por ";", radicais alternativos por "/".
 */
export async function addConceptAction(fd: FormData) {
  const p = conceptForm.safeParse(formObject(fd));
  if (!p.success) redirect('/planos?aviso=dados-invalidos');
  const f = p.data;
  const lines = f.mcOptions
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const correct = lines.findIndex((l) => l.startsWith('*'));
  const mc =
    f.mcStem && lines.length
      ? lines.length >= 2 &&
        lines.length <= 5 &&
        correct >= 0 &&
        lines.filter((l) => l.startsWith('*')).length === 1
        ? { stem: f.mcStem, options: lines.map((l) => l.replace(/^\*\s*/, '')), correct }
        : 'invalid'
      : null;
  const groups = parseKeywordGroups(f.saKeywords);
  const sa = f.saStem
    ? groups.length && f.saMin <= groups.length
      ? { stem: f.saStem, groups, min: f.saMin, modelAnswer: f.saModel || null }
      : 'invalid'
    : null;
  const tf = f.tfStem ? { stem: f.tfStem, value: f.tfValue === 'true' } : null;
  if (mc === 'invalid' || sa === 'invalid' || (!mc && !tf && !sa))
    back(f.planId, 'questao-invalida');
  await onPlan(f.planId, 'questao-salva', async (tx) => {
    const topic = await tx.query.planTopics.findFirst({
      where: and(eq(schema.planTopics.id, f.topicId), eq(schema.planTopics.planId, f.planId)),
    });
    if (!topic) back(f.planId, 'dados-invalidos');
    await addConcept(tx, {
      tenantId: topic!.tenantId,
      topicId: f.topicId,
      explanation: f.explanation || null,
      multipleChoice: mc && mc !== 'invalid' ? mc : null,
      trueFalse: tf,
      shortAnswer: sa && sa !== 'invalid' ? sa : null,
    });
  });
}

export async function deleteConceptAction(fd: FormData) {
  const p = z.object({ planId: uuid, groupId: uuid }).safeParse(formObject(fd));
  if (!p.success) redirect('/planos?aviso=dados-invalidos');
  await onPlan(p.data.planId, 'questao-apagada', (tx) =>
    tx.delete(schema.questions).where(eq(schema.questions.groupId, p.data.groupId)),
  );
}

const assessmentForm = z.object({
  planId: uuid,
  kind: z.enum(['practice', 'exam']),
  title: z.string().trim().min(3).max(120),
  questionCount: z.coerce.number().int().min(1).max(40),
  passingScore: z.coerce.number().min(0).max(10),
  maxAttempts: z.union([z.literal(''), z.coerce.number().int().min(1).max(10)]),
  opensAt: z.union([z.literal(''), z.iso.date()]),
  closesAt: z.union([z.literal(''), z.iso.date()]),
});

/** Datas do formulário são dias no fuso da escola (início às 00:00, fim às 23:59). */
function dayStart(d: string) {
  return new Date(`${d}T00:00:00-03:00`);
}
function dayEnd(d: string) {
  return new Date(`${d}T23:59:59-03:00`);
}

/** AVA-03 e AVA-04: simulado (treino) ou prova (nota mínima, tentativas, prazo). */
export async function createAssessmentAction(fd: FormData) {
  const ctx = await requireTenant([...EDITORS], '/planos');
  const p = assessmentForm.safeParse(formObject(fd));
  if (!p.success) redirect('/planos?aviso=dados-invalidos');
  const f = p.data;
  await onPlan(f.planId, 'avaliacao-criada', (tx) =>
    tx.insert(schema.assessments).values({
      tenantId: ctx.tenantId,
      planId: f.planId,
      kind: f.kind,
      title: f.title,
      questionCount: f.questionCount,
      passingScore: f.passingScore.toFixed(1),
      maxAttempts: f.kind === 'exam' ? (f.maxAttempts === '' ? 1 : f.maxAttempts) : null,
      opensAt: f.opensAt ? dayStart(f.opensAt) : null,
      closesAt: f.closesAt ? dayEnd(f.closesAt) : null,
      createdBy: ctx.user.id,
    }),
  );
}

export async function deleteAssessmentAction(fd: FormData) {
  const p = z.object({ planId: uuid, assessmentId: uuid }).safeParse(formObject(fd));
  if (!p.success) redirect('/planos?aviso=dados-invalidos');
  await onPlan(p.data.planId, 'avaliacao-apagada', async (tx) => {
    // Com tentativa de aluno, não apaga: o histórico (AVA-08) fica.
    const used = await tx
      .select({ id: schema.assessmentAttempts.id })
      .from(schema.assessmentAttempts)
      .where(eq(schema.assessmentAttempts.assessmentId, p.data.assessmentId))
      .limit(1);
    if (used.length) back(p.data.planId, 'avaliacao-com-tentativas');
    await tx.delete(schema.assessments).where(eq(schema.assessments.id, p.data.assessmentId));
  });
}
