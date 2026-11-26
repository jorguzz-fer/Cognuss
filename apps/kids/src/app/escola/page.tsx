import type { Metadata } from 'next';
import Link from 'next/link';
import { count, eq, isNull, schema, sql, withTenantUser } from '@gutta/db-kids';
import { Card } from '@gutta/ui/card';
import { AppShell } from '@/components/app-shell';
import { Flash } from '@/components/flash';
import { SchoolNav } from '@/components/school-nav';
import { requireTenant } from '@/lib/auth/session';
import { db } from '@/lib/db';

export const metadata: Metadata = { title: 'Escola' };

// Visão geral da gestão: o que falta configurar e os números da escola.
export default async function SchoolPage({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string }>;
}) {
  const { aviso } = await searchParams;
  const ctx = await requireTenant(['manager'], '/escola');
  const n = await withTenantUser(db(), ctx.tenantId, ctx.user.id, async (tx) => {
    const one = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;
    return {
      grades: await one(
        tx.select({ n: count() }).from(schema.grades).where(eq(schema.grades.active, true)),
      ),
      classes: await one(
        tx.select({ n: count() }).from(schema.classes).where(isNull(schema.classes.archivedAt)),
      ),
      subjects: await one(
        tx.select({ n: count() }).from(schema.subjects).where(isNull(schema.subjects.archivedAt)),
      ),
      teachers: await one(
        tx
          .select({ n: count() })
          .from(schema.memberships)
          .where(
            sql`${schema.memberships.role} = 'teacher' and ${schema.memberships.status} = 'active'`,
          ),
      ),
      students: await one(
        tx
          .select({ n: count() })
          .from(schema.memberships)
          .where(
            sql`${schema.memberships.role} = 'student' and ${schema.memberships.status} = 'active'`,
          ),
      ),
      // PAI-03: só agregados, sem ranking de alunos (PAI-04).
      stats: (
        await tx.execute<{
          active: number;
          plans: number;
          first_total: number;
          first_passed: number;
          failed_first: number;
          recovered: number;
        }>(sql`
          with firsts as (
            select distinct on (aa.user_id, aa.assessment_id) aa.user_id, aa.assessment_id, aa.passed
            from assessment_attempts aa join assessments a on a.id = aa.assessment_id
            where a.kind = 'exam' and aa.retake_of is null and aa.submitted_at is not null
            order by aa.user_id, aa.assessment_id, aa.submitted_at
          )
          select
            (select count(distinct u)::int from (
              select user_id u from topic_progress where completed_at > now() - interval '7 days'
              union select user_id from flashcard_schedules where last_reviewed_at > now() - interval '7 days'
              union select user_id from assessment_attempts where submitted_at > now() - interval '7 days'
            ) x) as active,
            (select count(*)::int from study_plans where status = 'published') as plans,
            (select count(*)::int from firsts) as first_total,
            (select count(*)::int from firsts where passed) as first_passed,
            (select count(*)::int from firsts where not passed) as failed_first,
            (select count(*)::int from firsts f where not f.passed and exists (
              select 1 from assessment_attempts r where r.user_id = f.user_id
                and r.assessment_id = f.assessment_id and r.passed)) as recovered`)
      ).rows[0]!,
    };
  });
  const steps = [
    {
      done: n.grades > 0,
      href: '/escola/estrutura',
      text: 'Ative as etapas e os anos que a escola oferece',
    },
    { done: n.subjects > 0, href: '/escola/materias', text: 'Cadastre as matérias' },
    { done: n.classes > 0, href: '/escola/turmas', text: 'Crie as turmas' },
    { done: n.teachers > 0, href: '/escola/pessoas', text: 'Convide os professores' },
    { done: n.students > 0, href: '/escola/turmas', text: 'Cadastre os alunos nas turmas' },
  ];
  const next = steps.find((s) => !s.done);
  return (
    <AppShell area="Gestão" tenantName={ctx.tenantName} canSwitch={ctx.user.memberships.length > 1}>
      <h1 className="text-3xl">{ctx.tenantName}</h1>
      <SchoolNav current="/escola" />
      <Flash code={aviso} />
      {next ? (
        <Card>
          <p className="font-mono text-xs font-semibold tracking-widest text-muted uppercase">
            Próximo passo
          </p>
          <p className="mt-1 text-lg">
            <Link href={next.href}>{next.text}</Link>
          </p>
          <p className="mt-1 text-sm text-muted">
            {steps.filter((s) => s.done).length} de {steps.length} passos feitos
          </p>
        </Card>
      ) : null}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ['Anos ativos', n.grades],
          ['Turmas', n.classes],
          ['Matérias', n.subjects],
          ['Professores', n.teachers],
          ['Alunos', n.students],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="font-display text-3xl tabular">{value}</dd>
          </Card>
        ))}
      </dl>
      <section className="grid gap-2">
        <h2 className="text-xl">Estudo e provas</h2>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          {[
            ['Planos publicados', String(n.stats.plans)],
            ['Alunos ativos na semana', `${n.stats.active} de ${n.students}`],
            ['Aprovados na primeira prova', pct(n.stats.first_passed, n.stats.first_total)],
            ['Aprovados depois da recuperação', pct(n.stats.recovered, n.stats.failed_first)],
          ].map(([label, value]) => (
            <Card key={label}>
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="font-display text-2xl tabular">{value}</dd>
            </Card>
          ))}
        </dl>
        <p className="text-sm text-muted">
          Só números da escola, sem ranking. O detalhe por aluno fica com o professor da turma.
        </p>
      </section>
    </AppShell>
  );
}

/** Porcentagem inteira, ou travessão quando ainda não há prova enviada. */
function pct(part: number, total: number) {
  return total ? `${Math.round((part / total) * 100)}%` : '—';
}
