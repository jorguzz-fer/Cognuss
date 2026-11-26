'use client';
import { useActionState } from 'react';
import { Button } from '@gutta/ui/button';
import { Alert } from '@gutta/ui/card';
import { Field, Input } from '@gutta/ui/field';
import { PasswordInput } from '@gutta/ui/password-input';
import { registerAndAccept } from './actions';

export function RegisterForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState(registerAndAccept, {});
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="token" value={token} />
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <Field label="E-mail">{(p) => <Input {...p} value={email} readOnly />}</Field>
      <Field label="Seu nome">
        {(p) => <Input {...p} name="name" required minLength={2} autoComplete="name" />}
      </Field>
      <Field label="Crie uma senha" hint="Pelo menos 8 caracteres.">
        {(p) => (
          <PasswordInput
            {...p}
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        )}
      </Field>
      <Button type="submit" size="lg" loading={pending}>
        Criar conta e aceitar
      </Button>
    </form>
  );
}
