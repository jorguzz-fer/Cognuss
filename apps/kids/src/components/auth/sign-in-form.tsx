'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authClient } from '@/lib/auth/client';
import { Button } from '@gutta/ui/button';
import { Alert } from '@gutta/ui/card';
import { Field, Input } from '@gutta/ui/field';
import { PasswordInput } from '@gutta/ui/password-input';

type Mode = 'turma' | 'email';

/** Mesma regra do servidor (normalizeNickname): sem acento, minúsculo, só letras e números. */
function clean(v: string) {
  return v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Duas formas de entrar (K-D07): alunos do Fundamental I com o código da turma, o apelido e a
 * senha que a escola entregou; gestão, professores e alunos maiores com e-mail.
 */
export function SignInForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('turma');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get('password') ?? '');
    setPending(true);
    setError(null);
    setNotice(null);
    let result;
    if (mode === 'turma') {
      const code = clean(String(form.get('code') ?? ''));
      const nick = clean(String(form.get('nickname') ?? ''));
      if (code.length !== 6 || nick.length < 3) {
        setPending(false);
        setError('Confira o código da turma (6 letras e números) e o seu usuário.');
        return;
      }
      result = await authClient.signIn.username({ username: `${code}.${nick}`, password });
    } else {
      const email = String(form.get('email') ?? '')
        .trim()
        .toLowerCase();
      result = await authClient.signIn.email({ email, password });
      if (result.error?.status === 403) {
        setPending(false);
        setNotice(`Falta confirmar seu e-mail. Reenviamos o link para ${email}.`);
        return;
      }
    }
    const { data, error } = result;
    if (error) {
      setPending(false);
      if (error.status === 429) setError('Muitas tentativas. Espere um minuto e tente de novo.');
      else
        setError(
          mode === 'turma'
            ? 'Código, usuário ou senha não conferem. Peça ajuda ao professor.'
            : 'E-mail ou senha incorretos.',
        );
      return;
    }
    if (data && 'twoFactorRedirect' in data && data.twoFactorRedirect) {
      router.push(`/entrar/dois-fatores?next=${encodeURIComponent(next)}`);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <div
        role="tablist"
        aria-label="Como entrar"
        className="grid grid-cols-2 gap-1 rounded-[var(--radius)] bg-surface-2 p-1"
      >
        {(
          [
            ['turma', 'Sou aluno'],
            ['email', 'Com e-mail'],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setError(null);
              setNotice(null);
            }}
            className="min-h-11 rounded-[var(--radius)] text-sm font-semibold text-muted aria-selected:bg-surface aria-selected:text-fg"
          >
            {label}
          </button>
        ))}
      </div>
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        {notice ? <Alert tone="warn">{notice}</Alert> : null}
        {mode === 'turma' ? (
          <>
            <Field label="Código da turma" hint="6 letras e números. Está com o seu professor.">
              {(p) => (
                <Input
                  {...p}
                  name="code"
                  autoComplete="off"
                  autoCapitalize="none"
                  maxLength={6}
                  className="font-mono tracking-[0.2em]"
                  required
                />
              )}
            </Field>
            <Field label="Seu usuário">
              {(p) => (
                <Input
                  {...p}
                  name="nickname"
                  autoComplete="username"
                  autoCapitalize="none"
                  required
                />
              )}
            </Field>
          </>
        ) : (
          <Field label="E-mail">
            {(p) => (
              <Input
                {...p}
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
              />
            )}
          </Field>
        )}
        <Field label="Senha">
          {(p) => <PasswordInput {...p} name="password" autoComplete="current-password" required />}
        </Field>
        <Button type="submit" size="lg" loading={pending}>
          Entrar
        </Button>
        {mode === 'email' ? (
          <Link
            href="/recuperar-senha"
            className="justify-self-center text-sm text-accent underline-offset-4 hover:underline"
          >
            Esqueci minha senha
          </Link>
        ) : null}
      </form>
    </div>
  );
}
