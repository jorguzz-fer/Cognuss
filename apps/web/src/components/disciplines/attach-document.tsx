'use client';
import { Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useRef, useState } from 'react';
import type { disciplines } from '@gutta/contracts';
import { ClientApiError, api } from '@/lib/client-api';
import { uploadFile } from '@/lib/upload';

type DisciplineDto = disciplines.DisciplineDto;

export const DOCUMENT_ACCEPT =
  '.pdf,.doc,.docx,.xlsx,.xls,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MAX_BYTES = 10 * 1024 * 1024;

/*
  Anexar o cronograma ou o plano de ensino a uma disciplina que já existe (DIS-04, DIS-05).
  O arquivo sobe direto para o bucket e a leitura do cronograma começa em seguida; o cronograma
  novo substitui a leitura que estava em aberto.
*/
export function AttachDocument({
  disciplineId,
  kind,
  label,
  onAttached,
}: {
  disciplineId: string;
  kind: 'cronograma' | 'plano_ensino';
  label: string;
  onAttached?: (d: DisciplineDto) => void;
}) {
  const id = useId();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'erro'; text: string } | null>(null);

  async function send(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    setMsg(null);
    if (f.size > MAX_BYTES) return setMsg({ tone: 'erro', text: 'O arquivo passa de 10 MB.' });
    setBusy(true);
    try {
      const uploaded = await uploadFile(f, () => {}, { pollMs: 0, waitProcessing: false });
      const { discipline } = await api<{ discipline: DisciplineDto }>(
        `/disciplines/${disciplineId}/documents`,
        { method: 'POST', body: { kind, fileId: uploaded.id } },
      );
      setMsg({
        tone: 'ok',
        text:
          kind === 'cronograma'
            ? 'Cronograma enviado. A leitura começa em instantes; você confere tudo antes de entrar na agenda.'
            : 'Plano de ensino enviado.',
      });
      onAttached?.(discipline);
      router.refresh();
    } catch (err) {
      setMsg({
        tone: 'erro',
        text:
          err instanceof ClientApiError ? err.message : 'Não deu para enviar agora. Tente de novo.',
      });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className="grid gap-1">
      <label
        htmlFor={id}
        className="inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-[var(--radius)] border border-line-strong px-3 text-sm font-semibold hover:border-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent"
      >
        <Upload className="size-4" aria-hidden />
        {busy ? 'Enviando…' : label}
        <input
          id={id}
          ref={input}
          type="file"
          accept={DOCUMENT_ACCEPT}
          disabled={busy}
          className="sr-only"
          onChange={(e) => void send(e.target.files)}
        />
      </label>
      {msg ? (
        <p role="status" className={msg.tone === 'erro' ? 'text-sm text-danger' : 'text-sm'}>
          {msg.text}
        </p>
      ) : null}
    </div>
  );
}
