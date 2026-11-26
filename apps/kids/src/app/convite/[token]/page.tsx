import type { Metadata } from 'next';
import Link from 'next/link';
import { eq, hashToken, schema, sql, withAnonymous } from '@gutta/db-kids';
import { Button, buttonClass } from '@gutta/ui/button';
import { Alert } from '@gutta/ui/card';
import { AuthShell } from '@/components/auth/auth-shell';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { ROLE_LABEL } from '@/lib/labels';
import { acceptInvite } from './actions';
import { RegisterForm } from './register-form';

export const metadata: Metadata = { title: 'Convite', robots: { index: false } };

const STATUS_TEXT: Record<string, string> = {
  accepted: 'Este convite já foi usado.',
  expired: 'Este convite venceu. Peça um novo à gestão da escola.',
  unavailable: 'A escola deste convite está com o acesso suspenso.',
};

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = /^[A-Za-z0-9_-]{20,100}$/.test(token);
  const r = valid
    ? await withAnonymous(db(), (tx) =>
        tx.execute<{
          tenant_name: string;
          email: string;
          role: 'manager' | 'teacher';
          status: string;
        }>(
          sql`select tenant_name, email, role, status from invitation_lookup(${hashToken(token)})`,
        ),
      )
    : null;
  const inv = r?.rows[0];
  if (!inv) {
    return (
      <AuthShell title="Convite">
        <Alert tone="danger">Convite não encontrado. Confira o link do e-mail.</Alert>
      </AuthShell>
    );
  }
  const lead = `${inv.tenant_name} convidou ${inv.email} com acesso de ${ROLE_LABEL[inv.role]}.`;
  if (inv.status !== 'open') {
    return (
      <AuthShell title="Convite" lead={lead}>
        <Alert tone="warn">{STATUS_TEXT[inv.status]}</Alert>
      </AuthShell>
    );
  }
  const session = await getSession();
  const next = `/convite/${token}`;
  if (session) {
    const same = session.user.email.toLowerCase() === inv.email;
    return (
      <AuthShell title="Aceitar convite" lead={lead}>
        {same ? (
          <form action={acceptInvite}>
            <input type="hidden" name="token" value={token} />
            <Button type="submit" size="lg">
              Aceitar e entrar
            </Button>
          </form>
        ) : (
          <Alert tone="warn">
            Você está com outra conta ({session.user.email}). Saia e entre com {inv.email}.
          </Alert>
        )}
      </AuthShell>
    );
  }
  const hasAccount = await db().query.authUsers.findFirst({
    where: eq(schema.authUsers.email, inv.email),
    columns: { id: true },
  });
  return (
    <AuthShell title="Aceitar convite" lead={lead}>
      {hasAccount ? (
        <Link
          href={`/entrar?next=${encodeURIComponent(next)}`}
          className={buttonClass('primary', 'lg')}
        >
          Entrar para aceitar
        </Link>
      ) : (
        <RegisterForm token={token} email={inv.email} />
      )}
    </AuthShell>
  );
}
