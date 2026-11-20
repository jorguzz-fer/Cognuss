import type { Metadata } from 'next';
import { asc, gradeLabel, schema, stageLabel, withTenantUser } from '@gutta/db-kids';
import { Card } from '@gutta/ui/card';
import { EmptyState } from '@gutta/ui/states';
import { AppShell } from '@/components/app-shell';
import { requireTenant } from '@/lib/auth/session';
import { db } from '@/lib/db';

export const metadata: Metadata = { title: 'Escola' };

// Área do gestor. Na Fase 0 mostra a estrutura da escola ativa, lida pelo RLS da instituição.
// Ativar etapas, anos e turmas chega na Fase 1 (EST-01 a EST-07).
export default async function SchoolPage() {
  const ctx = await requireTenant(['manager'], '/escola');
  const { stages, grades } = await withTenantUser(db(), ctx.tenantId, ctx.user.id, async (tx) => ({
    stages: await tx.select().from(schema.tenantStages).orderBy(asc(schema.tenantStages.stage)),
    grades: await tx
      .select()
      .from(schema.grades)
      .orderBy(asc(schema.grades.stage), asc(schema.grades.number)),
  }));
  return (
    <AppShell area="Gestão" tenantName={ctx.tenantName} canSwitch={ctx.user.memberships.length > 1}>
      <h1 className="text-3xl">Estrutura da escola</h1>
      {stages.length === 0 ? (
        <EmptyState title="Nenhuma etapa ativa">
          A ativação de etapas e anos chega na próxima fase.
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {stages.map((s) => (
            <Card key={s.id}>
              <h2 className="text-xl">{stageLabel(s.stage)}</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {grades
                  .filter((g) => g.stage === s.stage && g.active)
                  .map((g) => (
                    <li
                      key={g.id}
                      className="rounded-[var(--radius)] border border-line px-3 py-1 text-sm"
                    >
                      {gradeLabel(g.stage, g.number)}
                    </li>
                  ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
