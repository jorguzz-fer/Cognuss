import type { Metadata } from 'next';
import { EmptyState } from '@gutta/ui/states';
import { AppShell } from '@/components/app-shell';
import { requireTenant } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Professor' };

export default async function Page() {
  const ctx = await requireTenant(['teacher'], '/professor');
  return (
    <AppShell
      area="Professor"
      tenantName={ctx.tenantName}
      canSwitch={ctx.user.memberships.length > 1}
    >
      <h1 className="text-3xl">Minhas turmas</h1>
      <EmptyState title="Ainda não há nada aqui">
        As turmas e os planos de estudo chegam nas próximas fases.
      </EmptyState>
    </AppShell>
  );
}
