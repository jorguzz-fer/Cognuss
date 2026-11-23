import type { Metadata } from 'next';
import { and, asc, desc, eq, isNull, schema, sql, withTenantUser } from '@gutta/db-kids';
import { Button } from '@gutta/ui/button';
import { Badge, Card } from '@gutta/ui/card';
import { Field, Input, Select } from '@gutta/ui/field';
import { EmptyState } from '@gutta/ui/states';
import { AppShell } from '@/components/app-shell';
import { Flash } from '@/components/flash';
import { SchoolNav } from '@/components/school-nav';
import { requireTenant } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { inviteGuardian, recordPaperConsent, resendGuardianLink, resolveRequest } from './actions';

export const metadata: Metadata = { title: 'Responsáveis' };

const REQUEST_LABEL = {
  access: 'Acesso aos dados',
  correction: 'Correção',
  export: 'Cópia dos dados',
  deletion: 'Exclusão',
} as const;

// RES-01 a RES-05: quem autorizou, quem falta, links, papel e pedidos dos responsáveis.
export default async function GuardiansPage({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string }>;
}) {
  const { aviso } = await searchParams;
  const ctx = await requireTenant(['manager'], '/escola/responsaveis');
  const data = await withTenantUser(db(), ctx.tenantId, ctx.user.id, async (tx) => {
    const students = await tx
      .select({
        id: schema.authUsers.id,
        name: schema.authUsers.name,
        className: schema.classes.name,
        consented: sql<boolean>`app_student_consented(${schema.authUsers.id})`,
      })
      .from(schema.memberships)
      .innerJoin(schema.authUsers, eq(schema.authUsers.id, schema.memberships.userId))
      .leftJoin(
        schema.classMembers,
        and(
          eq(schema.classMembers.userId, schema.authUsers.id),
          isNull(schema.classMembers.leftAt),
        ),
      )
      .leftJoin(schema.classes, eq(schema.classes.id, schema.classMembers.classId))
      .where(and(eq(schema.memberships.role, 'student'), eq(schema.memberships.status, 'active')))
      .orderBy(asc(schema.classes.name), asc(schema.authUsers.name));
    const links = await tx
      .select({
        guardianId: schema.guardians.id,
        guardian: schema.guardians.name,
        email: schema.guardians.email,
        studentId: schema.guardianLinks.studentUserId,
      })
      .from(schema.guardianLinks)
      .innerJoin(schema.guardians, eq(schema.guardians.id, schema.guardianLinks.guardianId))
      .orderBy(asc(schema.guardians.name));
    const requests = await tx
      .select({
        id: schema.guardianRequests.id,
        kind: schema.guardianRequests.kind,
        details: schema.guardianRequests.details,
        createdAt: schema.guardianRequests.createdAt,
        guardian: schema.guardians.name,
        student: schema.authUsers.name,
      })
      .from(schema.guardianRequests)
      .innerJoin(schema.guardians, eq(schema.guardians.id, schema.guardianRequests.guardianId))
      .innerJoin(schema.authUsers, eq(schema.authUsers.id, schema.guardianRequests.studentUserId))
      .where(eq(schema.guardianRequests.status, 'open'))
      .orderBy(desc(schema.guardianRequests.createdAt));
    return { students, links, requests };
  });
  const pending = data.students.filter((s) => !s.consented);
  return (
    <AppShell area="Gestão" tenantName={ctx.tenantName} canSwitch={ctx.user.memberships.length > 1}>
      <h1 className="text-3xl">Responsáveis</h1>
      <SchoolNav current="/escola/responsaveis" />
      <Flash code={aviso} />
      <p className="max-w-prose text-muted">
        O aluno só estuda depois que um responsável autoriza (LGPD, art. 14). O responsável recebe
        um link por e-mail, sem precisar criar conta.
      </p>

      {data.requests.length ? (
        <section className="grid gap-2">
          <h2 className="text-xl">Pedidos dos responsáveis</h2>
          <ul className="grid gap-2">
            {data.requests.map((r) => (
              <li key={r.id}>
                <Card className="flex flex-wrap items-center justify-between gap-3">
                  <span>
                    <Badge tone="warn">{REQUEST_LABEL[r.kind]}</Badge> {r.guardian} · {r.student}
                    {r.details ? (
                      <span className="block text-sm text-muted">{r.details}</span>
                    ) : null}
                  </span>
                  <form action={resolveRequest}>
                    <input type="hidden" name="requestId" value={r.id} />
                    <Button type="submit" variant="secondary">
                      Marcar como resolvido
                    </Button>
                  </form>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="grid gap-2">
        <h2 className="text-xl">Alunos ({pending.length} aguardando autorização)</h2>
        {data.students.length === 0 ? (
          <EmptyState title="Nenhum aluno cadastrado">
            Os alunos são cadastrados nas turmas.
          </EmptyState>
        ) : (
          <ul className="grid gap-2">
            {data.students.map((s) => {
              const gs = data.links.filter((l) => l.studentId === s.id);
              return (
                <li key={s.id}>
                  <Card className="grid gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{s.name}</span>
                      {s.className ? (
                        <span className="text-sm text-muted">· {s.className}</span>
                      ) : null}
                      <Badge tone={s.consented ? 'success' : 'warn'}>
                        {s.consented ? 'Autorizado' : 'Aguardando'}
                      </Badge>
                    </div>
                    {gs.length ? (
                      <ul className="grid gap-1 text-sm">
                        {gs.map((g) => (
                          <li key={g.guardianId} className="flex flex-wrap items-center gap-2">
                            {g.guardian} <span className="text-muted">· {g.email}</span>
                            <form action={resendGuardianLink}>
                              <input type="hidden" name="guardianId" value={g.guardianId} />
                              <Button type="submit" variant="ghost">
                                Reenviar link
                              </Button>
                            </form>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {!s.consented ? (
                      <details>
                        <summary className="cursor-pointer text-sm font-semibold">
                          {gs.length ? 'Outro responsável' : 'Cadastrar responsável'}
                        </summary>
                        <form
                          action={inviteGuardian}
                          className="mt-2 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
                        >
                          <input type="hidden" name="studentUserId" value={s.id} />
                          <input type="hidden" name="back" value="/escola/responsaveis" />
                          <Field label="Nome do responsável">
                            {(p) => (
                              <Input {...p} name="name" required minLength={2} maxLength={120} />
                            )}
                          </Field>
                          <Field label="E-mail">
                            {(p) => (
                              <Input {...p} name="email" type="email" required autoComplete="off" />
                            )}
                          </Field>
                          <Button type="submit">Enviar link</Button>
                        </form>
                      </details>
                    ) : null}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {data.links.length ? (
        <Card className="grid gap-3">
          <h2 className="text-xl">Autorização em papel</h2>
          <p className="text-sm text-muted">
            Quando o responsável assinou o termo na escola. Fica registrado em seu nome, com a
            observação.
          </p>
          <form
            action={recordPaperConsent}
            className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          >
            <Field label="Responsável e aluno">
              {(p) => (
                <Select {...p} name="link" required>
                  {data.links.map((l) => (
                    <option
                      key={`${l.guardianId}:${l.studentId}`}
                      value={`${l.guardianId}:${l.studentId}`}
                    >
                      {l.guardian} · {data.students.find((s) => s.id === l.studentId)?.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Observação" hint="Exemplo: termo assinado na secretaria em 20/11.">
              {(p) => <Input {...p} name="note" required minLength={3} maxLength={500} />}
            </Field>
            <Button type="submit" variant="secondary">
              Registrar
            </Button>
          </form>
        </Card>
      ) : null}
    </AppShell>
  );
}
