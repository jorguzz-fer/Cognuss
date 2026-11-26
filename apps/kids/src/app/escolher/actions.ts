'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ACTIVE_TENANT_COOKIE, homeFor, rolesIn } from '@/lib/access';
import { requireUser } from '@/lib/auth/session';

/** Grava a instituição ativa, só se o usuário for membro dela (USR-05). */
export async function chooseTenant(formData: FormData) {
  const user = await requireUser('/escolher');
  const tenantId = String(formData.get('tenantId') ?? '');
  const roles = rolesIn(tenantId, user.memberships);
  if (roles.length === 0) redirect('/escolher?aviso=sem-acesso');
  const jar = await cookies();
  jar.set(ACTIVE_TENANT_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.APP_URL?.startsWith('https://') ?? false,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect(homeFor(roles));
}
