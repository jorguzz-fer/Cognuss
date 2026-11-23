'use client';
import { useActionState } from 'react';
import { Button } from '@gutta/ui/button';
import { Alert, Card } from '@gutta/ui/card';
import { Field, Input, Textarea } from '@gutta/ui/field';
import type { StudentActionState } from '@/lib/students';

type Action = (prev: StudentActionState, fd: FormData) => Promise<StudentActionState>;

/**
 * Credenciais mostradas uma única vez, para a escola entregar ao aluno ou ao responsável.
 * Não ficam guardadas em lugar nenhum: se perder, gera uma senha nova.
 */
function Credentials({ state }: { state: StudentActionState }) {
  if (!state.credentials?.length && !state.skipped?.length) return null;
  return (
    <Card className="grid gap-3">
      {state.credentials?.length ? (
        <>
          <Alert tone="warn">
            Anote ou imprima agora: as senhas não aparecem de novo. Se alguém perder, gere outra.
          </Alert>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-muted">
                <th className="py-1 pr-3 font-semibold">Aluno</th>
                <th className="py-1 pr-3 font-semibold">Usuário</th>
                <th className="py-1 font-semibold">Senha</th>
              </tr>
            </thead>
            <tbody>
              {state.credentials.map((c) => (
                <tr key={c.username} className="border-t border-line">
                  <td className="py-2 pr-3">{c.name}</td>
                  <td className="py-2 pr-3 font-mono">{c.username}</td>
                  <td className="py-2 font-mono">{c.password}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button
            type="button"
            variant="secondary"
            className="justify-self-start print:hidden"
            onClick={() => window.print()}
          >
            Imprimir
          </Button>
        </>
      ) : null}
      {state.skipped?.length ? (
        <div className="text-sm">
          <p className="font-semibold">Linhas puladas</p>
          <ul className="mt-1 grid gap-1">
            {state.skipped.map((s) => (
              <li key={s.line}>
                {s.line} <span className="text-muted">· {s.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}

export function AddStudentForm({ classId, action }: { classId: string; action: Action }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <div className="grid gap-4">
      <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
        <input type="hidden" name="classId" value={classId} />
        <Field label="Nome do aluno">
          {(p) => <Input {...p} name="name" required minLength={2} maxLength={120} />}
        </Field>
        <Field label="Apelido de login" hint="3 a 20 letras ou números.">
          {(p) => <Input {...p} name="nickname" required maxLength={40} autoComplete="off" />}
        </Field>
        <Button type="submit" loading={pending}>
          Adicionar
        </Button>
      </form>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <Credentials state={state} />
    </div>
  );
}

export function ImportStudentsForm({ classId, action }: { classId: string; action: Action }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <div className="grid gap-4">
      <form action={formAction} className="grid gap-3">
        <input type="hidden" name="classId" value={classId} />
        <Field
          label="Lista de alunos"
          hint="Um por linha: Nome completo; apelido. Sem apelido, usamos o primeiro nome."
        >
          {(p) => <Textarea {...p} name="lines" rows={6} required />}
        </Field>
        <Button type="submit" variant="secondary" loading={pending} className="justify-self-start">
          Importar lista
        </Button>
      </form>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <Credentials state={state} />
    </div>
  );
}

export function ResetPasswordForm({ userId, action }: { userId: string; action: Action }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <div className="grid gap-2">
      <form action={formAction}>
        <input type="hidden" name="userId" value={userId} />
        <Button type="submit" variant="ghost" loading={pending}>
          Nova senha
        </Button>
      </form>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <Credentials state={state} />
    </div>
  );
}
