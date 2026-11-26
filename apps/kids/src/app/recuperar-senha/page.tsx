import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';
import { RequestResetForm } from '@/components/auth/password-forms';

export const metadata: Metadata = { title: 'Esqueci minha senha' };

// Só para contas com e-mail. Quem entra pelo código da turma pede a senha nova ao professor.
export default function RecoverPage() {
  return (
    <AuthShell
      title="Esqueci minha senha"
      lead="Para contas com e-mail. Quem entra pelo código da turma fala com o professor."
    >
      <RequestResetForm />
      <p className="mt-6 text-sm">
        <Link href="/entrar" className="text-accent underline-offset-4 hover:underline">
          Voltar para entrar
        </Link>
      </p>
    </AuthShell>
  );
}
