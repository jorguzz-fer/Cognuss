import type { Metadata } from 'next';
import { asc, gradeLabel, schema, STAGE_GRADES, stageLabel, withTenantUser } from '@gutta/db-kids';
import { Button } from '@gutta/ui/button';
import { Badge, Card } from '@gutta/ui/card';
import { AppShell } from '@/components/app-shell';
import { Flash } from '@/components/flash';
import { SchoolNav } from '@/components/school-nav';
import { requireTenant } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { setGrade, setStage } from '../actions';

export const metadata: Metadata = { title: 'Etapas e anos' };

const STAGES = ['fundamental', 'medio'] as const;

// EST-01, EST-02, EST-03 e EST-07. O rótulo do ano é calculado (3º ano, 1ª série).
export default async function StructurePage({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string }>;
}) {
  const { aviso } = await searchParams;
  const ctx = await requireTenant(['manager'], '/escola/estrutura');
  const { stages, grades } = await withTenantUser(db(), ctx.tenantId, ctx.user.id, async (tx) => ({
    stages: await tx.select().from(schema.tenantStages),
    grades: await tx.select().from(schema.grades).orderBy(asc(schema.grades.number)),
  }));
  return (
    <AppShell area="Gestão" tenantName={ctx.tenantName} canSwitch={ctx.user.memberships.length > 1}>
      <h1 className="text-3xl">Etapas e anos</h1>
      <SchoolNav current="/escola/estrutura" />
      <Flash code={aviso} />
      <p className="max-w-prose text-muted">
        Ative só o que a escola oferece. Desativar esconde o ano dos alunos, mas não apaga nada.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {STAGES.map((st) => {
          const active = stages.find((s) => s.stage === st)?.active ?? false;
          return (
            <Card key={st} className="grid gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl">{stageLabel(st)}</h2>
                <Badge tone={active ? 'success' : 'neutral'}>{active ? 'Ativa' : 'Inativa'}</Badge>
              </div>
              <form action={setStage} className="flex flex-wrap items-center gap-3">
                <input type="hidden" name="stage" value={st} />
                <input type="hidden" name="active" value={active ? 'off' : 'on'} />
                {active ? (
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="confirm"
                      className="size-5 accent-[var(--accent)]"
                    />
                    Confirmo desativar a etapa e todos os anos dela
                  </label>
                ) : null}
                <Button type="submit" variant={active ? 'danger' : 'primary'}>
                  {active ? 'Desativar etapa' : 'Ativar etapa'}
                </Button>
              </form>
              {active ? (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {STAGE_GRADES[st].map((number) => {
                    const g = grades.find((x) => x.stage === st && x.number === number);
                    if (!g) return null;
                    return (
                      <li
                        key={g.id}
                        className="grid gap-2 rounded-[var(--radius)] border border-line p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">{gradeLabel(st, number)}</span>
                          <Badge tone={g.active ? 'success' : 'neutral'}>
                            {g.active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        <form action={setGrade} className="grid gap-2">
                          <input type="hidden" name="gradeId" value={g.id} />
                          <input type="hidden" name="active" value={g.active ? 'off' : 'on'} />
                          {g.active ? (
                            <label className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                name="confirm"
                                className="size-4 accent-[var(--accent)]"
                              />
                              Confirmo desativar
                            </label>
                          ) : null}
                          <Button type="submit" variant={g.active ? 'secondary' : 'primary'}>
                            {g.active ? 'Desativar' : 'Ativar'}
                          </Button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
