import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { Alert } from '@gutta/ui/card';
import { AppShell } from '@/components/app-shell';
import { ACTIVE_TENANT_COOKIE, homeFor, resolveActiveTenant, rolesIn } from '@/lib/access';
import { requireUser } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Início' };

// Depois do login: leva cada pessoa para a área do papel dela na escola ativa (seção 4.2).
export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string }>;
}) {
  const { aviso } = await searchParams;
  const user = await requireUser('/inicio');
  const jar = await cookies();
  const tenantId = resolveActiveTenant(jar.get(ACTIVE_TENANT_COOKIE)?.value, user.memberships);
  if (!aviso) {
    if (tenantId) redirect(homeFor(rolesIn(tenantId, user.memberships)));
    if (user.memberships.length > 0) redirect('/escolher');
    if (user.platformAdmin) redirect('/plataforma');
  }
  return (
    <AppShell area="Início">
      {aviso === 'sem-acesso' ? (
        <Alert tone="warn">Essa área não faz parte do seu acesso.</Alert>
      ) : null}
      <h1 className="text-3xl">Oi, {user.name.split(' ')[0]}.</h1>
      {user.memberships.length === 0 && !user.platformAdmin ? (
        <p className="text-muted">
          Sua conta ainda não está ligada a nenhuma escola. Fale com a gestão da sua escola.
        </p>
      ) : (
        <ul className="grid gap-2">
          {user.platformAdmin ? (
            <li>
              <Link href="/plataforma">Plataforma (Super Admin)</Link>
            </li>
          ) : null}
          {user.memberships.length > 0 ? (
            <li>
              <Link href={tenantId ? homeFor(rolesIn(tenantId, user.memberships)) : '/escolher'}>
                Minha escola
              </Link>
            </li>
          ) : null}
        </ul>
      )}
    </AppShell>
  );
}
