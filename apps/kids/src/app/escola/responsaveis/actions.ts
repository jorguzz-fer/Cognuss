'use server';
import {
  and,
  eq,
  GUARDIAN_POLICY_VERSION,
  guardianToken,
  linkGuardian,
  schema,
  withTenantUser,
} from '@gutta/db-kids';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireTenant } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { email, formObject } from '@/lib/forms';
import { logger } from '@/lib/logger';
import { mailer } from '@/lib/mail';
import { guardianEmail } from '@/lib/mail/templates';

// Responsáveis (RES-01, RES-02, RES-04, RES-05). Só a gestão. O e-mail sai depois do commit.

async function sendGuardianLink(
  to: string,
  tenantName: string,
  studentName: string,
  token: string,
) {
  const url = `${env().APP_URL}/responsavel/${token}`;
  await mailer()
    .send({ to, ...guardianEmail(tenantName, studentName, url) })
    .catch((err) => logger.error('kids.guardian_mail_failed', { err: String(err) }));
}

const linkForm = z.object({
  studentUserId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  email,
  back: z.string().regex(/^\/escola\/[a-z0-9/-]*$/),
});

/** RES-01 e RES-02: liga o responsável ao aluno e envia o link de autorização. */
export async function inviteGuardian(fd: FormData) {
  const ctx = await requireTenant(['manager']);
  const p = linkForm.safeParse(formObject(fd));
  if (!p.success) redirect('/escola/responsaveis?aviso=dados-invalidos');
  const f = p.data;
  const r = await withTenantUser(db(), ctx.tenantId, ctx.user.id, async (tx) => {
    const student = await tx
      .select({ name: schema.authUsers.name })
      .from(schema.memberships)
      .innerJoin(schema.authUsers, eq(schema.authUsers.id, schema.memberships.userId))
      .where(
        and(eq(schema.memberships.userId, f.studentUserId), eq(schema.memberships.role, 'student')),
      );
    if (!student[0]) return null;
    const link = await linkGuardian(tx, {
      tenantId: ctx.tenantId,
      studentUserId: f.studentUserId,
      name: f.name,
      email: f.email,
    });
    return { ...link, studentName: student[0].name };
  });
  if (!r) redirect(`${f.back}?aviso=dados-invalidos`);
  await sendGuardianLink(r.email, ctx.tenantName, r.studentName, r.token);
  revalidatePath(f.back);
  redirect(`${f.back}?aviso=responsavel-convidado`);
}

/** Novo link para um responsável (o anterior pode ter vencido). */
export async function resendGuardianLink(fd: FormData) {
  const ctx = await requireTenant(['manager'], '/escola/responsaveis');
  const p = z.object({ guardianId: z.uuid() }).safeParse(formObject(fd));
  if (!p.success) redirect('/escola/responsaveis?aviso=dados-invalidos');
  const r = await withTenantUser(db(), ctx.tenantId, ctx.user.id, async (tx) => {
    const g = await tx.query.guardians.findFirst({
      where: eq(schema.guardians.id, p.data.guardianId),
    });
    if (!g) return null;
    const kids = await tx
      .select({ name: schema.authUsers.name })
      .from(schema.guardianLinks)
      .innerJoin(schema.authUsers, eq(schema.authUsers.id, schema.guardianLinks.studentUserId))
      .where(eq(schema.guardianLinks.guardianId, g.id));
    const token = await guardianToken(tx, { tenantId: ctx.tenantId, guardianId: g.id });
    return { email: g.email, token, studentName: kids.map((k) => k.name).join(', ') };
  });
  if (!r) redirect('/escola/responsaveis?aviso=dados-invalidos');
  await sendGuardianLink(r.email, ctx.tenantName, r.studentName, r.token);
  redirect('/escola/responsaveis?aviso=responsavel-convidado');
}

/** RES-04: autorização coletada em papel, registrada por quem está logado. */
export async function recordPaperConsent(fd: FormData) {
  const ctx = await requireTenant(['manager'], '/escola/responsaveis');
  const p = z
    .object({
      link: z.string().regex(/^[0-9a-f-]{36}:.+$/),
      note: z.string().trim().min(3).max(500),
    })
    .safeParse(formObject(fd));
  if (!p.success) redirect('/escola/responsaveis?aviso=dados-invalidos');
  const [guardianId, studentUserId] = [p.data.link.slice(0, 36), p.data.link.slice(37)];
  await withTenantUser(db(), ctx.tenantId, ctx.user.id, async (tx) => {
    const linked = await tx.query.guardianLinks.findFirst({
      where: and(
        eq(schema.guardianLinks.guardianId, guardianId),
        eq(schema.guardianLinks.studentUserId, studentUserId),
      ),
    });
    if (!linked) redirect('/escola/responsaveis?aviso=dados-invalidos');
    await tx.insert(schema.guardianConsents).values({
      tenantId: ctx.tenantId,
      guardianId,
      studentUserId,
      purpose: 'platform',
      policyVersion: GUARDIAN_POLICY_VERSION,
      granted: true,
      source: 'paper',
      note: p.data.note,
      recordedBy: ctx.user.id,
    });
  });
  revalidatePath('/escola/responsaveis');
  redirect('/escola/responsaveis?aviso=papel-registrado');
}

/** RES-05: pedido do responsável atendido. */
export async function resolveRequest(fd: FormData) {
  const ctx = await requireTenant(['manager'], '/escola/responsaveis');
  const p = z.object({ requestId: z.uuid() }).safeParse(formObject(fd));
  if (!p.success) redirect('/escola/responsaveis?aviso=dados-invalidos');
  await withTenantUser(db(), ctx.tenantId, ctx.user.id, (tx) =>
    tx
      .update(schema.guardianRequests)
      .set({ status: 'done', resolvedBy: ctx.user.id, resolvedAt: new Date() })
      .where(eq(schema.guardianRequests.id, p.data.requestId)),
  );
  revalidatePath('/escola/responsaveis');
  redirect('/escola/responsaveis?aviso=pedido-resolvido');
}
