import type { Metadata } from 'next';
import { asc, isNull, schema, withTenantUser } from '@gutta/db-kids';
import { Button } from '@gutta/ui/button';
import { Card } from '@gutta/ui/card';
import { Field, Input } from '@gutta/ui/field';
import { EmptyState } from '@gutta/ui/states';
import { AppShell } from '@/components/app-shell';
import { Flash } from '@/components/flash';
import { SchoolNav } from '@/components/school-nav';
import { requireTenant } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { addSubject, addSuggestedSubjects, archiveSubject } from '../actions';

export const metadata: Metadata = { title: 'Matérias' };

// EST-06: matérias da escola. A lista da BNCC é só uma sugestão para começar.
export default async function SubjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string }>;
}) {
  const { aviso } = await searchParams;
  const ctx = await requireTenant(['manager'], '/escola/materias');
  const subjects = await withTenantUser(db(), ctx.tenantId, ctx.user.id, (tx) =>
    tx
      .select()
      .from(schema.subjects)
      .where(isNull(schema.subjects.archivedAt))
      .orderBy(asc(schema.subjects.name)),
  );
  return (
    <AppShell area="Gestão" tenantName={ctx.tenantName} canSwitch={ctx.user.memberships.length > 1}>
      <h1 className="text-3xl">Matérias</h1>
      <SchoolNav current="/escola/materias" />
      <Flash code={aviso} />
      <Card className="grid gap-4">
        <form action={addSubject} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="Nova matéria">
            {(p) => <Input {...p} name="name" required minLength={2} maxLength={60} />}
          </Field>
          <Button type="submit">Adicionar</Button>
        </form>
        <form action={addSuggestedSubjects}>
          <Button type="submit" variant="secondary">
            Adicionar as sugeridas pela BNCC
          </Button>
        </form>
      </Card>
      {subjects.length === 0 ? (
        <EmptyState title="Nenhuma matéria ainda">
          Adicione uma por vez ou use a lista sugerida pela BNCC para as etapas ativas.
        </EmptyState>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {subjects.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-line px-4 py-2"
            >
              <span>{s.name}</span>
              <form action={archiveSubject}>
                <input type="hidden" name="subjectId" value={s.id} />
                <Button type="submit" variant="ghost">
                  Arquivar
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
