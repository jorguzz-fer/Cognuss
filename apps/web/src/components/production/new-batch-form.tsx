'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { production } from '@gutta/contracts';
import { Button } from '@gutta/ui/button';
import { Alert } from '@gutta/ui/card';
import { Field, Input, Select } from '@gutta/ui/field';
import { ClientApiError, api } from '@/lib/client-api';
import { uploadFile, type UploadProgress } from '@/lib/upload';

type Option = { id: string; name: string; topics: { id: string; name: string }[] };

const MAX_BYTES = 50 * 1024 * 1024;

// O navegador nem sempre informa o tipo do .ppt: vai pela extensão.
const MIME_BY_EXT: Record<string, string> = {
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odp: 'application/vnd.oasis.opendocument.presentation',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
const ACCEPT = Object.keys(MIME_BY_EXT)
  .map((e) => `.${e}`)
  .join(',');

function progressText(p: UploadProgress | null) {
  if (!p) return null;
  if (p.stage === 'hashing') return 'Preparando o arquivo…';
  if (p.stage === 'uploading') return `Enviando… ${Math.round((p.loaded / p.total) * 100)}%`;
  return 'Arquivo enviado. Criando o lote…';
}

/** Etapa 1 da produção: o admin envia a aula e escolhe disciplina, aula e posição. */
export function NewBatchForm({ options }: { options: Option[] }) {
  const router = useRouter();
  const [disciplineId, setDisciplineId] = useState(options[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const topics = options.find((o) => o.id === disciplineId)?.topics ?? [];

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const picked = form.get('arquivo');
    if (!(picked instanceof File) || !picked.size) return setError('Escolha o arquivo da aula.');
    if (picked.size > MAX_BYTES) return setError('O arquivo passa de 50 MB.');
    const ext = picked.name.split('.').pop()?.toLowerCase() ?? '';
    const type = MIME_BY_EXT[ext];
    if (!type) return setError('Envie a aula em PPT, PPTX, ODP, PDF, DOC ou DOCX.');
    setError(null);
    setBusy(true);
    try {
      const file = new File([picked], picked.name, { type });
      const uploaded = await uploadFile(file, setProgress, { pollMs: 0, waitProcessing: false });
      const { batch } = await api<{ batch: production.BatchDto }>('/production/batches', {
        method: 'POST',
        body: {
          topicId: String(form.get('topicId')),
          title: String(form.get('title')),
          position: Number(form.get('position') || 0),
          fileId: uploaded.id,
        },
      });
      router.push(`/admin/producao/${batch.id}`);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : 'Não deu para enviar agora.');
      setBusy(false);
      setProgress(null);
    }
  }

  if (!options.length)
    return (
      <Alert tone="warn">
        Nenhuma disciplina do catálogo tem aulas cadastradas. Cadastre a aula como assunto em Cursos
        → disciplina → Assuntos.
      </Alert>
    );

  return (
    <form onSubmit={submit} className="grid max-w-xl gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Disciplina">
          {(p) => (
            <Select {...p} value={disciplineId} onChange={(e) => setDisciplineId(e.target.value)}>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Aula" hint="Assunto da disciplina no catálogo.">
          {(p) => (
            <Select {...p} name="topicId" key={disciplineId} required>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <Field label="Nome da aula" hint="Como aparece nas peças, por exemplo “Aula 1 · Introdução”.">
        {(p) => <Input {...p} name="title" required minLength={3} maxLength={160} />}
      </Field>
      <Field label="Posição na ordem do curso">
        {(p) => (
          <Input
            {...p}
            name="position"
            type="number"
            min={0}
            max={999}
            defaultValue={1}
            className="max-w-32"
          />
        )}
      </Field>
      <Field
        label="Arquivo da aula"
        hint="PPT, PPTX, ODP, PDF, DOC ou DOCX, até 50 MB. Os slides de instrução do professor viram tarefas."
      >
        {(p) => <Input {...p} name="arquivo" type="file" accept={ACCEPT} required />}
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? 'Enviando…' : 'Enviar e criar o lote'}
        </Button>
        <span className="text-sm text-muted" aria-live="polite">
          {progressText(progress)}
        </span>
      </div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
    </form>
  );
}
