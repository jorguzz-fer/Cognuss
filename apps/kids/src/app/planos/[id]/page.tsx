import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  asc,
  eq,
  gradeLabel,
  inArray,
  NEXT_STATUS,
  PLAN_STATUS_LABEL,
  schema,
  sql,
  withTenantUser,
  type PlanStatus,
} from '@gutta/db-kids';
import { Button } from '@gutta/ui/button';
import { Alert, Badge, Card } from '@gutta/ui/card';
import { Field, Input, Select, Textarea } from '@gutta/ui/field';
import { Markdown } from '@gutta/ui/markdown';
import { EmptyState } from '@gutta/ui/states';
import { AppShell } from '@/components/app-shell';
import { Flash } from '@/components/flash';
import { ContentView } from '@/components/plans/content-view';
import { requireTenant } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { PLAN_STATUS_TONE } from '@/lib/labels';
import {
  addContent,
  addFlashcards,
  addTopic,
  deleteContent,
  deleteDraftAction,
  deleteFlashcard,
  deleteTopic,
  moveTopic,
  newVersionAction,
  savePlanDetails,
  transitionAction,
  updateTopic,
} from '../actions';

export const metadata: Metadata = { title: 'Plano de estudos' };

const UUID = /^[0-9a-f-]{36}$/i;

const ACTION_LABEL: Record<PlanStatus, string> = {
  in_review: 'Enviar para revisão',
  approved: 'Aprovar',
  published: 'Publicar',
  archived: 'Arquivar',
  draft: 'Voltar para rascunho',
};

const KIND_HINT = {
  text: 'Texto. Use ## para títulos, - para listas e **negrito**.',
  video: 'Link https do vídeo (YouTube ou Vimeo aparecem dentro da página).',
  table:
    'Primeira linha: títulos das colunas, separados por |. Depois, uma linha por linha da tabela.',
  timeline: 'Uma etapa por linha, na ordem.',
};

