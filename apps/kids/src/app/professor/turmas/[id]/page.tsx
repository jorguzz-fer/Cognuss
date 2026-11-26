import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, eq, isNull, schema, sql, withTenantUser } from '@gutta/db-kids';
import { Badge, Card } from '@gutta/ui/card';
import { EmptyState } from '@gutta/ui/states';
import { AppShell } from '@/components/app-shell';
import { ResetPasswordForm } from '@/components/school/student-forms';
import { requireTenant } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { resetStudentPassword } from '../../../escola/turmas/[id]/student-actions';

export const metadata: Metadata = { title: 'Turma' };

const UUID = /^[0-9a-f-]{36}$/i;

// Alunos de uma turma do professor. O RLS só devolve a turma se ele estiver ligado a ela.
export default async function TeacherClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const ctx = await requireTenant(['teacher'], `/professor/turmas/${id}`);
  const data = await withTenantUser(db(), ctx.tenantId, ctx.user.id, async (tx) => {
    const mine = await tx.query.teacherAssignments.findFirst({
      where: and(
        eq(schema.teacherAssignments.classId, id),
        eq(schema.teacherAssignments.userId, ctx.user.id),
      ),
    });
    if (!mine) return null;
    const klass = await tx.query.classes.findFirst({ where: eq(schema.classes.id, id) });
    const students = await tx
      .select({
        userId: schema.authUsers.id,
        name: schema.authUsers.name,
        username: schema.authUsers.username,
      })
      .from(schema.classMembers)
      .innerJoin(schema.authUsers, eq(schema.authUsers.id, schema.classMembers.userId))
      .where(and(eq(schema.classMembers.classId, id), isNull(schema.classMembers.leftAt)))
      .orderBy(asc(schema.authUsers.name));
    // PAI-02: por aluno, tópicos estudados dos planos publicados das matérias deste professor
    // nesta turma, e a situação na prova mais recente. O RLS só mostra alunos das turmas dele.
    const progress = await tx.execute<{
      user_id: string;
      done: number;
      total: number;
      score: string | null;
      passed: boolean | null;
      retakes: number;
    }>(sql`
      with plans as (
        select sp.id from study_plans sp
        join teacher_assignments ta on ta.subject_id = sp.subject_id and ta.user_id = ${ctx.user.id}
          and ta.class_id = ${id}
        where sp.status = 'published' and sp.grade_id = ${klass!.gradeId}
      ),
      topics as (select pt.id from plan_topics pt where pt.plan_id in (select id from plans)),
      last_exam as (
        select distinct on (aa.user_id) aa.user_id, aa.score, aa.passed
        from assessment_attempts aa join assessments a on a.id = aa.assessment_id
        where a.kind = 'exam' and a.plan_id in (select id from plans) and aa.submitted_at is not null
        order by aa.user_id, aa.submitted_at desc
      )
      select cm.user_id,
        (select count(*)::int from topic_progress tp where tp.user_id = cm.user_id and tp.topic_id in (select id from topics)) as done,
        (select count(*)::int from topics) as total,
        le.score, le.passed,
        (select count(*)::int from assessment_attempts aa join assessments a on a.id = aa.assessment_id
          where aa.user_id = cm.user_id and aa.retake_of is not null and a.plan_id in (select id from plans)) as retakes
      from class_members cm left join last_exam le on le.user_id = cm.user_id
      where cm.class_id = ${id} and cm.left_at is null`);
    return { klass, students, progress: progress.rows };
  });
  if (!data?.klass) notFound();
  return (
    <AppShell
      area="Professor"
      tenantName={ctx.tenantName}
      canSwitch={ctx.user.memberships.length > 1}
    >
      <nav aria-label="Trilha" className="text-sm">
        <Link href="/professor">Minhas turmas</Link> <span className="text-muted">/</span>{' '}
        {data.klass.name}
      </nav>
      <h1 className="text-3xl">{data.klass.name}</h1>
      <Card>
        <p className="text-sm text-muted">Código da turma</p>
        <p className="font-mono text-3xl tracking-[0.2em]">{data.klass.joinCode}</p>
      </Card>
      {data.students.length === 0 ? (
        <EmptyState title="Nenhum aluno na turma">A gestão cadastra os alunos.</EmptyState>
      ) : (
        <ul className="grid gap-2">
          {data.students.map((s) => (
            <li
              key={s.userId}
              className="grid gap-2 rounded-[var(--radius)] border border-line px-4 py-2 sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <span>
                {s.name}
                {s.username ? (
                  <span className="ml-2 font-mono text-sm text-muted">{s.username}</span>
                ) : null}
                <StudentStatus p={data.progress.find((p) => p.user_id === s.userId)} />
              </span>
              {s.username ? (
                <ResetPasswordForm userId={s.userId} action={resetStudentPassword} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}

function StudentStatus({
  p,
}: {
  p?: {
    done: number;
    total: number;
    score: string | null;
    passed: boolean | null;
    retakes: number;
  };
}) {
  if (!p) return null;
  return (
    <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
      <span>
        {p.done} de {p.total} tópicos
      </span>
      {p.score !== null ? (
        <>
          <span>· prova {Number(p.score).toLocaleString('pt-BR')}</span>
          <Badge tone={p.passed ? 'success' : 'warn'}>
            {p.passed ? 'Aprovado' : 'Abaixo da nota'}
          </Badge>
          {p.retakes ? <span>· {p.retakes} recuperação(ões)</span> : null}
        </>
      ) : null}
    </span>
  );
}
