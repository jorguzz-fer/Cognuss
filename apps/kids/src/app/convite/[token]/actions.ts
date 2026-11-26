'use server';
import { randomUUID } from 'node:crypto';
import { eq, hashPassword, hashToken, schema, sql, withAnonymous, withUser } from '@gutta/db-kids';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { ACTIVE_TENANT_COOKIE } from '@/lib/access';
import { auth } from '@/lib/auth/server';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { formObject } from '@/lib/forms';

// Aceite de convite (USR-01). O banco confere token, validade e o e-mail da conta
// (invitation_accept); aqui só se cria a conta nova, quando ainda não existe.

export type InviteState = { error?: string };

async function lookup(token: string) {
  const r = await withAnonymous(db(), (tx) =>
    tx.execute<{ email: string; status: string }>(
      sql`select email, status from invitation_lookup(${hashToken(token)})`,
    ),
  );
  return r.rows[0] ?? null;
}

async function acceptAndEnter(userId: string, token: string): Promise<never> {
  const r = await withUser(db(), userId, (tx) =>
    tx.execute<{ t: string }>(sql`select invitation_accept(${hashToken(token)}) as t`),
  );
  const jar = await cookies();
  jar.set(ACTIVE_TENANT_COOKIE, r.rows[0]!.t, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.APP_URL?.startsWith('https://') ?? false,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  // Gestão e professor caem na ativação do 2FA (K-D11) pelo requireTenant.
  redirect('/inicio');
}

/** Quem já está logado com o e-mail do convite. */
export async function acceptInvite(fd: FormData) {
  const token = String(fd.get('token') ?? '');
  const session = await getSession();
  if (!session) redirect(`/entrar?next=${encodeURIComponent(`/convite/${token}`)}`);
  await acceptAndEnter(session.user.id, token);
}

const registerForm = z.object({
  token: z.string().min(20).max(100),
  name: z.string().trim().min(2).max(120),
  password: z.string().min(8).max(128),
});

/** Conta nova para quem ainda não tem: o e-mail fica confirmado, porque o link provou a posse. */
export async function registerAndAccept(_prev: InviteState, fd: FormData): Promise<InviteState> {
  const parsed = registerForm.safeParse(formObject(fd));
  if (!parsed.success)
    return { error: 'Informe seu nome e uma senha com pelo menos 8 caracteres.' };
  const { token, name, password } = parsed.data;
  const inv = await lookup(token);
  if (!inv || inv.status !== 'open') return { error: 'Este convite não está mais disponível.' };
  const existing = await db().query.authUsers.findFirst({
    where: eq(schema.authUsers.email, inv.email),
  });
  if (existing) return { error: 'Já existe uma conta com este e-mail. Entre para aceitar.' };
  const userId = randomUUID();
  await db().transaction(async (tx) => {
    await tx
      .insert(schema.authUsers)
      .values({ id: userId, name, email: inv.email, emailVerified: true });
    await tx.insert(schema.authAccounts).values({
      id: randomUUID(),
      accountId: userId,
      providerId: 'credential',
      userId,
      password: await hashPassword(password),
    });
  });
  await auth().api.signInEmail({
    body: { email: inv.email, password },
    headers: await headers(),
  });
  await acceptAndEnter(userId, token);
  return {};
}
