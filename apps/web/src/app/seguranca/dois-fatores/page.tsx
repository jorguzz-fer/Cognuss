import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';
import { TwoFactorManage } from '@/components/auth/two-factor-manage';
import { TwoFactorSetup } from '@/components/auth/two-factor-setup';
import { requireUser } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Verificação em duas etapas' };

export default async function TwoFactorSettingsPage() {
  const user = await requireUser('/seguranca/dois-fatores');
  return (
    <AuthShell
      title="Verificação em duas etapas"
      lead={
        user.roles.includes('admin')
          ? 'Contas de administração precisam de um segundo fator para acessar o editorial.'
          : 'Um código do celular, além da senha, protege sua conta.'
      }
    >
      {user.twoFactorEnabled ? (
        <TwoFactorManage canDisable={!user.roles.includes('admin')} />
      ) : user.roles.includes('admin') ? (
        <TwoFactorSetup next="/admin" nextLabel="Ir para o editorial" />
      ) : (
        <TwoFactorSetup />
      )}
      <p className="text-sm">
        <Link href="/seguranca/senha">Trocar senha</Link>
      </p>
    </AuthShell>
  );
}
