import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';
import { ResetPasswordForm } from '@/components/auth/password-forms';
import { Alert } from '@gutta/ui/card';

export const metadata: Metadata = { title: 'Nova senha' };

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  return (
    <AuthShell title="Criar nova senha">
      {token && !error ? (
        <ResetPasswordForm token={token} />
      ) : (
        <Alert tone="danger">
          Esse link expirou ou é inválido. <Link href="/recuperar-senha">Peça um novo</Link>.
        </Alert>
      )}
      <p className="mt-6 text-sm">
        <Link href="/entrar" className="text-accent underline-offset-4 hover:underline">
          Voltar para entrar
        </Link>
      </p>
    </AuthShell>
  );
}
