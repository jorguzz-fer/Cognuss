'use client';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/field';
import { createDemoStudentAction, type DemoState } from '@/features/demo/actions';

/** Cria a conta de teste e mostra a senha uma vez (não fica salva em lugar nenhum). */
export function DemoForm({
  courses,
  defaultCourseId,
}: {
  courses: { id: string; name: string }[];
  defaultCourseId: string;
}) {
  const [state, action, pending] = useActionState<DemoState, FormData>(
    createDemoStudentAction,
    null,
  );
  return (
    <div className="grid gap-4">
      <form action={action} className="grid max-w-md gap-4">
        <Field label="E-mail da conta de teste" hint="Use um e-mail seu, por exemplo com +teste.">
          {(p) => <Input {...p} name="email" type="email" required autoComplete="off" />}
        </Field>
        <Field label="Nome do aluno">
          {(p) => <Input {...p} name="name" required defaultValue="Aluna Teste Cognuss" />}
        </Field>
        <Field
          label="Curso"
          hint="O Estudar mostra as disciplinas do catálogo deste curso. As que têm módulo publicado já entram no semestre."
        >
          {(p) => (
            <Select {...p} name="courseId" defaultValue={defaultCourseId}>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? 'Criando… (leva alguns segundos)' : 'Criar conta de teste'}
          </Button>
        </div>
      </form>
      {state?.ok === false ? <Alert tone="danger">{state.error}</Alert> : null}
      {state?.ok ? (
        <Alert tone="success" role="status">
          <div className="grid gap-1">
            <p className="font-semibold">
              Conta criada. Anote a senha agora: ela não aparece de novo.
            </p>
            <p>
              E-mail: <code>{state.email}</code>
            </p>
            <p>
              Senha: <code>{state.password}</code>
            </p>
            <p className="text-sm">
              Os slides e a prova anterior levam alguns minutos para ficar prontos (antivírus e
              leitura do texto pelo worker).
            </p>
          </div>
        </Alert>
      ) : null}
    </div>
  );
}
