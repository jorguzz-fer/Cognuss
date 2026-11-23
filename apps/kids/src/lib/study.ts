import 'server-only';
import { and, asc, eq, inArray, isNull, lte, schema, sql, type Tx } from '@gutta/db-kids';

// Leituras da área do aluno. Tudo passa pelo RLS: o aluno só recebe o plano publicado do ano
// dele, e só com o consentimento do responsável.

export async function studentConsented(tx: Tx, userId: string): Promise<boolean> {
  const r = await tx.execute<{ ok: boolean }>(sql`select app_student_consented(${userId}) as ok`);
  return Boolean(r.rows[0]?.ok);
}

export async function publishedPlans(tx: Tx) {
  return tx
    .select({
      id: schema.studyPlans.id,
      title: schema.studyPlans.title,
      subject: schema.subjects.name,
      helperTipsMd: schema.studyPlans.helperTipsMd,
    })
    .from(schema.studyPlans)
    .innerJoin(schema.subjects, eq(schema.subjects.id, schema.studyPlans.subjectId))
    .where(eq(schema.studyPlans.status, 'published'))
    .orderBy(asc(schema.subjects.name));
}

export async function planTopicsWithProgress(tx: Tx, planIds: string[], userId: string) {
  if (planIds.length === 0) return [];
  return tx
    .select({
      id: schema.planTopics.id,
      planId: schema.planTopics.planId,
      title: schema.planTopics.title,
      summary: schema.planTopics.summary,
      dayNumber: schema.planTopics.dayNumber,
      orderIndex: schema.planTopics.orderIndex,
      done: sql<boolean>`${schema.topicProgress.id} is not null`,
    })
    .from(schema.planTopics)
    .leftJoin(
      schema.topicProgress,
      and(
        eq(schema.topicProgress.topicId, schema.planTopics.id),
        eq(schema.topicProgress.userId, userId),
      ),
    )
    .where(inArray(schema.planTopics.planId, planIds))
    .orderBy(asc(schema.planTopics.orderIndex), asc(schema.planTopics.createdAt));
}

/**
 * Fila de revisão: cartões vencidos e, depois, cartões novos dos tópicos já estudados, até o
 * limite do dia. A ordem segue o plano.
 */
export async function reviewQueue(tx: Tx, userId: string, limit = 20) {
  const now = new Date();
  const due = await tx
    .select({
      id: schema.flashcards.id,
      front: schema.flashcards.front,
      back: schema.flashcards.back,
      repetitions: schema.flashcardSchedules.repetitions,
      intervalDays: schema.flashcardSchedules.intervalDays,
      ease: schema.flashcardSchedules.ease,
      lapses: schema.flashcardSchedules.lapses,
    })
    .from(schema.flashcardSchedules)
    .innerJoin(schema.flashcards, eq(schema.flashcards.id, schema.flashcardSchedules.flashcardId))
    .where(
      and(eq(schema.flashcardSchedules.userId, userId), lte(schema.flashcardSchedules.dueAt, now)),
    )
    .orderBy(asc(schema.flashcardSchedules.dueAt))
    .limit(limit);
  const fresh =
    due.length < limit
      ? await tx
          .select({
            id: schema.flashcards.id,
            front: schema.flashcards.front,
            back: schema.flashcards.back,
          })
          .from(schema.flashcards)
          .innerJoin(schema.planTopics, eq(schema.planTopics.id, schema.flashcards.topicId))
          .innerJoin(schema.studyPlans, eq(schema.studyPlans.id, schema.planTopics.planId))
          .innerJoin(
            schema.topicProgress,
            and(
              eq(schema.topicProgress.topicId, schema.planTopics.id),
              eq(schema.topicProgress.userId, userId),
            ),
          )
          .leftJoin(
            schema.flashcardSchedules,
            and(
              eq(schema.flashcardSchedules.flashcardId, schema.flashcards.id),
              eq(schema.flashcardSchedules.userId, userId),
            ),
          )
          .where(
            and(eq(schema.studyPlans.status, 'published'), isNull(schema.flashcardSchedules.id)),
          )
          .orderBy(asc(schema.planTopics.orderIndex), asc(schema.flashcards.orderIndex))
          .limit(limit - due.length)
      : [];
  return [
    ...due,
    ...fresh.map((c) => ({ ...c, repetitions: 0, intervalDays: 0, ease: 2.5, lapses: 0 })),
  ];
}
