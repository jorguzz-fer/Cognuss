import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/auth-shell';
import { SignInForm } from '@/components/auth/sign-in-form';
import { safeNext } from '@/lib/access';

export const metadata: Metadata = { title: 'Entrar' };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <AuthShell title="Entrar" lead="O acesso é criado pela sua escola.">
      <SignInForm next={safeNext(next)} />
    </AuthShell>
  );
}
