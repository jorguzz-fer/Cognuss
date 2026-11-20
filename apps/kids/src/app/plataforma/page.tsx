import type { Metadata } from 'next';
import { asc, schema, withPlatformAdmin } from '@gutta/db-kids';
import { Badge, Card } from '@gutta/ui/card';
import { EmptyState } from '@gutta/ui/states';
import { AppShell } from '@/components/app-shell';
import { requirePlatformAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db';

export const metadata: Metadata = { title: 'Plataforma' };

const STATUS = { active: 'Ativa', suspended: 'Suspensa', closed: 'Encerrada' } as const;

// Área do Super Admin. Toda leitura passa por withPlatformAdmin, que grava o motivo na
// auditoria. Cadastrar e suspender instituições chega na Fase 1 (INS-01 a INS-03).
export default async function PlatformPage() {
  const user = await requirePlatformAdmin();
  const tenants = await withPlatformAdmin(
    db(),
    { userId: user.id, tenantId: null, reason: 'listar instituições' },
    (tx) => tx.select().from(schema.tenants).orderBy(asc(schema.tenants.name)),
  );
  return (
    <AppShell area="Plataforma">
      <h1 className="text-3xl">Instituições</h1>
      {tenants.length === 0 ? (
        <EmptyState title="Nenhuma instituição cadastrada">
          O cadastro de instituições chega na próxima fase.
        </EmptyState>
      ) : (
        <ul className="grid gap-3">
          {tenants.map((t) => (
            <li key={t.id}>
              <Card>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg">{t.name}</h2>
                  <Badge>{STATUS[t.status]}</Badge>
                  <span className="text-sm text-muted">
                    {t.city}/{t.state}
                  </span>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
