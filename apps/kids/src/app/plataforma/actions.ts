'use server';
import { eq, schema, withPlatformAdmin } from '@gutta/db-kids';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requirePlatformAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { email, formObject, isUniqueViolation, tenantForm } from '@/lib/forms';
import { createInvitation, sendInvitation } from '@/lib/invitations';
import { logger } from '@/lib/logger';

/** INS-01 e INS-03: cadastra a instituição e convida o primeiro gestor. */
export async function createTenant(fd: FormData) {
  const user = await requirePlatformAdmin('/plataforma/nova');
  const parsed = tenantForm.safeParse(formObject(fd));
  if (!parsed.success) redirect('/plataforma/nova?aviso=dados-invalidos');
  const f = parsed.data;
  let tenantId: string;
  try {
    tenantId = await withPlatformAdmin(
      db(),
      { userId: user.id, tenantId: null, reason: 'cadastrar instituição' },
      async (tx) => {
        const [t] = await tx
          .insert(schema.tenants)
          .values({
            name: f.name,
            slug: f.slug,
            city: f.city,
            state: f.state,
            kind: f.kind,
            cnpj: f.cnpj || null,
          })
          .returning({ id: schema.tenants.id });
        return t!.id;
      },
    );
  } catch (err) {
    if (isUniqueViolation(err)) redirect('/plataforma/nova?aviso=slug-usado');
    throw err;
  }
  const token = await withPlatformAdmin(
    db(),
    { userId: user.id, tenantId, reason: 'convidar o primeiro gestor' },
    (tx) =>
      createInvitation(tx, {
        tenantId,
        email: f.managerEmail,
        role: 'manager',
        invitedBy: user.id,
      }),
  );
  await sendInvitation(f.managerEmail, f.name, 'manager', token).catch((err) =>
    logger.error('kids.invite_mail_failed', { tenantId, err: String(err) }),
  );
  revalidatePath('/plataforma');
  redirect(`/plataforma/${tenantId}?aviso=escola-criada`);
}

const statusForm = z.object({
  tenantId: z.uuid(),
  status: z.enum(['active', 'suspended']),
});

/** INS-02: suspender bloqueia o acesso dos membros e preserva os dados. */
export async function setTenantStatus(fd: FormData) {
  const user = await requirePlatformAdmin();
  const parsed = statusForm.safeParse(formObject(fd));
  if (!parsed.success) redirect('/plataforma?aviso=dados-invalidos');
  const { tenantId, status } = parsed.data;
  await withPlatformAdmin(
    db(),
    {
      userId: user.id,
      tenantId,
      reason: status === 'suspended' ? 'suspender instituição' : 'reativar instituição',
    },
    (tx) => tx.update(schema.tenants).set({ status }).where(eq(schema.tenants.id, tenantId)),
  );
  revalidatePath(`/plataforma/${tenantId}`);
  redirect(`/plataforma/${tenantId}?aviso=status-alterado`);
}

const managerInvite = z.object({ tenantId: z.uuid(), email });

/** Novo convite de gestor (por exemplo, quando o primeiro venceu). */
export async function inviteManager(fd: FormData) {
  const user = await requirePlatformAdmin();
  const parsed = managerInvite.safeParse(formObject(fd));
  if (!parsed.success) redirect(`/plataforma?aviso=dados-invalidos`);
  const { tenantId, email: to } = parsed.data;
  const { token, name } = await withPlatformAdmin(
    db(),
    { userId: user.id, tenantId, reason: 'convidar gestor' },
    async (tx) => {
      const t = await tx.query.tenants.findFirst({ where: eq(schema.tenants.id, tenantId) });
      const token = await createInvitation(tx, {
        tenantId,
        email: to,
        role: 'manager',
        invitedBy: user.id,
      });
      return { token, name: t!.name };
    },
  );
  await sendInvitation(to, name, 'manager', token).catch((err) =>
    logger.error('kids.invite_mail_failed', { tenantId, err: String(err) }),
  );
  redirect(`/plataforma/${tenantId}?aviso=convite-enviado`);
}
