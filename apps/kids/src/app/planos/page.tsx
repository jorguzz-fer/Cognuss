import type { Metadata } from 'next';
import Link from 'next/link';
import {
  and,
  asc,
  desc,
  eq,
  gradeLabel,
  isNull,
  PLAN_STATUS_LABEL,
  schema,
  withTenantUser,
} from '@gutta/db-kids';
import { Button } from '@gutta/ui/button';
import { Badge, Card } from '@gutta/ui/card';
import { Field, Input, Select } from '@gutta/ui/field';
import { EmptyState } from '@gutta/ui/states';
import { AppShell } from '@/components/app-shell';
import { Flash } from '@/components/flash';
import { requireTenant } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { PLAN_STATUS_TONE as STATUS_TONE } from '@/lib/labels';
import { createPlanAction } from './actions';

export const metadata: Metadata = { title: 'Planos de estudo' };

// PLA-01: planos da escola por ano e matéria. A gestão vê e cria todos; o professor cria para
// o ano e a matéria que leciona (o RLS confere).
export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string }>;
}) {
  const { aviso } = await searchParams;
  const ctx = await requireTenant(['manager', 'teacher'], '/planos');
  const manager = ctx.roles.includes('manager');
  const data = await withTenantUser(db(), ctx.tenantId, ctx.user.id, async (tx) => {
    const plans = await tx
      .select({
        id: schema.studyPlans.id,
        title: schema.studyPlans.title,
        status: schema.studyPlans.status,
        version: schema.studyPlans.version,
        schoolYear: schema.studyPlans.schoolYear,
        stage: schema.grades.stage,
        number: schema.grades.number,
        subject: schema.subjects.name,
        author: schema.authUsers.name,
      })
      .from(schema.studyPlans)
      .innerJoin(schema.grades, eq(schema.grades.id, schema.studyPlans.gradeId))
      .innerJoin(schema.subjects, eq(schema.subjects.id, schema.studyPlans.subjectId))
      .leftJoin(schema.authUsers, eq(schema.authUsers.id, schema.studyPlans.authorId))
      .orderBy(
        asc(schema.grades.number),
        asc(schema.subjects.name),
        desc(schema.studyPlans.version),
      );
    // Pares (ano, matéria) em que esta pessoa pode criar plano.
    const pairs = manager
      ? await tx
          .select({
            gradeId: schema.grades.id,
            stage: schema.grades.stage,
            number: schema.grades.number,
            subjectId: schema.subjects.id,
            subject: schema.subjects.name,
          })
          .from(schema.grades)
          .innerJoin(schema.subjects, isNull(schema.subjects.archivedAt))
          .where(eq(schema.grades.active, true))
          .orderBy(asc(schema.grades.number), asc(schema.subjects.name))
      : await tx
          .selectDistinct({
            gradeId: schema.grades.id,
            stage: schema.grades.stage,
            number: schema.grades.number,
            subjectId: schema.subjects.id,
            subject: schema.subjects.name,
          })
          .from(schema.teacherAssignments)
          .innerJoin(schema.classes, eq(schema.classes.id, schema.teacherAssignments.classId))
          .innerJoin(schema.grades, eq(schema.grades.id, schema.classes.gradeId))
          .innerJoin(schema.subjects, eq(schema.subjects.id, schema.teacherAssignments.subjectId))
          .where(
            and(
              eq(schema.teacherAssignments.userId, ctx.user.id),
              isNull(schema.classes.archivedAt),
            ),
          )
          .orderBy(asc(schema.grades.number), asc(schema.subjects.name));
    return { plans, pairs };
  });
  const year = new Date().getFullYear();
  return (
    <AppShell
      area={manager ? 'Gestão' : 'Professor'}
      tenantName={ctx.tenantName}
      canSwitch={ctx.user.memberships.length > 1}
    >
      <nav aria-label="Trilha" className="text-sm">
        <Link href={manager ? '/escola' : '/professor'}>
          {manager ? 'Escola' : 'Minhas turmas'}
        </Link>{' '}
        <span className="text-muted">/</span> Planos
      </nav>
      <h1 className="text-3xl">Planos de estudo</h1>
      <Flash code={aviso} />
      {data.pairs.length ? (
        <Card>
          <form
            action={createPlanAction}
            className="grid gap-3 sm:grid-cols-[1fr_1fr_8rem_auto] sm:items-end"
          >
            <Field label="Ano e matéria">
              {(p) => (
                <Select {...p} name="pair" required>
                  {data.pairs.map((x) => (
                    <option
                      key={`${x.gradeId}:${x.subjectId}`}
                      value={`${x.gradeId}:${x.subjectId}`}
                    >
                      {gradeLabel(x.stage, x.number)} · {x.subject}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Título do plano" hint="Exemplo: Vertebrados (prova de novembro)">
              {(p) => <Input {...p} name="title" required minLength={3} maxLength={120} />}
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
                />
              )}
            </Field>
            <Button type="submit">Novo plano</Button>
          </form>
        </Card>
      ) : (
        <p className="text-muted">
          Para criar planos, a gestão precisa ligar você a uma turma e uma matéria.
        </p>
      )}
      {data.plans.length === 0 ? (
        <EmptyState title="Nenhum plano ainda">Crie o primeiro plano acima.</EmptyState>
      ) : (
        <ul className="grid gap-2">
          {data.plans.map((p) => (
            <li key={p.id}>
              <Card className="flex flex-wrap items-center gap-3">
                <Link href={`/planos/${p.id}`} className="text-lg font-semibold">
                  {p.title}
                </Link>
                <Badge tone={STATUS_TONE[p.status]}>{PLAN_STATUS_LABEL[p.status]}</Badge>
                <span className="text-sm text-muted">
                  {gradeLabel(p.stage, p.number)} · {p.subject} · {p.schoolYear} · versão{' '}
                  {p.version}
                  {p.author ? ` · ${p.author}` : ''}
                </span>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
