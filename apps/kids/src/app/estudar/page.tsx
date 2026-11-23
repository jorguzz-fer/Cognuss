import type { Metadata } from 'next';
import Link from 'next/link';
import { eq, gradeLabel, isNull, schema, withTenantUser } from '@gutta/db-kids';
import { buttonClass } from '@gutta/ui/button';
import { Badge, Card } from '@gutta/ui/card';
import { EmptyState } from '@gutta/ui/states';
import { AppShell } from '@/components/app-shell';
import { requireTenant } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { studentAssessments } from '@/lib/assess';
import { examState } from '@/lib/exam-state';
import { planTopicsWithProgress, publishedPlans, reviewQueue, studentConsented } from '@/lib/study';

export const metadata: Metadata = { title: 'Hoje' };

// PAI-01: a tela "Hoje" do aluno. Uma ação principal (o próximo tópico), os flashcards do dia
// e os planos. Sem consentimento do responsável, só o aviso (RES-03).
export default async function TodayPage() {
  const ctx = await requireTenant(['student'], '/estudar');
  const data = await withTenantUser(db(), ctx.tenantId, ctx.user.id, async (tx) => {
    const consented = await studentConsented(tx, ctx.user.id);
    const klass = await tx
      .select({
        name: schema.classes.name,
        stage: schema.grades.stage,
        number: schema.grades.number,
      })
      .from(schema.classMembers)
      .innerJoin(schema.classes, eq(schema.classes.id, schema.classMembers.classId))
      .innerJoin(schema.grades, eq(schema.grades.id, schema.classes.gradeId))
      .where(isNull(schema.classMembers.leftAt))
      .limit(1);
    if (!consented) return { consented, klass: klass[0], plans: [], topics: [], due: 0, tests: [] };
    const plans = await publishedPlans(tx);
    const topics = await planTopicsWithProgress(
      tx,
      plans.map((p) => p.id),
      ctx.user.id,
    );
    const queue = await reviewQueue(tx, ctx.user.id);
    const tests = await studentAssessments(tx, ctx.user.id);
    return { consented, klass: klass[0], plans, topics, due: queue.length, tests };
  });
  const first = ctx.user.name.split(' ')[0];
  const next = data.topics.find((t) => !t.done);
  const nextPlan = next ? data.plans.find((p) => p.id === next.planId) : null;
  return (
    <AppShell
      area="Estudar"
      tenantName={ctx.tenantName}
      canSwitch={ctx.user.memberships.length > 1}
    >
      <h1 className="text-3xl">Oi, {first}!</h1>
      {data.klass ? (
        <p className="text-muted">
          {data.klass.name} · {gradeLabel(data.klass.stage, data.klass.number)}
        </p>
      ) : null}

      {!data.consented ? (
        <EmptyState title="Falta a autorização do seu responsável">
          A escola enviou um link para o seu responsável. Assim que ele autorizar, os planos de
          estudo aparecem aqui.
        </EmptyState>
      ) : data.plans.length === 0 ? (
        <EmptyState title="Ainda não há nada aqui">
          O plano de estudos do seu ano aparece aqui quando a escola publicar.
        </EmptyState>
      ) : (
        <>
          {next && nextPlan ? (
            <Card className="grid gap-3">
              <p className="font-mono text-xs font-semibold tracking-widest text-muted uppercase">
                Próximo passo · {nextPlan.subject}
                {next.dayNumber ? ` · Dia ${next.dayNumber}` : ''}
              </p>
              <p className="font-display text-2xl">{next.title}</p>
              {next.summary ? <p className="text-muted">{next.summary}</p> : null}
              <Link
                href={`/estudar/topicos/${next.id}`}
                className={buttonClass('primary', 'lg', 'justify-self-start')}
              >
                Estudar agora
              </Link>
            </Card>
          ) : (
            <Card>
              <p className="text-lg font-semibold">Você estudou todos os tópicos publicados.</p>
              <p className="text-muted">Agora é revisar os flashcards até a prova.</p>
            </Card>
          )}
          <Card className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Flashcards de hoje</p>
              <p className="text-sm text-muted">
                {data.due === 0
                  ? 'Nenhum para hoje. Eles aparecem depois que você estuda um tópico.'
                  : `${data.due} ${data.due === 1 ? 'cartão' : 'cartões'} para revisar.`}
              </p>
            </div>
            {data.due > 0 ? (
              <Link href="/estudar/revisar" className={buttonClass('secondary')}>
                Revisar
              </Link>
            ) : null}
          </Card>
          {data.tests.length ? (
            <section className="grid gap-2">
              <h2 className="text-xl">Simulados e provas</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {data.tests.map((t) => {
                  const st = examState(t, t.attempts);
                  const label = st.passed
                    ? ['Aprovado', 'success']
                    : st.inProgress
                      ? ['Em andamento', 'neutral']
                      : st.canRetake
                        ? ['Recuperação', 'warn']
                        : st.canStart
                          ? [t.kind === 'exam' ? 'Disponível' : 'Treino', 'accent']
                          : ['Fechado', 'neutral'];
                  return (
                    <li key={t.id}>
                      <Card className="flex flex-wrap items-center gap-2">
                        <Link href={`/estudar/avaliacoes/${t.id}`} className="font-semibold">
                          {t.subject}: {t.title}
                        </Link>
                        <Badge tone={label[1] as 'success' | 'neutral' | 'warn' | 'accent'}>
                          {label[0]}
                        </Badge>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
          <section className="grid gap-2">
            <h2 className="text-xl">Meus planos</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {data.plans.map((p) => {
                const ts = data.topics.filter((t) => t.planId === p.id);
                const done = ts.filter((t) => t.done).length;
                return (
                  <li key={p.id}>
                    <Card>
                      <Link href={`/estudar/planos/${p.id}`} className="text-lg font-semibold">
                        {p.subject}: {p.title}
                      </Link>
                      <p className="text-sm text-muted">
                        {done} de {ts.length} tópicos estudados
                      </p>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </AppShell>
  );
}
