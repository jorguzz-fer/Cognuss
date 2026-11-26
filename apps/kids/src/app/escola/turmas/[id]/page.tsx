import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, eq, gradeLabel, isNull, schema, withTenantUser } from '@gutta/db-kids';
import { Button } from '@gutta/ui/button';
import { Card } from '@gutta/ui/card';
import { Field, Select } from '@gutta/ui/field';
import { EmptyState } from '@gutta/ui/states';
import { AppShell } from '@/components/app-shell';
import { Flash } from '@/components/flash';
import { SchoolNav } from '@/components/school-nav';
import {
  AddStudentForm,
  ImportStudentsForm,
  ResetPasswordForm,
} from '@/components/school/student-forms';
import { requireTenant } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { assignTeacher, removeFromClass, unassignTeacher } from '../../actions';
import { addStudent, importStudents, resetStudentPassword } from './student-actions';

export const metadata: Metadata = { title: 'Turma' };

const UUID = /^[0-9a-f-]{36}$/i;

// Turma: código de entrada, alunos (USR-02, USR-03, USR-07) e professores por matéria (USR-04).
export default async function ClassPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aviso?: string }>;
}) {
  const { id } = await params;
  const { aviso } = await searchParams;
  if (!UUID.test(id)) notFound();
  const ctx = await requireTenant(['manager'], `/escola/turmas/${id}`);
  const data = await withTenantUser(db(), ctx.tenantId, ctx.user.id, async (tx) => {
    const klass = await tx.query.classes.findFirst({ where: eq(schema.classes.id, id) });
    if (!klass) return null;
    const grade = await tx.query.grades.findFirst({ where: eq(schema.grades.id, klass.gradeId) });
    const students = await tx
      .select({
        memberId: schema.classMembers.id,
        userId: schema.authUsers.id,
        name: schema.authUsers.name,
        username: schema.authUsers.username,
      })
      .from(schema.classMembers)
      .innerJoin(schema.authUsers, eq(schema.authUsers.id, schema.classMembers.userId))
      .where(and(eq(schema.classMembers.classId, id), isNull(schema.classMembers.leftAt)))
      .orderBy(asc(schema.authUsers.name));
    const assignments = await tx
      .select({
        id: schema.teacherAssignments.id,
        teacher: schema.authUsers.name,
        subject: schema.subjects.name,
      })
      .from(schema.teacherAssignments)
      .innerJoin(schema.authUsers, eq(schema.authUsers.id, schema.teacherAssignments.userId))
      .innerJoin(schema.subjects, eq(schema.subjects.id, schema.teacherAssignments.subjectId))
      .where(eq(schema.teacherAssignments.classId, id))
      .orderBy(asc(schema.subjects.name));
    const teachers = await tx
      .select({ id: schema.authUsers.id, name: schema.authUsers.name })
      .from(schema.memberships)
      .innerJoin(schema.authUsers, eq(schema.authUsers.id, schema.memberships.userId))
      .where(and(eq(schema.memberships.role, 'teacher'), eq(schema.memberships.status, 'active')))
      .orderBy(asc(schema.authUsers.name));
    const subjects = await tx
      .select()
      .from(schema.subjects)
      .where(isNull(schema.subjects.archivedAt))
      .orderBy(asc(schema.subjects.name));
    return { klass, grade, students, assignments, teachers, subjects };
  });
  if (!data) notFound();
  const { klass, grade, students, assignments, teachers, subjects } = data;
  return (
    <AppShell area="Gestão" tenantName={ctx.tenantName} canSwitch={ctx.user.memberships.length > 1}>
      <nav aria-label="Trilha" className="text-sm">
        <Link href="/escola/turmas">Turmas</Link> <span className="text-muted">/</span> {klass.name}
      </nav>
      <h1 className="text-3xl">
        {klass.name}{' '}
        <span className="text-lg text-muted">
          · {grade ? gradeLabel(grade.stage, grade.number) : ''} · {klass.schoolYear}
        </span>
      </h1>
      <SchoolNav current="/escola/turmas" />
      <Flash code={aviso} />

      <Card>
        <p className="text-sm text-muted">Código da turma (para o login dos alunos)</p>
        <p className="font-mono text-3xl tracking-[0.2em]">{klass.joinCode}</p>
      </Card>

      <section className="grid gap-3">
        <h2 className="text-xl">Professores</h2>
        {assignments.length ? (
          <ul className="grid gap-2">
            {assignments.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius)] border border-line px-4 py-2"
              >
                <span>
                  {a.subject} <span className="text-muted">· {a.teacher}</span>
                </span>
                <form action={unassignTeacher}>
                  <input type="hidden" name="assignmentId" value={a.id} />
                  <input type="hidden" name="classId" value={klass.id} />
                  <Button type="submit" variant="ghost">
                    Desligar
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">Nenhum professor ligado a esta turma.</p>
        )}
        {teachers.length && subjects.length ? (
          <form
            action={assignTeacher}
            className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          >
            <input type="hidden" name="classId" value={klass.id} />
            <Field label="Professor">
              {(p) => (
                <Select {...p} name="userId" required>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Matéria">
              {(p) => (
                <Select {...p} name="subjectId" required>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Button type="submit" variant="secondary">
              Ligar
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted">
            Para ligar professores, convide-os em <Link href="/escola/pessoas">Pessoas</Link> e
            cadastre as <Link href="/escola/materias">Matérias</Link>.
          </p>
        )}
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl">Alunos ({students.length})</h2>
        {students.length === 0 ? (
          <EmptyState title="Nenhum aluno na turma">
            Adicione um por vez ou cole a lista da turma.
          </EmptyState>
        ) : (
          <ul className="grid gap-2">
            {students.map((s) => (
              <li
                key={s.memberId}
                className="grid gap-2 rounded-[var(--radius)] border border-line px-4 py-2 sm:grid-cols-[1fr_auto_auto] sm:items-center"
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
                <form action={removeFromClass}>
                  <input type="hidden" name="memberId" value={s.memberId} />
                  <input type="hidden" name="classId" value={klass.id} />
                  <Button type="submit" variant="ghost">
                    Tirar da turma
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <Card className="grid gap-6">
          <AddStudentForm classId={klass.id} action={addStudent} />
          <ImportStudentsForm classId={klass.id} action={importStudents} />
        </Card>
      </section>
    </AppShell>
  );
}
