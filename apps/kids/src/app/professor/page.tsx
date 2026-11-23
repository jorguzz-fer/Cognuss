import type { Metadata } from 'next';
import Link from 'next/link';
import { asc, eq, gradeLabel, schema, withTenantUser } from '@gutta/db-kids';
import { Card } from '@gutta/ui/card';
import { EmptyState } from '@gutta/ui/states';
import { AppShell } from '@/components/app-shell';
import { requireTenant } from '@/lib/auth/session';
import { db } from '@/lib/db';

export const metadata: Metadata = { title: 'Minhas turmas' };

// Área do professor: as turmas e matérias ligadas a ele (USR-04). Os planos chegam na Fase 2.
export default async function TeacherPage() {
  const ctx = await requireTenant(['teacher'], '/professor');
  const rows = await withTenantUser(db(), ctx.tenantId, ctx.user.id, (tx) =>
    tx
      .select({
        classId: schema.classes.id,
        className: schema.classes.name,
        schoolYear: schema.classes.schoolYear,
        stage: schema.grades.stage,
        number: schema.grades.number,
        subject: schema.subjects.name,
      })
      .from(schema.teacherAssignments)
      .innerJoin(schema.classes, eq(schema.classes.id, schema.teacherAssignments.classId))
      .innerJoin(schema.grades, eq(schema.grades.id, schema.classes.gradeId))
      .innerJoin(schema.subjects, eq(schema.subjects.id, schema.teacherAssignments.subjectId))
      .where(eq(schema.teacherAssignments.userId, ctx.user.id))
      .orderBy(asc(schema.grades.number), asc(schema.classes.name), asc(schema.subjects.name)),
  );
  const classes = new Map<string, { title: string; subjects: string[] }>();
  for (const r of rows) {
    const c = classes.get(r.classId) ?? {
      title: `${r.className} · ${gradeLabel(r.stage, r.number)} · ${r.schoolYear}`,
      subjects: [],
    };
    c.subjects.push(r.subject);
    classes.set(r.classId, c);
  }
  return (
    <AppShell
      area="Professor"
      tenantName={ctx.tenantName}
      canSwitch={ctx.user.memberships.length > 1}
    >
      <h1 className="text-3xl">Minhas turmas</h1>
      {classes.size === 0 ? (
        <EmptyState title="Nenhuma turma ligada a você">
          A gestão da escola liga cada professor às turmas e matérias que ele leciona.
        </EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {[...classes].map(([id, c]) => (
            <li key={id}>
              <Card>
                <Link href={`/professor/turmas/${id}`} className="text-lg font-semibold">
                  {c.title}
                </Link>
                <p className="text-sm text-muted">{c.subjects.join(', ')}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