// Editor do plano (PLA-02 a PLA-05, CON-01, CON-03). Só o rascunho muda; o resto é prévia.
export default async function PlanEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aviso?: string }>;
}) {
  const { id } = await params;
  const { aviso } = await searchParams;
  if (!UUID.test(id)) notFound();
  const ctx = await requireTenant(['manager', 'teacher'], `/planos/${id}`);
  const manager = ctx.roles.includes('manager');
  const data = await withTenantUser(db(), ctx.tenantId, ctx.user.id, async (tx) => {
    const plan = await tx.query.studyPlans.findFirst({ where: eq(schema.studyPlans.id, id) });
    if (!plan) return null;
    const meta = await tx
      .select({
        stage: schema.grades.stage,
        number: schema.grades.number,
        subject: schema.subjects.name,
        canEdit: sql<boolean>`app_can_edit_plan(${id})`,
      })
      .from(schema.grades)
      .innerJoin(schema.subjects, eq(schema.subjects.id, plan.subjectId))
      .where(eq(schema.grades.id, plan.gradeId));
    const topics = await tx
      .select()
      .from(schema.planTopics)
      .where(eq(schema.planTopics.planId, id))
      .orderBy(asc(schema.planTopics.orderIndex), asc(schema.planTopics.createdAt));
    const ids = topics.map((t) => t.id);
    const contents = ids.length
      ? await tx
          .select()
          .from(schema.topicContents)
          .where(inArray(schema.topicContents.topicId, ids))
          .orderBy(asc(schema.topicContents.orderIndex))
      : [];
    const cards = ids.length
      ? await tx
          .select()
          .from(schema.flashcards)
          .where(inArray(schema.flashcards.topicId, ids))
          .orderBy(asc(schema.flashcards.orderIndex))
      : [];
    const author = plan.authorId
      ? await tx.query.authUsers.findFirst({
          where: eq(schema.authUsers.id, plan.authorId),
          columns: { name: true },
        })
      : null;
    return { plan, meta: meta[0]!, topics, contents, cards, author };
  });
  if (!data) notFound();
  const { plan, meta, topics, contents, cards, author } = data;
  const status = plan.status as PlanStatus;
  const editable = status === 'draft' && meta.canEdit;
  const isAuthor = plan.authorId === ctx.user.id;
  const actions = meta.canEdit
    ? NEXT_STATUS[status].filter((to) => !(to === 'approved' && isAuthor))
    : [];
  return (
    <AppShell
      area={manager ? 'Gestão' : 'Professor'}
      tenantName={ctx.tenantName}
      canSwitch={ctx.user.memberships.length > 1}
    >
      <nav aria-label="Trilha" className="text-sm">
        <Link href="/planos">Planos</Link> <span className="text-muted">/</span> {plan.title}
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl">{plan.title}</h1>
        <Badge tone={PLAN_STATUS_TONE[status]}>{PLAN_STATUS_LABEL[status]}</Badge>
      </div>
      <p className="text-muted">
        {gradeLabel(meta.stage, meta.number)} · {meta.subject} · {plan.schoolYear} · versão{' '}
        {plan.version}
        {author ? ` · escrito por ${author.name}` : ''}
      </p>
      <Flash code={aviso} />
      {plan.reviewNote && status === 'draft' ? (
        <Alert tone="warn">Nota da revisão: {plan.reviewNote}</Alert>
      ) : null}
      {status === 'in_review' && isAuthor ? (
        <Alert tone="neutral">
          Aguardando a revisão de outro professor da matéria ou da gestão. Quem escreveu não aprova
          o próprio plano.
        </Alert>
      ) : null}

      {actions.length || status === 'published' || status === 'draft' ? (
        <Card className="flex flex-wrap items-end gap-3">
          {actions.map((to) => (
            <form key={to} action={transitionAction} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="planId" value={plan.id} />
              <input type="hidden" name="to" value={to} />
              {to === 'draft' && status === 'in_review' && !isAuthor ? (
                <Field label="Nota para quem escreveu" optional>
                  {(p) => <Input {...p} name="note" maxLength={1000} />}
                </Field>
              ) : null}
              <Button
                type="submit"
                variant={to === 'archived' || to === 'draft' ? 'secondary' : 'primary'}
              >
                {ACTION_LABEL[to]}
              </Button>
            </form>
          ))}
          {meta.canEdit && (status === 'published' || status === 'archived') ? (
            <form action={newVersionAction}>
              <input type="hidden" name="planId" value={plan.id} />
              <Button type="submit" variant="secondary">
                Criar nova versão para editar
              </Button>
            </form>
          ) : null}
          {editable ? (
            <form action={deleteDraftAction} className="ml-auto">
              <input type="hidden" name="planId" value={plan.id} />
              <Button type="submit" variant="danger">
                Apagar rascunho
              </Button>
            </form>
          ) : null}
        </Card>
      ) : null}

      {editable ? (
        <Card>
          <form action={savePlanDetails} className="grid gap-3">
            <input type="hidden" name="planId" value={plan.id} />
            <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
              <Field label="Título">
                {(p) => (
                  <Input {...p} name="title" defaultValue={plan.title} required maxLength={120} />
                )}
              </Field>
              <Field label="Período" optional hint="Exemplo: 4º bimestre">
                {(p) => (
                  <Input
                    {...p}
                    name="periodLabel"
                    defaultValue={plan.periodLabel ?? ''}
                    maxLength={60}
                  />
                )}
              </Field>
            </div>
            <Field
              label="Dicas para quem ajuda"
              optional
              hint="Para o adulto que acompanha o aluno."
            >
              {(p) => (
                <Textarea
                  {...p}
                  name="helperTipsMd"
                  defaultValue={plan.helperTipsMd ?? ''}
                  rows={3}
                />
              )}
            </Field>
            <Button type="submit" variant="secondary" className="justify-self-start">
              Salvar dados do plano
            </Button>
          </form>
        </Card>
      ) : plan.helperTipsMd ? (
        <Card>
          <h2 className="text-lg">Dicas para quem ajuda</h2>
          <Markdown source={plan.helperTipsMd} />
        </Card>
      ) : null}

      <section className="grid gap-4">
        <h2 className="text-2xl">Tópicos</h2>
        {topics.length === 0 ? (
          <EmptyState title="Nenhum tópico ainda">
            {editable ? 'Adicione o primeiro tópico abaixo.' : 'Este plano ainda não tem tópicos.'}
          </EmptyState>
        ) : null}
        {topics.map((t, i) => {
          const tc = contents.filter((c) => c.topicId === t.id);
          const tf = cards.filter((c) => c.topicId === t.id);
          return (
            <Card key={t.id} className="grid gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {t.dayNumber ? <Badge tone="accent">Dia {t.dayNumber}</Badge> : null}
                <h3 className="text-xl">{t.title}</h3>
                {editable ? (
                  <div className="ml-auto flex gap-1">
                    {(['up', 'down'] as const).map((dir) => (
                      <form key={dir} action={moveTopic}>
                        <input type="hidden" name="planId" value={plan.id} />
                        <input type="hidden" name="topicId" value={t.id} />
                        <input type="hidden" name="dir" value={dir} />
                        <Button
                          type="submit"
                          variant="ghost"
                          disabled={dir === 'up' ? i === 0 : i === topics.length - 1}
                          aria-label={dir === 'up' ? `Subir ${t.title}` : `Descer ${t.title}`}
                        >
                          {dir === 'up' ? '↑' : '↓'}
                        </Button>
                      </form>
                    ))}
                    <form action={deleteTopic}>
                      <input type="hidden" name="planId" value={plan.id} />
                      <input type="hidden" name="topicId" value={t.id} />
                      <Button type="submit" variant="ghost">
                        Apagar
                      </Button>
                    </form>
                  </div>
                ) : null}
              </div>
              {t.summary ? <p className="text-muted">{t.summary}</p> : null}
              {editable ? (
                <details>
                  <summary className="cursor-pointer text-sm font-semibold">Editar tópico</summary>
                  <TopicForm planId={plan.id} topic={t} />
                </details>
              ) : null}

              {tc.map((c) => (
                <div key={c.id} className="grid gap-2 border-t border-line pt-3">
                  <ContentView content={c} />
                  {editable ? (
                    <form action={deleteContent}>
                      <input type="hidden" name="planId" value={plan.id} />
                      <input type="hidden" name="contentId" value={c.id} />
                      <Button type="submit" variant="ghost">
                        Apagar conteúdo
                      </Button>
                    </form>
                  ) : null}
                </div>
              ))}

              {tf.length ? (
                <div className="grid gap-2 border-t border-line pt-3">
                  <h4 className="font-semibold">Flashcards ({tf.length})</h4>
                  <ul className="grid gap-1 text-sm">
                    {tf.map((c) => (
                      <li key={c.id} className="flex flex-wrap items-center gap-2">
                        <span>
                          <b>{c.front}</b> · {c.back}
                        </span>
                        {editable ? (
                          <form action={deleteFlashcard}>
                            <input type="hidden" name="planId" value={plan.id} />
                            <input type="hidden" name="cardId" value={c.id} />
                            <Button
                              type="submit"
                              variant="ghost"
                              aria-label={`Apagar cartão ${c.front}`}
                            >
                              ×
                            </Button>
                          </form>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {editable ? (
                <div className="grid gap-4 border-t border-line pt-3 md:grid-cols-2">
                  <form action={addContent} className="grid gap-2">
                    <input type="hidden" name="planId" value={plan.id} />
                    <input type="hidden" name="topicId" value={t.id} />
                    <h4 className="font-semibold">Adicionar conteúdo</h4>
                    <Field label="Tipo">
                      {(p) => (
                        <Select {...p} name="kind" defaultValue="text">
                          <option value="text">Texto</option>
                          <option value="video">Vídeo</option>
                          <option value="table">Tabela</option>
                          <option value="timeline">Linha do tempo</option>
                        </Select>
                      )}
                    </Field>
                    <Field label="Título" optional>
                      {(p) => <Input {...p} name="title" maxLength={120} />}
                    </Field>
                    <Field label="Conteúdo" hint={Object.values(KIND_HINT).join(' ')}>
                      {(p) => <Textarea {...p} name="body" rows={5} required />}
                    </Field>
                    <Button type="submit" variant="secondary" className="justify-self-start">
                      Adicionar conteúdo
                    </Button>
                  </form>
                  <form action={addFlashcards} className="grid gap-2">
                    <input type="hidden" name="planId" value={plan.id} />
                    <input type="hidden" name="topicId" value={t.id} />
                    <h4 className="font-semibold">Adicionar flashcards</h4>
                    <Field label="Cartões" hint="Um por linha: frente | verso">
                      {(p) => <Textarea {...p} name="lines" rows={5} required />}
                    </Field>
                    <Button type="submit" variant="secondary" className="justify-self-start">
                      Adicionar flashcards
                    </Button>
                  </form>
                </div>
              ) : null}
            </Card>
          );
        })}
        {editable ? (
          <Card>
            <h3 className="text-lg">Novo tópico</h3>
            <TopicForm planId={plan.id} />
          </Card>
        ) : null}
      </section>
    </AppShell>
  );
}

function TopicForm({
  planId,
  topic,
}: {
  planId: string;
  topic?: { id: string; title: string; dayNumber: number | null; summary: string | null };
}) {
  return (
    <form action={topic ? updateTopic : addTopic} className="mt-2 grid gap-3">
      <input type="hidden" name="planId" value={planId} />
      {topic ? <input type="hidden" name="topicId" value={topic.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <Field label="Título do tópico">
          {(p) => (
            <Input
              {...p}
              name="title"
              defaultValue={topic?.title}
              required
              minLength={2}
              maxLength={120}
            />
          )}
        </Field>
        <Field label="Dia" optional hint="Dia do cronograma">
          {(p) => (
            <Input
              {...p}
              name="dayNumber"
              type="number"
              min={1}
              max={366}
              defaultValue={topic?.dayNumber ?? ''}
            />
          )}
        </Field>
      </div>
      <Field label="Resumo" optional hint="Uma ou duas frases sobre o que o aluno vai estudar.">
        {(p) => <Input {...p} name="summary" defaultValue={topic?.summary ?? ''} maxLength={500} />}
      </Field>
      <Button type="submit" variant="secondary" className="justify-self-start">
        {topic ? 'Salvar tópico' : 'Adicionar tópico'}
      </Button>
    </form>
  );
}
