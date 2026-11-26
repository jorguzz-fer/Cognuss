'use server';
import { GUARDIAN_POLICY_VERSION, hashToken, sql, withAnonymous } from '@gutta/db-kids';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/lib/db';
import { formObject } from '@/lib/forms';

// Ações do responsável (RES-02, RES-05). Sem login: o token do link é a credencial, e o banco
// confere validade e vínculo com o aluno (guardian_record_consent, guardian_open_request).

const TOKEN = /^[A-Za-z0-9_-]{20,100}$/;

function pgCode(err: unknown) {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code ?? e?.cause?.code;
}

/** O IP não é guardado: só um resumo dele, para a prova do consentimento. */
async function ipHash() {
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || '';
  return ip ? hashToken(`ip:${ip}`) : null;
}

export async function decideConsent(fd: FormData) {
  const p = z
    .object({
      token: z.string().regex(TOKEN),
      studentId: z.string().min(1),
      granted: z.enum(['true', 'false']),
    })
    .safeParse(formObject(fd));
  if (!p.success) redirect('/');
  const { token, studentId, granted } = p.data;
  const ip = await ipHash();
  try {
    await withAnonymous(db(), (tx) =>
      tx.execute(
        sql`select guardian_record_consent(${hashToken(token)}, ${studentId}, ${granted === 'true'}, ${GUARDIAN_POLICY_VERSION}, ${ip})`,
      ),
    );
  } catch (err) {
    if (pgCode(err) === '42501') redirect(`/responsavel/${token}?aviso=link`);
    throw err;
  }
  redirect(`/responsavel/${token}?aviso=${granted === 'true' ? 'autorizado' : 'retirado'}`);
}

export async function openRequest(fd: FormData) {
  const p = z
    .object({
      token: z.string().regex(TOKEN),
      studentId: z.string().min(1),
      kind: z.enum(['access', 'correction', 'export', 'deletion']),
      details: z.string().trim().max(2000),
    })
    .safeParse(formObject(fd));
  if (!p.success) redirect('/');
  const { token, studentId, kind, details } = p.data;
  try {
    await withAnonymous(db(), (tx) =>
      tx.execute(
        sql`select guardian_open_request(${hashToken(token)}, ${studentId}, ${kind}::guardian_request_kind, ${details})`,
      ),
    );
  } catch (err) {
    if (pgCode(err) === '42501') redirect(`/responsavel/${token}?aviso=link`);
    throw err;
  }
  redirect(`/responsavel/${token}?aviso=pedido`);
}
