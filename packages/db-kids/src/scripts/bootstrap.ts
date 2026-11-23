import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import type { Db } from '../client';
import * as s from '../schema';

/** Lista de e-mails separados por vírgula, normalizados. */
export function parseEmails(raw: string | undefined): string[] {
  return [
    ...new Set(
      (raw ?? '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.includes('@')),
    ),
  ];
}

/**
 * Super Admin inicial (KIDS_BOOTSTRAP_ADMIN_EMAILS). O Kids não tem cadastro aberto (as contas
 * entram por convite), então o primeiro Super Admin nasce aqui: se o e-mail ainda não tem conta,
 * ela é criada sem senha, e a pessoa define a senha em "Esqueci minha senha" (o link do e-mail
 * prova que o endereço é dela). Conta que já existe e confirmou o e-mail ganha o papel. Roda como
 * dono do banco no start. Nunca remove papel. Devolve só ids, nunca e-mails (PII fora do log).
 */
export async function bootstrapPlatformAdmins(owner: Db, emails: string[]) {
  if (emails.length === 0) return { granted: [] as string[], created: [] as string[] };
  const users = await owner
    .select({ id: s.authUsers.id, email: s.authUsers.email, verified: s.authUsers.emailVerified })
    .from(s.authUsers)
    .where(inArray(s.authUsers.email, emails));
  const created: string[] = [];
  for (const email of emails) {
    if (users.some((u) => u.email === email)) continue;
    const id = randomUUID();
    await owner.insert(s.authUsers).values({
      id,
      name: email.split('@')[0]!,
      email,
      emailVerified: true,
    });
    users.push({ id, email, verified: true });
    created.push(id);
  }
  const granted: string[] = [];
  for (const u of users) {
    if (!u.verified) continue;
    const existing = await owner.query.platformAdmins.findFirst({
      where: eq(s.platformAdmins.userId, u.id),
    });
    if (existing) continue;
    await owner.insert(s.platformAdmins).values({ userId: u.id, grantedBy: 'bootstrap' });
    await owner.insert(s.auditLogs).values({
      actorId: null,
      action: 'platform_admin.granted',
      entityType: 'user',
      entityId: u.id,
      metadata: { source: 'bootstrap', created: created.includes(u.id) },
    });
    granted.push(u.id);
  }
  return { granted, created };
}
