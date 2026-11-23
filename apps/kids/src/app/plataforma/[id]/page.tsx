import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, desc, eq, schema, sql, withPlatformAdmin } from '@gutta/db-kids';
import { Button } from '@gutta/ui/button';
import { Badge, Card } from '@gutta/ui/card';
import { Field, Input } from '@gutta/ui/field';
import { AppShell } from '@/components/app-shell';
import { Flash } from '@/components/flash';
import { requirePlatformAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { inviteManager, setTenantStatus } from '../actions';
import { TENANT_STATUS as STATUS } from '@/lib/labels';

export const metadata: Metadata = { title: 'Instituição' };

const UUID = /^[0-9a-f-]{36}$/i;

export default async function TenantPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aviso?: string }>;
}) {
  const { id } = await params;
  const { aviso } = await searchParams;
  if (!UUID.test(id)) notFound();
  const user = await requirePlatformAdmin(`/plataforma/${id}`);
  const data = await withPlatformAdmin(
    db(),
    { userId: user.id, tenantId: id, reason: 'ver instituição' },
    async (tx) => {
      const tenant = await tx.query.tenants.findFirst({ where: eq(schema.tenants.id, id) });
      if (!tenant) return null;
      const managers = await tx
        .select({ name: schema.authUsers.name, email: schema.authUsers.email })
        .from(schema.memberships)
        .innerJoin(schema.authUsers, eq(schema.authUsers.id, schema.memberships.userId))
        .where(
          and(
            eq(schema.memberships.tenantId, id),
            eq(schema.memberships.role, 'manager'),
            eq(schema.memberships.status, 'active'),
          ),
        );
      const invites = await tx
        .select({
          id: schema.invitations.id,
          email: schema.invitations.email,
          acceptedAt: schema.invitations.acceptedAt,
          expired: sql<boolean>`${schema.invitations.expiresAt} < now()`,
        })
        .from(schema.invitations)
        .where(eq(schema.invitations.tenantId, id))
        .orderBy(desc(schema.invitations.createdAt))
        .limit(10);
      return { tenant, managers, invites };
    },
  );
  if (!data) notFound();
  const { tenant, managers, invites } = data;
  return (
    <AppShell area="Plataforma">
      <nav aria-label="Trilha" className="text-sm">
        <Link href="/plataforma">Instituições</Link> <span className="text-muted">/</span>{' '}
        {tenant.name}
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl">{tenant.name}</h1>
        <Badge tone={tenant.status === 'active' ? 'success' : 'warn'}>
          {STATUS[tenant.status]}
        </Badge>
      </div>
      <Flash code={aviso} />
      <p className="text-muted">
        {tenant.city}/{tenant.state} · {tenant.kind === 'public' ? 'Pública' : 'Privada'} · endereço
        curto <code>{tenant.slug}</code>
      </p>

      <Card>
        <h2 className="text-xl">Gestão</h2>
        {managers.length ? (
          <ul className="mt-2 grid gap-1">
            {managers.map((m) => (
              <li key={m.email}>
                {m.name} <span className="text-muted">· {m.email}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-muted">Ninguém aceitou o convite de gestão ainda.</p>
        )}
        {invites.length ? (
          <>
            <h3 className="mt-4 text-base">Convites recentes</h3>
            <ul className="mt-2 grid gap-1 text-sm">
              {invites.map((i) => (
                <li key={i.id}>
                  {i.email} · {i.acceptedAt ? 'aceito' : i.expired ? 'vencido' : 'aguardando'}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <form action={inviteManager} className="mt-4 grid max-w-md gap-3">
          <input type="hidden" name="tenantId" value={tenant.id} />
          <Field label="Convidar gestão (e-mail)">
            {(p) => <Input {...p} name="email" type="email" required autoComplete="off" />}
          </Field>
          <Button type="submit" variant="secondary" className="justify-self-start">
            Enviar convite
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-xl">Situação</h2>
        <p className="mt-1 text-sm text-muted">
          Suspender bloqueia o acesso de todos os membros e guarda os dados. Dá para reativar.
        </p>
        <form action={setTenantStatus} className="mt-3">
          <input type="hidden" name="tenantId" value={tenant.id} />
          <input
            type="hidden"
            name="status"
            value={tenant.status === 'active' ? 'suspended' : 'active'}
          />
          <Button type="submit" variant={tenant.status === 'active' ? 'danger' : 'primary'}>
            {tenant.status === 'active' ? 'Suspender instituição' : 'Reativar instituição'}
          </Button>
        </form>
      </Card>
    </AppShell>
  );
}
