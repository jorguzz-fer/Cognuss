import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, eq, isNull, schema, withTenantUser } from '@gutta/db-kids';
import { Card } from '@gutta/ui/card';
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
    return { klass, students };
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
