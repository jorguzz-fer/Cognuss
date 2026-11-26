import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { withTenantUser } from '@gutta/db-kids';
import { buttonClass } from '@gutta/ui/button';
import { Alert, Badge, Card } from '@gutta/ui/card';
import { AppShell } from '@/components/app-shell';
import { StartAttemptForm } from '@/components/assess/start-form';
import { studentAssessments } from '@/lib/assess';
import { examState } from '@/lib/exam-state';
import { requireTenant } from '@/lib/auth/session';
import { db } from '@/lib/db';

export const metadata: Metadata = { title: 'Avaliação' };

const UUID = /^[0-9a-f-]{36}$/i;
const fmt = (v: string | null) => (v === null ? '—' : Number(v).toLocaleString('pt-BR'));

// Simulado ou prova: regras, próximo passo e o histórico do aluno (AVA-03 a AVA-05, AVA-08).
export default async function AssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aviso?: string }>;
}) {
  const { id } = await params;
  const { aviso } = await searchParams;
  if (!UUID.test(id)) notFound();
  const ctx = await requireTenant(['student'], `/estudar/avaliacoes/${id}`);
  const all = await withTenantUser(db(), ctx.tenantId, ctx.user.id, (tx) =>
    studentAssessments(tx, ctx.user.id),
  );
  const a = all.find((x) => x.id === id);
  if (!a) notFound();
  const st = examState(a, a.attempts);
  const exam = a.kind === 'exam';
  return (
    <AppShell
      area="Estudar"
      tenantName={ctx.tenantName}
      canSwitch={ctx.user.memberships.length > 1}
    >
      <nav aria-label="Trilha" className="text-sm">
        <Link href="/estudar">Hoje</Link> <span className="text-muted">/</span> {a.title}
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={exam ? 'accent' : 'neutral'}>{exam ? 'Prova' : 'Simulado'}</Badge>
        <h1 className="text-3xl">{a.title}</h1>
      </div>
      <p className="text-muted">
        {a.subject} · {a.questionCount} questões
        {exam ? ` · nota mínima ${fmt(a.passingScore)}` : ' · treino, a correção aparece na hora'}
      </p>
      {aviso === 'indisponivel' ? (
        <Alert tone="warn">Essa avaliação não está disponível agora. Fale com o professor.</Alert>
      ) : null}
      {exam ? (
        <Card className="text-sm">
          Cada questão vale o mesmo. Se a nota ficar abaixo de {fmt(a.passingScore)}, você faz a
          recuperação: as questões que errou voltam em outro formato.
        </Card>
      ) : null}
      {st.passed ? <Alert tone="success">Você foi aprovado nesta prova. Parabéns!</Alert> : null}
      <div className="flex flex-wrap gap-3">
        {st.inProgress ? (
          <Link
            href={`/estudar/tentativas/${st.inProgress.id}`}
            className={buttonClass('primary', 'lg')}
          >
            Continuar
          </Link>
        ) : null}
        {st.canRetake ? (
          <StartAttemptForm
            assessmentId={a.id}
            retakeOf={st.retakeOf}
            label="Fazer a recuperação"
          />
        ) : null}
        {st.canStart ? (
          <StartAttemptForm
            assessmentId={a.id}
            label={a.attempts.length ? (exam ? 'Fazer de novo' : 'Treinar de novo') : 'Começar'}
            variant={st.canRetake ? 'secondary' : 'primary'}
          />
        ) : null}
      </div>
      {a.attempts.length ? (
        <section className="grid gap-2">
          <h2 className="text-xl">Histórico</h2>
          <ul className="grid gap-2">
            {a.attempts.map((t) => (
              <li key={t.id}>
                <Card className="flex flex-wrap items-center gap-3">
                  <span className="font-semibold">
                    {t.retakeOf ? 'Recuperação' : exam ? 'Prova' : 'Simulado'}
                  </span>
                  <span className="text-sm text-muted">
                    {t.startedAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                  </span>
                  {t.submittedAt ? (
                    <>
                      <span className="font-display text-xl tabular">{fmt(t.score)}</span>
                      {exam ? (
                        <Badge tone={t.passed ? 'success' : 'warn'}>
                          {t.passed ? 'Aprovado' : 'Abaixo da nota'}
                        </Badge>
                      ) : null}
                    </>
                  ) : (
                    <Badge>Em andamento</Badge>
                  )}
                  <Link href={`/estudar/tentativas/${t.id}`} className="ml-auto text-sm">
                    {t.submittedAt ? 'Ver correção' : 'Continuar'}
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </AppShell>
  );
}
