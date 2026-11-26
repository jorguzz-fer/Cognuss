'use server';
import { sql, withTenantUser } from '@gutta/db-kids';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireTenant } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { formObject } from '@/lib/forms';

// Ações do aluno nas avaliações. Sortear, corrigir e dar a nota é do banco (attempt_*): aqui só
// se valida a entrada (AVA-02, AVA-07).

function pgCode(err: unknown) {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code ?? e?.cause?.code;
}

/** Começa (ou retoma, pela mesma chave) a tentativa. A chave nasce no formulário. */
export async function startAttempt(fd: FormData) {
  const ctx = await requireTenant(['student'], '/estudar');
  const p = z
    .object({
      assessmentId: z.uuid(),
      key: z.string().min(8).max(100),
      retakeOf: z.union([z.literal(''), z.uuid()]),
    })
    .safeParse(formObject(fd));
  if (!p.success) redirect('/estudar');
  const { assessmentId, key, retakeOf } = p.data;
  let id: string;
  try {
    id = await withTenantUser(db(), ctx.tenantId, ctx.user.id, async (tx) => {
      const r = await tx.execute<{ id: string }>(
        sql`select attempt_start(${assessmentId}, ${key}, ${retakeOf || null}) as id`,
      );
      return r.rows[0]!.id;
    });
  } catch (err) {
    const code = pgCode(err);
    if (code === '22023' || code === '42501')
      redirect(`/estudar/avaliacoes/${assessmentId}?aviso=indisponivel`);
    throw err;
  }
  redirect(`/estudar/tentativas/${id}`);
}

const answerSchema = z.union([
  z.object({ choice: z.number().int().min(0).max(9) }),
  z.object({ value: z.boolean() }),
  z.object({ text: z.string().max(2000) }),
]);

export type AnswerFeedback = {
  ok: boolean;
  correct?: boolean;
  explanation?: string | null;
  model_answer?: string | null;
  key?: { correct?: number; value?: boolean } | null;
};

/** Grava a resposta. No simulado, volta a correção e a explicação (AVA-03). */
export async function answerQuestion(
  attemptId: string,
  pos: number,
  answer: unknown,
): Promise<AnswerFeedback> {
  const ctx = await requireTenant(['student'], '/estudar');
  const a = answerSchema.safeParse(answer);
  if (!z.uuid().safeParse(attemptId).success || !Number.isInteger(pos) || !a.success)
    return { ok: false };
  try {
    const r = await withTenantUser(db(), ctx.tenantId, ctx.user.id, (tx) =>
      tx.execute<{ r: Omit<AnswerFeedback, 'ok'> }>(
        sql`select attempt_answer(${attemptId}, ${pos}, ${JSON.stringify(a.data)}::jsonb) as r`,
      ),
    );
    return { ok: true, ...r.rows[0]!.r };
  } catch (err) {
    if (pgCode(err) === '22023' || pgCode(err) === '42501') return { ok: false };
    throw err;
  }
}

/** Envia a tentativa e mostra o resultado (AVA-04). */
export async function submitAttempt(attemptId: string) {
  const ctx = await requireTenant(['student'], '/estudar');
  if (!z.uuid().safeParse(attemptId).success) redirect('/estudar');
  await withTenantUser(db(), ctx.tenantId, ctx.user.id, (tx) =>
    tx.execute(sql`select attempt_submit(${attemptId})`),
  );
  revalidatePath(`/estudar/tentativas/${attemptId}`);
  redirect(`/estudar/tentativas/${attemptId}`);
}
