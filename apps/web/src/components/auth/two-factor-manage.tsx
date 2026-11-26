'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authClient } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';
import { Alert, Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { PasswordInput } from '@/components/ui/password-input';

/**
 * Verificação em duas etapas já ativa: gerar novos códigos de recuperação (os antigos deixam
 * de valer) e, para quem não é admin, desligar. Para trocar de celular, desliga e ativa de novo.
 */
export function TwoFactorManage({ canDisable }: { canDisable: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<'codes' | 'off' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[]>([]);

  async function run(kind: 'codes' | 'off', form: HTMLFormElement) {
    const password = String(new FormData(form).get('password') ?? '');
    setPending(kind);
    setError(null);
    if (kind === 'codes') {
      const { data, error } = await authClient.twoFactor.generateBackupCodes({ password });
      setPending(null);
      if (error || !data) return setError('Senha incorreta.');
      setCodes(data.backupCodes);
      form.reset();
      return;
    }
    const { error } = await authClient.twoFactor.disable({ password });
    setPending(null);
    if (error) return setError('Senha incorreta.');
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <Alert tone="success">Já está ativa nesta conta.</Alert>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {codes.length ? (
        <Card>
          <h2 className="font-bold">Seus novos códigos de recuperação</h2>
          <p className="mt-1 text-sm text-muted">
            Os códigos antigos não valem mais. Cada um destes funciona uma vez.
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm">
            {codes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </Card>
      ) : null}
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void run('codes', e.currentTarget);
        }}
      >
        <h2 className="font-bold">Novos códigos de recuperação</h2>
        <Field label="Confirme sua senha">
          {(p) => <PasswordInput {...p} name="password" autoComplete="current-password" required />}
        </Field>
        <Button type="submit" variant="secondary" loading={pending === 'codes'}>
          Gerar novos códigos
        </Button>
      </form>
      {canDisable ? (
        <form
          className="grid gap-3 border-t border-line pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run('off', e.currentTarget);
          }}
        >
          <h2 className="font-bold">Desligar a verificação</h2>
          <p className="text-sm text-muted">
            Trocou de celular? Desligue aqui e ative de novo com o app novo.
          </p>
          <Field label="Confirme sua senha">
            {(p) => (
              <PasswordInput {...p} name="password" autoComplete="current-password" required />
            )}
          </Field>
          <Button type="submit" variant="danger" loading={pending === 'off'}>
            Desligar
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted">
          Contas de administração não podem desligar a verificação. Para trocar de celular, peça a
          outra pessoa da administração.
        </p>
      )}
    </div>
  );
}
