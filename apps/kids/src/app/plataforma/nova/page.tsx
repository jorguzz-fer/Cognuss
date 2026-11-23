import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@gutta/ui/button';
import { Field, Input, Select } from '@gutta/ui/field';
import { AppShell } from '@/components/app-shell';
import { Flash } from '@/components/flash';
import { requirePlatformAdmin } from '@/lib/auth/session';
import { UF } from '@/lib/forms';
import { createTenant } from '../actions';

export const metadata: Metadata = { title: 'Nova instituição' };

// INS-01 e INS-03: dados da escola e o e-mail de quem vai fazer a gestão.
export default async function NewTenantPage({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string }>;
}) {
  const { aviso } = await searchParams;
  await requirePlatformAdmin('/plataforma/nova');
  return (
    <AppShell area="Plataforma">
      <nav aria-label="Trilha" className="text-sm">
        <Link href="/plataforma">Instituições</Link> <span className="text-muted">/</span> Nova
      </nav>
      <h1 className="text-3xl">Nova instituição</h1>
      <Flash code={aviso} />
      <form action={createTenant} className="grid max-w-xl gap-4">
        <Field label="Nome da instituição">
          {(p) => <Input {...p} name="name" required minLength={3} maxLength={120} />}
        </Field>
        <Field
          label="Endereço curto"
          hint="Só letras minúsculas, números e hífen. Exemplo: colegio-horizonte."
        >
          {(p) => (
            <Input {...p} name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={60} />
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <Field label="Cidade">
            {(p) => <Input {...p} name="city" required maxLength={80} />}
          </Field>
          <Field label="UF">
            {(p) => (
              <Select {...p} name="state" required defaultValue="SP">
                {UF.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Field label="Rede">
          {(p) => (
            <Select {...p} name="kind" defaultValue="private">
              <option value="private">Privada</option>
              <option value="public">Pública</option>
            </Select>
          )}
        </Field>
        <Field label="CNPJ" optional>
          {(p) => <Input {...p} name="cnpj" inputMode="numeric" maxLength={18} />}
        </Field>
        <Field
          label="E-mail de quem vai fazer a gestão"
          hint="Essa pessoa recebe um convite que vale por 7 dias."
        >
          {(p) => <Input {...p} name="managerEmail" type="email" required autoComplete="off" />}
        </Field>
        <Button type="submit" size="lg" className="justify-self-start">
          Cadastrar e enviar convite
        </Button>
      </form>
    </AppShell>
  );
}
