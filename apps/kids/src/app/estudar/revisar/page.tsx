import type { Metadata } from 'next';
import Link from 'next/link';
import { withTenantUser } from '@gutta/db-kids';
import { EmptyState } from '@gutta/ui/states';
import { AppShell } from '@/components/app-shell';
import { ReviewSession } from '@/components/study/review-session';
import { requireTenant } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { reviewQueue, studentConsented } from '@/lib/study';

export const metadata: Metadata = { title: 'Revisar' };

// Revisão de flashcards do dia (CON-03, CON-04), com repetição espaçada (packages/core/srs).
export default async function ReviewPage() {
  const ctx = await requireTenant(['student'], '/estudar/revisar');
  const queue = await withTenantUser(db(), ctx.tenantId, ctx.user.id, async (tx) =>
    (await studentConsented(tx, ctx.user.id)) ? reviewQueue(tx, ctx.user.id) : [],
  );
  return (
    <AppShell
      area="Estudar"
      tenantName={ctx.tenantName}
      canSwitch={ctx.user.memberships.length > 1}
    >
      <nav aria-label="Trilha" className="text-sm">
        <Link href="/estudar">Hoje</Link> <span className="text-muted">/</span> Revisar
      </nav>
      <h1 className="text-3xl">Flashcards de hoje</h1>
      {queue.length === 0 ? (
        <EmptyState
          title="Nada para revisar agora"
          action={<Link href="/estudar">Voltar para Hoje</Link>}
        >
          Os cartões aparecem depois que você estuda um tópico, e voltam no dia certo.
        </EmptyState>
      ) : (
        <ReviewSession cards={queue} />
      )}
    </AppShell>
  );
}
