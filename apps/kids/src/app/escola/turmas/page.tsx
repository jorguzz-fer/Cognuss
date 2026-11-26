import type { Metadata } from 'next';
import Link from 'next/link';
import { and, asc, count, eq, gradeLabel, isNull, schema, withTenantUser } from '@gutta/db-kids';
import { Button } from '@gutta/ui/button';
import { Card } from '@gutta/ui/card';
import { Field, Input, Select } from '@gutta/ui/field';
import { EmptyState } from '@gutta/ui/states';
import { AppShell } from '@/components/app-shell';
import { Flash } from '@/components/flash';
import { SchoolNav } from '@/components/school-nav';
import { requireTenant } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { createClass } from '../actions';

export const metadata: Metadata = { title: 'Turmas' };

// EST-05: turmas por ano/série e ano letivo, com o código de entrada dos alunos.
export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string }>;
}) {
  const { aviso } = await searchParams;
  const ctx = await requireTenant(['manager'], '/escola/turmas');
  const { grades, classes } = await withTenantUser(db(), ctx.tenantId, ctx.user.id, async (tx) => ({
    grades: await tx
      .select()
      .from(schema.grades)
      .where(eq(schema.grades.active, true))
      .orderBy(asc(schema.grades.stage), asc(schema.grades.number)),
    classes: await tx
      .select({
        id: schema.classes.id,
        name: schema.classes.name,
        schoolYear: schema.classes.schoolYear,
        joinCode: schema.classes.joinCode,
        gradeId: schema.classes.gradeId,
        students: count(schema.classMembers.id),
      })
      .from(schema.classes)
      .leftJoin(
        schema.classMembers,
        and(eq(schema.classMembers.classId, schema.classes.id), isNull(schema.classMembers.leftAt)),
      )
      .where(isNull(schema.classes.archivedAt))
      .groupBy(schema.classes.id)
      .orderBy(asc(schema.classes.name)),
  }));
  const year = new Date().getFullYear();
  return (
    <AppShell area="Gestão" tenantName={ctx.tenantName} canSwitch={ctx.user.memberships.length > 1}>
      <h1 className="text-3xl">Turmas</h1>
      <SchoolNav current="/escola/turmas" />
      <Flash code={aviso} />
      {grades.length === 0 ? (
        <EmptyState title="Nenhum ano ativo">
          Ative os anos em <Link href="/escola/estrutura">Etapas e anos</Link> para criar turmas.
        </EmptyState>
      ) : (
        <Card>
          <form
            action={createClass}
            className="grid gap-3 sm:grid-cols-[1fr_1fr_8rem_auto] sm:items-end"
          >
            <Field label="Ano/série">
              {(p) => (
                <Select {...p} name="gradeId" required>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {gradeLabel(g.stage, g.number)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Nome da turma" hint="Exemplo: 3º A">
              {(p) => <Input {...p} name="name" required maxLength={40} />}
            </Field>
            <Field label="Ano letivo">
              {(p) => (
                <Input
                  {...p}
                  name="schoolYear"
                  type="number"
                  min={2020}
                  max={2100}
                  defaultValue={year}
                  required
                />
              )}
            </Field>
            <Button type="submit">Criar turma</Button>
          </form>
        </Card>
      )}
      {grades.map((g) => {
        const list = classes.filter((c) => c.gradeId === g.id);
        if (list.length === 0) return null;
        return (
          <section key={g.id} className="grid gap-2">
            <h2 className="text-xl">{gradeLabel(g.stage, g.number)}</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {list.map((c) => (
                <li key={c.id}>
                  <Card>
                    <Link href={`/escola/turmas/${c.id}`} className="text-lg font-semibold">
                      {c.name}
                    </Link>
                    <p className="text-sm text-muted">
                      {c.schoolYear} · código{' '}
                      <span className="font-mono text-fg">{c.joinCode}</span> · {c.students}{' '}
                      {c.students === 1 ? 'aluno' : 'alunos'}
                    </p>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </AppShell>
  );
}
