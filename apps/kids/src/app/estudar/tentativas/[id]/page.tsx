import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq, schema, withTenantUser } from '@gutta/db-kids';
import { buttonClass } from '@gutta/ui/button';
import { Alert, Badge, Card } from '@gutta/ui/card';
import { AppShell } from '@/components/app-shell';
import { AttemptRunner } from '@/components/assess/attempt-runner';
import { StartAttemptForm } from '@/components/assess/start-form';
import { attemptView, studentAssessments } from '@/lib/assess';
import { examState } from '@/lib/exam-state';
import { requireTenant } from '@/lib/auth/session';
import { db } from '@/lib/db';

export const metadata: Metadata = { title: 'Avaliação' };

const UUID = /^[0-9a-f-]{36}$/i;
const fmt = (v: string | number | null) => (v === null ? '—' : Number(v).toLocaleString('pt-BR'));

// A tentativa: responder (uma questão por tela) e, depois de enviar, a nota e a correção.
export default async function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const ctx = await requireTenant(['student'], `/estudar/tentativas/${id}`);
  const data = await withTenantUser(db(), ctx.tenantId, ctx.user.id, async (tx) => {
    const attempt = await tx.query.assessmentAttempts.findFirst({
      where: eq(schema.assessmentAttempts.id, id),
    });
    if (!attempt || attempt.userId !== ctx.user.id) return null;
    const rows = await attemptView(tx, id);
    const all = await studentAssessments(tx, ctx.user.id);
    return { attempt, rows, assessment: all.find((a) => a.id === attempt.assessmentId) ?? null };
  });
  if (!data?.assessment) notFound();
  const { attempt, rows, assessment: a } = data;
  const exam = a.kind === 'exam';
  const title = attempt.retakeOf ? `Recuperação: ${a.title}` : a.title;
  const back = (
    <nav aria-label="Trilha" className="text-sm">
      <Link href="/estudar">Hoje</Link> <span className="text-muted">/</span>{' '}
      <Link href={`/estudar/avaliacoes/${a.id}`}>{a.title}</Link>
    </nav>
  );
  if (!attempt.submittedAt) {
    return (
      <AppShell
        area="Estudar"
        tenantName={ctx.tenantName}
        canSwitch={ctx.user.memberships.length > 1}
      >
        {back}
        <h1 className="text-3xl">{title}</h1>
        <AttemptRunner
          attemptId={attempt.id}
          practice={!exam}
          questions={rows.map((r) => ({
            pos: r.pos,
            kind: r.kind,
            stem: r.stem,
            options: r.options,
            answer: r.answer,
            isCorrect: r.is_correct,
            explanation: r.explanation,
          }))}
        />
      </AppShell>
    );
  }
  const st = examState(a, a.attempts);
  const passed = attempt.passed === true;
  return (
    <AppShell
      area="Estudar"
      tenantName={ctx.tenantName}
      canSwitch={ctx.user.memberships.length > 1}
    >
      {back}
      <h1 className="text-3xl">{title}</h1>
      <Card className="grid justify-items-start gap-2">
        <p className="text-sm text-muted">
          {attempt.correctCount} de {attempt.total} certas
        </p>
        <p className="font-display text-5xl tabular">{fmt(attempt.score)}</p>
        {exam ? (
          passed ? (
            <Alert tone="success">Aprovado! A nota mínima era {fmt(a.passingScore)}.</Alert>
          ) : (
            <Alert tone="warn">
              Ficou abaixo de {fmt(a.passingScore)}. Vamos para a recuperação: as questões que você
              errou voltam em outro formato.
            </Alert>
          )
        ) : (
          <p className="text-muted">
            Simulado é treino: dá para fazer de novo quantas vezes quiser.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          {st.canRetake && st.retakeOf === attempt.id ? (
            <StartAttemptForm
              assessmentId={a.id}
              retakeOf={attempt.id}
              label="Fazer a recuperação"
            />
          ) : null}
          <Link href="/estudar" className={buttonClass('secondary', 'lg')}>
            Voltar para Hoje
          </Link>
        </div>
      </Card>
      <section className="grid gap-2">
        <h2 className="text-xl">Correção</h2>
        <ol className="grid gap-2">
          {rows.map((r) => (
            <li key={r.pos}>
              <Card className="grid gap-2">
                <div className="flex items-start gap-2">
                  <Badge tone={r.is_correct ? 'success' : 'warn'}>
                    {r.is_correct ? 'Certa' : 'Errada'}
                  </Badge>
                  <span className="font-semibold">
                    {r.pos}. {r.stem}
                  </span>
                </div>
                <p className="text-sm">
                  <span className="text-muted">Sua resposta: </span>
                  {answerText(r.kind, r.options, r.answer)}
                </p>
                {!r.is_correct && r.correct ? (
                  <p className="text-sm">
                    <span className="text-muted">Resposta certa: </span>
                    {answerText(
                      r.kind,
                      r.options,
                      r.kind === 'multiple_choice'
                        ? { choice: r.correct.correct }
                        : { value: r.correct.value },
                    )}
                  </p>
                ) : null}
                {!r.is_correct && r.model_answer ? (
                  <p className="text-sm">
                    <span className="text-muted">Uma boa resposta: </span>
                    {r.model_answer}
                  </p>
                ) : null}
                {r.explanation ? <p className="text-sm text-muted">{r.explanation}</p> : null}
              </Card>
            </li>
          ))}
        </ol>
      </section>
    </AppShell>
  );
}

function answerText(
  kind: string,
  options: string[] | null,
  a: { choice?: number; value?: boolean; text?: string } | null,
) {
  if (!a) return 'sem resposta';
  if (kind === 'multiple_choice')
    return a.choice !== undefined ? (options?.[a.choice] ?? '—') : 'sem resposta';
  if (kind === 'true_false')
    return a.value === undefined ? 'sem resposta' : a.value ? 'Verdadeiro' : 'Falso';
  return a.text?.trim() || 'sem resposta';
}
