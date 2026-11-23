import type { Metadata } from 'next';
import { asc, eq, gradeLabel, isNull, schema, withTenantUser } from '@gutta/db-kids';
import { Card } from '@gutta/ui/card';
import { EmptyState } from '@gutta/ui/states';
import { AppShell } from '@/components/app-shell';
import { requireTenant } from '@/lib/auth/session';
import { db } from '@/lib/db';

export const metadata: Metadata = { title: 'Estudar' };

// Área do aluno. Na Fase 1 mostra a turma e as matérias; o plano de estudos chega na Fase 2.
export default async function StudyPage() {
  const ctx = await requireTenant(['student'], '/estudar');
  const rows = await withTenantUser(db(), ctx.tenantId, ctx.user.id, (tx) =>
    tx
      .select({
        className: schema.classes.name,
        stage: schema.grades.stage,
        number: schema.grades.number,
        subject: schema.subjects.name,
      })
      .from(schema.classMembers)
      .innerJoin(schema.classes, eq(schema.classes.id, schema.classMembers.classId))
      .innerJoin(schema.grades, eq(schema.grades.id, schema.classes.gradeId))
      .leftJoin(schema.teacherAssignments, eq(schema.teacherAssignments.classId, schema.classes.id))
      .leftJoin(schema.subjects, eq(schema.subjects.id, schema.teacherAssignments.subjectId))
      .where(isNull(schema.classMembers.leftAt))
      .orderBy(asc(schema.subjects.name)),
  );
  const first = rows[0];
  const subjects = [...new Set(rows.map((r) => r.subject).filter(Boolean))] as string[];
  return (
    <AppShell
      area="Estudar"
      tenantName={ctx.tenantName}
      canSwitch={ctx.user.memberships.length > 1}
    >
      <h1 className="text-3xl">Oi, {ctx.user.name.split(' ')[0]}!</h1>
      {first ? (
        <p className="text-muted">
          {first.className} · {gradeLabel(first.stage, first.number)}
        </p>
      ) : null}
      {subjects.length ? (
        <ul className="grid gap-3 sm:grid-cols-3">
          {subjects.map((s) => (
            <li key={s}>
              <Card>
                <p className="text-lg font-semibold">{s}</p>
                <p className="text-sm text-muted">O plano aparece aqui quando a escola publicar.</p>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Ainda não há nada aqui">
          O plano de estudos do seu ano aparece aqui quando a escola publicar.
        </EmptyState>
      )}
    </AppShell>
  );
}
