import type { Metadata } from 'next';
import { EmptyState } from '@gutta/ui/states';
import { AppShell } from '@/components/app-shell';
import { requireTenant } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Estudar' };

export default async function Page() {
  const ctx = await requireTenant(['student'], '/estudar');
  return (
    <AppShell
      area="Estudar"
      tenantName={ctx.tenantName}
      canSwitch={ctx.user.memberships.length > 1}
    >
      <h1 className="text-3xl">Meu plano</h1>
      <EmptyState title="Ainda não há nada aqui">
        O plano de estudos do seu ano aparece aqui quando a escola publicar.
      </EmptyState>
    </AppShell>
  );
}
