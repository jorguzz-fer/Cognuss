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
 * Super Admin inicial (KIDS_BOOTSTRAP_ADMIN_EMAILS): dá o papel a contas que já existem e
 * confirmaram o e-mail. Roda como dono do banco no start. Nunca cria conta nem remove papel.
 * Devolve só ids, nunca e-mails (PII fora do log).
 */
export async function bootstrapPlatformAdmins(owner: Db, emails: string[]) {
  if (emails.length === 0) return { granted: [] as string[] };
  const users = await owner
    .select({ id: s.authUsers.id, verified: s.authUsers.emailVerified })
    .from(s.authUsers)
    .where(inArray(s.authUsers.email, emails));
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
      metadata: { source: 'bootstrap' },
    });
    granted.push(u.id);
  }
  return { granted };
}
