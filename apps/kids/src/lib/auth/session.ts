import 'server-only';
import { and, eq, schema, withUser } from '@gutta/db-kids';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import {
  ACTIVE_TENANT_COOKIE,
  needsTwoFactor,
  resolveActiveTenant,
  rolesIn,
  type MemberRole,
  type Membership,
} from '../access';
import { db } from '../db';
import { auth } from './server';

export const getSession = cache(async () => {
  const h = await headers();
  return auth().api.getSession({ headers: h });
});

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  twoFactorEnabled: boolean;
  platformAdmin: boolean;
  memberships: Membership[];
};

/**
 * Vínculos ativos do usuário em instituições ativas, e se ele é Super Admin. Uma transação,
 * uma vez por requisição. Roda com withUser: o RLS só devolve os vínculos dele.
 */
const getAccess = cache(async (userId: string) =>
  withUser(db(), userId, async (tx) => {
    const rows = await tx
      .select({
        tenantId: schema.memberships.tenantId,
        tenantName: schema.tenants.name,
        role: schema.memberships.role,
      })
      .from(schema.memberships)
      .innerJoin(schema.tenants, eq(schema.tenants.id, schema.memberships.tenantId))
      .where(
        and(
          eq(schema.memberships.userId, userId),
          eq(schema.memberships.status, 'active'),
          eq(schema.tenants.status, 'active'),
        ),
      );
    const admin = await tx.query.platformAdmins.findFirst({
      where: eq(schema.platformAdmins.userId, userId),
    });
    return { memberships: rows as Membership[], platformAdmin: Boolean(admin) };
  }),
);

/** Sessão válida e e-mail confirmado. A identidade vem só da sessão. */
export async function requireUser(next = '/inicio'): Promise<CurrentUser> {
  const session = await getSession();
  if (!session) redirect(`/entrar?next=${encodeURIComponent(next)}`);
  const access = await getAccess(session.user.id);
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    twoFactorEnabled: Boolean((session.user as { twoFactorEnabled?: boolean }).twoFactorEnabled),
    ...access,
  };
}

/** Área do Super Admin (/plataforma): exige o papel e o segundo fator ativo. */
export async function requirePlatformAdmin(next = '/plataforma'): Promise<CurrentUser> {
  const user = await requireUser(next);
  if (!user.platformAdmin) redirect('/inicio?aviso=sem-acesso');
  if (!user.twoFactorEnabled) redirect('/seguranca/dois-fatores');
  return user;
}

export type TenantContext = {
  user: CurrentUser;
  tenantId: string;
  tenantName: string;
  roles: MemberRole[];
};

/**
 * Instituição ativa: lida do cookie e conferida contra os vínculos (o cookie sozinho não dá
 * acesso a nada; withTenantUser e o RLS conferem de novo). Sem escolha válida, vai para
 * /escolher. Gestor sem 2FA vai ativar o segundo fator.
 */
export async function requireTenant(
  allowed?: MemberRole[],
  next = '/inicio',
): Promise<TenantContext> {
  const user = await requireUser(next);
  const jar = await cookies();
  const tenantId = resolveActiveTenant(jar.get(ACTIVE_TENANT_COOKIE)?.value, user.memberships);
  if (!tenantId) redirect(user.memberships.length ? '/escolher' : '/inicio?aviso=sem-escola');
  const roles = rolesIn(tenantId, user.memberships);
  if (allowed && !roles.some((r) => allowed.includes(r))) redirect('/inicio?aviso=sem-acesso');
  if (needsTwoFactor(roles, false) && !user.twoFactorEnabled) redirect('/seguranca/dois-fatores');
  const tenantName = user.memberships.find((m) => m.tenantId === tenantId)!.tenantName;
  return { user, tenantId, tenantName, roles };
}
