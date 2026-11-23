import 'server-only';
import { INVITE_TTL_MS, newInviteToken, schema, type Tx } from '@gutta/db-kids';
import { env } from './env';
import { mailer } from './mail';
import { inviteEmail } from './mail/templates';

/**
 * Cria o convite (USR-01, INS-03) dentro da transação de quem convida: o RLS confere se é o
 * gestor da escola ou o Super Admin. Devolve o token, que só existe no link do e-mail.
 */
export async function createInvitation(
  tx: Tx,
  input: { tenantId: string; email: string; role: 'manager' | 'teacher'; invitedBy: string },
) {
  const { token, hash } = newInviteToken();
  await tx.insert(schema.invitations).values({
    tenantId: input.tenantId,
    email: input.email.trim().toLowerCase(),
    role: input.role,
    tokenHash: hash,
    invitedBy: input.invitedBy,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });
  await tx.insert(schema.auditLogs).values({
    tenantId: input.tenantId,
    actorId: input.invitedBy,
    action: 'invitation.created',
    entityType: 'invitation',
    metadata: { role: input.role },
  });
  return token;
}

/** Envia o e-mail depois do commit: se o envio falhar, o convite continua válido. */
export async function sendInvitation(
  email: string,
  tenantName: string,
  role: 'manager' | 'teacher',
  token: string,
) {
  const url = `${env().APP_URL}/convite/${token}`;
  await mailer().send({ to: email, ...inviteEmail(tenantName, role, url) });
}
