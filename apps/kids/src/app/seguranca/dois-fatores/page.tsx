import type { Metadata } from 'next';
import { Alert } from '@gutta/ui/card';
import { AuthShell } from '@/components/auth/auth-shell';
import { TwoFactorSetup } from '@/components/auth/two-factor-setup';
import { requireUser } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Verificação em duas etapas' };

export default async function TwoFactorSettingsPage() {
  const user = await requireUser('/seguranca/dois-fatores');
  return (
    <AuthShell
      title="Verificação em duas etapas"
      lead="Gestores e o Super Admin precisam de um código do celular, além da senha."
    >
      {user.twoFactorEnabled ? (
        <Alert tone="success">Já está ativa nesta conta.</Alert>
      ) : (
        <TwoFactorSetup />
      )}
    </AuthShell>
  );
}
