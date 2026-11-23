'use client';
import {
  PORTFOLIO_KINDS,
  PORTFOLIO_KIND_LABEL,
  PORTFOLIO_ROLES,
  PORTFOLIO_ROLE_LABEL,
} from '@gutta/core';
import type { portfolio } from '@gutta/contracts';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/card';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { ClientApiError, api } from '@/lib/client-api';

type Item = z.infer<typeof portfolio.ItemDto>;

/** 1200 minutos vira "20"; 270 vira "4h30" (o mesmo formato que o campo aceita). */
const hoursText = (m: number | null) => {
  if (!m) return '';
  const h = Math.floor(m / 60);
  const min = m % 60;
  return min ? `${h}h${String(min).padStart(2, '0')}` : String(h);
};

/**
 * Conferência do certificado: o aluno corrige o que a leitura propôs e confirma. Só depois de
 * confirmado o certificado entra na soma de horas e no currículo.
 */
export function CertificateForm({
  item,
  folders,
}: {
  item: Item;
  folders: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const confirmed = item.status === 'confirmed';

  async function submit(e: React.FormEvent<HTMLFormElement>, confirm: boolean) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const str = (k: string) => String(f.get(k) ?? '');
    setBusy(confirm ? 'Confirmando…' : 'Salvando…');
    setError(null);
    setSaved(null);
    try {
      await api(`/portfolio/items/${item.id}`, {
        method: 'PATCH',
        body: {
          kind: str('kind'),
          title: str('title'),
          issuer: str('issuer'),
          role: str('role') || null,
          startedOn: str('startedOn') || null,
          endedOn: str('endedOn') || null,
          hours: str('hours') || null,
          holderName: str('holderName'),
          link: str('link'),
          notes: str('notes'),
          folderId: str('folderId') || null,
          confirm: confirm || undefined,
        },
      });
      setSaved(
        confirm ? 'Certificado conferido. Ele já entra na soma de horas.' : 'Alterações salvas.',
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : 'Não deu para salvar agora.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        void submit(e, submitter?.value === 'confirmar');
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nome da atividade">
          {(p) => (
            <Input
              {...p}
              name="title"
              defaultValue={item.title}
              maxLength={300}
              required
              minLength={3}
            />
          )}
        </Field>
        <Field label="Tipo">
          {(p) => (
            <Select {...p} name="kind" defaultValue={item.kind}>
              {PORTFOLIO_KINDS.map((k) => (
                <option key={k} value={k}>
                  {PORTFOLIO_KIND_LABEL[k]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Instituição que emitiu" optional>
          {(p) => <Input {...p} name="issuer" defaultValue={item.issuer ?? ''} maxLength={200} />}
        </Field>
        <Field label="Seu papel" optional>
          {(p) => (
            <Select {...p} name="role" defaultValue={item.role ?? ''}>
              <option value="">Não informado</option>
              {PORTFOLIO_ROLES.map((r) => (
                <option key={r} value={r}>
                  {PORTFOLIO_ROLE_LABEL[r]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Início" optional>
          {(p) => <Input {...p} type="date" name="startedOn" defaultValue={item.startedOn ?? ''} />}
        </Field>
        <Field label="Término" optional hint="Igual ao início se foi um dia só.">
          {(p) => <Input {...p} type="date" name="endedOn" defaultValue={item.endedOn ?? ''} />}
        </Field>
        <Field label="Carga horária" optional hint='Ex.: "20", "4h30" ou "90 min".'>
          {(p) => (
            <Input {...p} name="hours" defaultValue={hoursText(item.minutes)} maxLength={20} />
          )}
        </Field>
        <Field label="Nome no certificado" optional>
          {(p) => (
            <Input {...p} name="holderName" defaultValue={item.holderName ?? ''} maxLength={200} />
          )}
        </Field>
        <Field
          label="Link de verificação ou DOI"
          optional
          hint="Endereço https que confirma o certificado."
        >
          {(p) => (
            <Input {...p} type="url" name="link" defaultValue={item.link ?? ''} maxLength={500} />
          )}
        </Field>
        <Field label="Pasta" optional>
          {(p) => (
            <Select {...p} name="folderId" defaultValue={item.folderId ?? ''}>
              <option value="">Sem pasta</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <Field label="Observações" optional>
        {(p) => (
          <Textarea {...p} name="notes" defaultValue={item.notes ?? ''} rows={2} maxLength={1000} />
        )}
      </Field>
      <div className="flex flex-wrap gap-2">
        {confirmed ? (
          <Button type="submit" value="salvar" disabled={Boolean(busy)}>
            {busy ?? 'Salvar alterações'}
          </Button>
        ) : (
          <>
            <Button type="submit" value="confirmar" disabled={Boolean(busy)}>
              {busy === 'Confirmando…' ? busy : 'Conferi, confirmar'}
            </Button>
            <Button type="submit" value="salvar" variant="secondary" disabled={Boolean(busy)}>
              {busy === 'Salvando…' ? busy : 'Salvar e conferir depois'}
            </Button>
          </>
        )}
      </div>
      {saved ? <Alert tone="success">{saved}</Alert> : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
    </form>
  );
}

export function DeleteCertificate({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid gap-2">
      <div>
        <Button
          variant="danger"
          onClick={async () => {
            if (!confirm('Excluir este certificado de Meus Certificados?')) return;
            try {
              await api(`/portfolio/items/${id}`, { method: 'DELETE' });
              router.push('/app/competencias');
              router.refresh();
            } catch (err) {
              setError(err instanceof ClientApiError ? err.message : 'Não deu para excluir.');
            }
          }}
        >
          Excluir certificado
        </Button>
      </div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
    </div>
  );
}
