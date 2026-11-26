import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/auth-shell';
import { SignInForm } from '@/components/auth/sign-in-form';
import { Alert } from '@gutta/ui/card';
import { safeNext } from '@/lib/access';

export const metadata: Metadata = { title: 'Entrar' };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; senha?: string }>;
}) {
  const { next, senha } = await searchParams;
  return (
    <AuthShell title="Entrar" lead="O acesso é criado pela sua escola.">
      {senha === 'redefinida' ? (
        <div className="mb-4">
          <Alert tone="success">Senha salva. Entre com o seu e-mail e a nova senha.</Alert>
        </div>
      ) : null}
      <SignInForm next={safeNext(next)} />
    </AuthShell>
  );
}
