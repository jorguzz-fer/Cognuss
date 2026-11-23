import type { Metadata } from 'next';
import { and, asc, desc, eq, isNull, schema, sql, withTenantUser } from '@gutta/db-kids';
import { Button } from '@gutta/ui/button';
import { Badge, Card } from '@gutta/ui/card';
import { Field, Input, Select } from '@gutta/ui/field';
import { AppShell } from '@/components/app-shell';
import { Flash } from '@/components/flash';
import { SchoolNav } from '@/components/school-nav';
import { requireTenant } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { ROLE_LABEL } from '@/lib/labels';
import { cancelInvitation, inviteStaff, removeMember } from '../actions';

export const metadata: Metadata = { title: 'Pessoas' };

// USR-01 e USR-06: equipe da escola, convites e remoção de acesso. Alunos ficam nas turmas.
export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string }>;
}) {
  const { aviso } = await searchParams;
  const ctx = await requireTenant(['manager'], '/escola/pessoas');
  const { staff, invites } = await withTenantUser(db(), ctx.tenantId, ctx.user.id, async (tx) => ({
    staff: await tx
      .select({
        id: schema.memberships.id,
        userId: schema.memberships.userId,
        role: schema.memberships.role,
        name: schema.authUsers.name,
        email: schema.authUsers.email,
      })
      .from(schema.memberships)
      .innerJoin(schema.authUsers, eq(schema.authUsers.id, schema.memberships.userId))
      .where(and(eq(schema.memberships.status, 'active')))
      .orderBy(asc(schema.memberships.role), asc(schema.authUsers.name)),
    invites: await tx
      .select({
        id: schema.invitations.id,
        email: schema.invitations.email,
        role: schema.invitations.role,
        expired: sql<boolean>`${schema.invitations.expiresAt} < now()`,
      })
      .from(schema.invitations)
      .where(isNull(schema.invitations.acceptedAt))
      .orderBy(desc(schema.invitations.createdAt)),
  }));
  const team = staff.filter((s) => s.role !== 'student');
  const studentsCount = staff.length - team.length;
  return (
    <AppShell area="Gestão" tenantName={ctx.tenantName} canSwitch={ctx.user.memberships.length > 1}>
      <h1 className="text-3xl">Pessoas</h1>
      <SchoolNav current="/escola/pessoas" />
      <Flash code={aviso} />
      <Card>
        <form
          action={inviteStaff}
          className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end"
        >
          <Field label="Convidar por e-mail" hint="O convite vale por 7 dias.">
            {(p) => <Input {...p} name="email" type="email" required autoComplete="off" />}
          </Field>
          <Field label="Acesso">
            {(p) => (
              <Select {...p} name="role" defaultValue="teacher">
                <option value="teacher">Professor</option>
                <option value="manager">Gestão</option>
              </Select>
            )}
          </Field>
          <Button type="submit">Enviar convite</Button>
        </form>
      </Card>

      {invites.length ? (
        <section className="grid gap-2">
          <h2 className="text-xl">Convites pendentes</h2>
          <ul className="grid gap-2">
            {invites.map((i) => (
              <li
                key={i.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius)] border border-line px-4 py-2"
              >
                <span>
                  {i.email} <span className="text-muted">· {ROLE_LABEL[i.role]}</span>{' '}
                  {i.expired ? <Badge tone="warn">Vencido</Badge> : null}
                </span>
                <form action={cancelInvitation}>
                  <input type="hidden" name="invitationId" value={i.id} />
                  <Button type="submit" variant="ghost">
                    Cancelar
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="grid gap-2">
        <h2 className="text-xl">Equipe</h2>
        <ul className="grid gap-2">
          {team.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius)] border border-line px-4 py-2"
            >
              <span>
                {m.name} <span className="text-muted">· {m.email}</span>{' '}
                <Badge>{ROLE_LABEL[m.role]}</Badge>
              </span>
              {m.userId !== ctx.user.id ? (
                <form action={removeMember}>
                  <input type="hidden" name="membershipId" value={m.id} />
                  <Button type="submit" variant="ghost">
                    Remover acesso
                  </Button>
                </form>
              ) : (
                <span className="text-sm text-muted">Você</span>
              )}
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted">
          {studentsCount} {studentsCount === 1 ? 'aluno' : 'alunos'} na escola. Alunos são
          cadastrados nas turmas.
        </p>
      </section>
    </AppShell>
  );
}
