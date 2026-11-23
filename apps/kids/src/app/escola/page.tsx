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
    </AppShell>
  );
}
