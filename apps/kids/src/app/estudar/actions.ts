'use server';
import { NEW_CARD, schedule, type Rating } from '@gutta/core';
import { and, eq, schema, withTenantUser } from '@gutta/db-kids';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireTenant } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { formObject } from '@/lib/forms';

// Ações do aluno (PAI-01, CON-03, CON-04). O RLS só deixa gravar o próprio progresso, em plano
// que o aluno pode ler (publicado, do ano dele, com consentimento do responsável).

const TZ = 'America/Sao_Paulo';

/** Tópico estudado. Marcar de novo não duplica. */
export async function completeTopic(fd: FormData) {
  const ctx = await requireTenant(['student'], '/estudar');
  const p = z.object({ topicId: z.uuid(), next: z.string().optional() }).safeParse(formObject(fd));
  if (!p.success) redirect('/estudar');
  await withTenantUser(db(), ctx.tenantId, ctx.user.id, (tx) =>
    tx
      .insert(schema.topicProgress)
      .values({ tenantId: ctx.tenantId, topicId: p.data.topicId, userId: ctx.user.id })
      .onConflictDoNothing(),
  );
  revalidatePath('/estudar', 'layout');
  const next = p.data.next && /^\/estudar\//.test(p.data.next) ? p.data.next : '/estudar';
  redirect(next);
}

export type ReviewResult = { ok: true } | { ok: false };

/** Revisão espaçada (packages/core/srs): grava o próximo dia do cartão. */
export async function reviewCard(cardId: string, rating: Rating): Promise<ReviewResult> {
  const ctx = await requireTenant(['student'], '/estudar/revisar');
  if (!z.uuid().safeParse(cardId).success || ![0, 1, 2, 3].includes(rating)) return { ok: false };
  await withTenantUser(db(), ctx.tenantId, ctx.user.id, async (tx) => {
    const current = await tx.query.flashcardSchedules.findFirst({
      where: and(
        eq(schema.flashcardSchedules.flashcardId, cardId),
        eq(schema.flashcardSchedules.userId, ctx.user.id),
      ),
    });
    const now = new Date();
    const next = schedule(current ?? NEW_CARD, rating, now, TZ);
    const values = {
      repetitions: next.repetitions,
      intervalDays: next.intervalDays,
      ease: next.ease,
      lapses: next.lapses,
      dueAt: next.dueAt,
      lastReviewedAt: now,
    };
    if (current) {
      await tx
        .update(schema.flashcardSchedules)
        .set(values)
        .where(eq(schema.flashcardSchedules.id, current.id));
    } else {
      await tx.insert(schema.flashcardSchedules).values({
        tenantId: ctx.tenantId,
        flashcardId: cardId,
        userId: ctx.user.id,
        ...values,
      });
    }
  });
  return { ok: true };
}
