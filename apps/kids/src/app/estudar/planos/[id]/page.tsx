import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq, schema, withTenantUser } from '@gutta/db-kids';
import { Badge, Card } from '@gutta/ui/card';
import { Markdown } from '@gutta/ui/markdown';
import { AppShell } from '@/components/app-shell';
import { requireTenant } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { planTopicsWithProgress } from '@/lib/study';

export const metadata: Metadata = { title: 'Plano' };

const UUID = /^[0-9a-f-]{36}$/i;

// O plano do aluno, dia a dia (PLA-03), com o que já foi estudado e as dicas para quem ajuda.
export default async function StudentPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const ctx = await requireTenant(['student'], `/estudar/planos/${id}`);
  const data = await withTenantUser(db(), ctx.tenantId, ctx.user.id, async (tx) => {
    const plan = await tx.query.studyPlans.findFirst({ where: eq(schema.studyPlans.id, id) });
    if (!plan) return null;
    const subject = await tx.query.subjects.findFirst({
      where: eq(schema.subjects.id, plan.subjectId),
    });
    const topics = await planTopicsWithProgress(tx, [id], ctx.user.id);
    return { plan, subject, topics };
  });
  if (!data) notFound();
  const days = new Map<string, typeof data.topics>();
  for (const t of data.topics) {
    const key = t.dayNumber ? `Dia ${t.dayNumber}` : 'Para estudar';
    days.set(key, [...(days.get(key) ?? []), t]);
  }
  const done = data.topics.filter((t) => t.done).length;
  return (
    <AppShell
      area="Estudar"
      tenantName={ctx.tenantName}
      canSwitch={ctx.user.memberships.length > 1}
    >
      <nav aria-label="Trilha" className="text-sm">
        <Link href="/estudar">Hoje</Link> <span className="text-muted">/</span> {data.subject?.name}
      </nav>
      <h1 className="text-3xl">{data.plan.title}</h1>
      <p className="text-muted">
        {done} de {data.topics.length} tópicos estudados
      </p>
      <div
        className="h-2 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={data.topics.length}
        aria-valuenow={done}
        aria-label="Tópicos estudados"
      >
        <div
          className="h-full bg-accent"
          style={{ width: `${data.topics.length ? (done / data.topics.length) * 100 : 0}%` }}
        />
      </div>
      {[...days].map(([day, ts]) => (
        <section key={day} className="grid gap-2">
          <h2 className="text-xl">{day}</h2>
          <ul className="grid gap-2">
            {ts.map((t) => (
              <li key={t.id}>
                <Card className="flex flex-wrap items-center gap-3">
                  <Link href={`/estudar/topicos/${t.id}`} className="text-lg font-semibold">
                    {t.title}
                  </Link>
                  {t.done ? <Badge tone="success">Estudado</Badge> : null}
                  {t.summary ? <p className="w-full text-sm text-muted">{t.summary}</p> : null}
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {data.plan.helperTipsMd ? (
        <details className="rounded-[var(--radius)] border border-line p-4">
          <summary className="cursor-pointer font-semibold">Dicas para quem ajuda</summary>
          <div className="mt-3">
            <Markdown source={data.plan.helperTipsMd} />
          </div>
        </details>
      ) : null}
    </AppShell>
  );
}
