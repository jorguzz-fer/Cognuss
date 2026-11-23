import type { Metadata } from 'next';
import Link from 'next/link';
import { asc, schema, withPlatformAdmin } from '@gutta/db-kids';
import { buttonClass } from '@gutta/ui/button';
import { Badge, Card } from '@gutta/ui/card';
import { EmptyState } from '@gutta/ui/states';
import { AppShell } from '@/components/app-shell';
import { Flash } from '@/components/flash';
import { requirePlatformAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { TENANT_STATUS as STATUS } from '@/lib/labels';

export const metadata: Metadata = { title: 'Plataforma' };

// Área do Super Admin (INS). Toda leitura passa por withPlatformAdmin, com o motivo na auditoria.
export default async function PlatformPage({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string }>;
}) {
  const { aviso } = await searchParams;
  const user = await requirePlatformAdmin();
  const tenants = await withPlatformAdmin(
    db(),
    { userId: user.id, tenantId: null, reason: 'listar instituições' },
    (tx) => tx.select().from(schema.tenants).orderBy(asc(schema.tenants.name)),
  );
  return (
    <AppShell area="Plataforma">
      <Flash code={aviso} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl">Instituições</h1>
        <Link href="/plataforma/nova" className={buttonClass()}>
          Nova instituição
        </Link>
      </div>
      {tenants.length === 0 ? (
        <EmptyState title="Nenhuma instituição cadastrada">
          Cadastre a primeira escola e convide a gestão dela.
        </EmptyState>
      ) : (
        <ul className="grid gap-3">
          {tenants.map((t) => (
            <li key={t.id}>
              <Card>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg">
                    <Link href={`/plataforma/${t.id}`}>{t.name}</Link>
                  </h2>
                  <Badge tone={t.status === 'active' ? 'success' : 'warn'}>
                    {STATUS[t.status]}
                  </Badge>
                  <span className="text-sm text-muted">
                    {t.city}/{t.state} · {t.kind === 'public' ? 'Pública' : 'Privada'}
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
