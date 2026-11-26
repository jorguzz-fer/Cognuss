import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';
import { SignInForm } from '@/components/auth/sign-in-form';
import { Alert } from '@/components/ui/card';
import { safeNext } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Entrar' };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; senha?: string }>;
}) {
  const { next, senha } = await searchParams;
  return (
    <AuthShell
      title="Entrar"
      footer={
        <>
          Ainda não tem conta? <Link href="/cadastro">Criar conta grátis</Link>
        </>
      }
    >
      {senha === 'redefinida' ? (
        <Alert tone="success">Senha redefinida. Entre com a senha nova.</Alert>
      ) : null}
      <SignInForm next={safeNext(next)} />
    </AuthShell>
  );
}
