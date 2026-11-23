import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, eq, schema, withTenantUser } from '@gutta/db-kids';
import { Button } from '@gutta/ui/button';
import { Alert, Badge, Card } from '@gutta/ui/card';
import { AppShell } from '@/components/app-shell';
import { ContentView } from '@/components/plans/content-view';
import { requireTenant } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { planTopicsWithProgress } from '@/lib/study';
import { completeTopic } from '../../actions';

export const metadata: Metadata = { title: 'Tópico' };

const UUID = /^[0-9a-f-]{36}$/i;

// Tópico do plano: conteúdo, os flashcards dele e "Estudei!" (CON-01, CON-03, PAI-01).
export default async function TopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const ctx = await requireTenant(['student'], `/estudar/topicos/${id}`);
  const data = await withTenantUser(db(), ctx.tenantId, ctx.user.id, async (tx) => {
    const topic = await tx.query.planTopics.findFirst({ where: eq(schema.planTopics.id, id) });
    if (!topic) return null;
    const contents = await tx
      .select()
      .from(schema.topicContents)
      .where(eq(schema.topicContents.topicId, id))
      .orderBy(asc(schema.topicContents.orderIndex));
    const cards = await tx
      .select()
      .from(schema.flashcards)
      .where(eq(schema.flashcards.topicId, id))
      .orderBy(asc(schema.flashcards.orderIndex));
    const all = await planTopicsWithProgress(tx, [topic.planId], ctx.user.id);
    const done = await tx.query.topicProgress.findFirst({
      where: and(
        eq(schema.topicProgress.topicId, id),
        eq(schema.topicProgress.userId, ctx.user.id),
      ),
    });
    return { topic, contents, cards, all, done: Boolean(done) };
  });
  if (!data) notFound();
  const { topic, contents, cards, all, done } = data;
  const i = all.findIndex((t) => t.id === id);
  const next = all.slice(i + 1).find((t) => !t.done) ?? null;
  return (
    <AppShell
      area="Estudar"
      tenantName={ctx.tenantName}
      canSwitch={ctx.user.memberships.length > 1}
    >
      <nav aria-label="Trilha" className="text-sm">
        <Link href="/estudar">Hoje</Link> <span className="text-muted">/</span>{' '}
        <Link href={`/estudar/planos/${topic.planId}`}>Plano</Link>{' '}
        <span className="text-muted">/</span> {topic.title}
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        {topic.dayNumber ? <Badge tone="accent">Dia {topic.dayNumber}</Badge> : null}
        <h1 className="text-3xl">{topic.title}</h1>
        {done ? <Badge tone="success">Estudado</Badge> : null}
      </div>
      {topic.summary ? <p className="text-lg text-muted">{topic.summary}</p> : null}
      {contents.length === 0 ? (
        <p className="text-muted">Este tópico ainda não tem conteúdo. Estude pela apostila.</p>
      ) : (
        <Card className="grid gap-6 text-[17px]">
          {contents.map((c) => (
            <ContentView key={c.id} content={c} />
          ))}
        </Card>
      )}
      {cards.length ? (
        <Card className="grid gap-2">
          <h2 className="text-xl">Para lembrar ({cards.length} flashcards)</h2>
          <p className="text-sm text-muted">
            Depois de marcar como estudado, eles entram na revisão de cada dia.
          </p>
          <ul className="grid gap-1">
            {cards.map((c) => (
              <li key={c.id}>
                <details>
                  <summary className="cursor-pointer py-1">{c.front}</summary>
                  <p className="pl-4 text-muted">{c.back}</p>
                </details>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      {done ? (
        <Alert tone="success">Você já estudou este tópico. Pode reler quando quiser.</Alert>
      ) : (
        <form action={completeTopic}>
          <input type="hidden" name="topicId" value={topic.id} />
          <input
            type="hidden"
            name="next"
            value={next ? `/estudar/topicos/${next.id}` : `/estudar/planos/${topic.planId}`}
          />
          <Button type="submit" size="lg">
            Estudei este tópico
          </Button>
        </form>
      )}
      {done && next ? (
        <Link href={`/estudar/topicos/${next.id}`} className="text-lg">
          Próximo tópico: {next.title} →
        </Link>
      ) : null}
    </AppShell>
  );
}
