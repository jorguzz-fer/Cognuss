import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/auth-shell';
import { TwoFactorForm } from '@/components/auth/two-factor-form';
import { safeNext } from '@/lib/access';

export const metadata: Metadata = { title: 'Verificação em duas etapas' };

export default async function TwoFactorPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <AuthShell
      title="Verificação em duas etapas"
      lead="Sua conta administra dados de alunos, então pedimos um segundo fator."
    >
      <TwoFactorForm next={safeNext(next)} />
    </AuthShell>
  );
}
