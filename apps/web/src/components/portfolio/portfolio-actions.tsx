'use client';
import type { portfolio } from '@gutta/contracts';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import type { z } from 'zod';
import { Button } from '@gutta/ui/button';
import { Alert } from '@gutta/ui/card';
import { Field, Input } from '@gutta/ui/field';
import { ClientApiError, api } from '@/lib/client-api';
import { uploadFile } from '@/lib/upload';

type Item = z.infer<typeof portfolio.ItemDto>;

const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp';

const errorText = (err: unknown, fallback: string) =>
  err instanceof ClientApiError ? err.message : fallback;

/**
 * Enviar um certificado (PDF ou foto). O arquivo passa pelo antivírus; o Cognuss lê e propõe os
 * campos, e o aluno confere na tela do certificado. Também dá para registrar sem arquivo.
 */
export function NewCertificate({ folderId }: { folderId: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function create(fileId?: string) {
    const { item } = await api<{ item: Item }>('/portfolio/items', {
      method: 'POST',
      body: { fileId, folderId: folderId ?? undefined },
    });
    router.push(`/app/competencias/${item.id}`);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setBusy('Enviando o certificado…');
    try {
      // Não espera o antivírus: o item fica "Lendo" e a tela do certificado acompanha.
      const uploaded = await uploadFile(file, undefined, { waitProcessing: false });
      await create(uploaded.id);
    } catch (err) {
      setError(errorText(err, 'Não deu para enviar agora. Tente de novo.'));
      setBusy(null);
    }
  }

  return (
    <div className="grid justify-items-end gap-2">
      <div className="flex flex-wrap gap-2">
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          aria-label="Arquivo do certificado"
          onChange={onFile}
        />
        <Button onClick={() => input.current?.click()} disabled={Boolean(busy)}>
          {busy ?? 'Enviar certificado'}
        </Button>
        <Button
          variant="secondary"
          disabled={Boolean(busy)}
          onClick={async () => {
            setBusy('Criando…');
            try {
              await create();
            } catch (err) {
              setError(errorText(err, 'Não deu para criar agora.'));
              setBusy(null);
            }
          }}
        >
          Registrar sem arquivo
        </Button>
      </div>
      <p className="text-xs text-muted">PDF ou foto (JPG, PNG, WebP).</p>
      {error ? <Alert tone="danger">{error}</Alert> : null}
    </div>
  );
}

/** Criar, renomear e excluir pastas. Excluir a pasta não exclui os certificados. */
export function FolderManager({ folders }: { folders: { id: string; name: string }[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      setEditing(null);
      router.refresh();
    } catch (err) {
      setError(errorText(err, 'Não deu para salvar a pasta.'));
    }
  }

  return (
    <div className="grid gap-3 border-t border-line pt-3">
      <form
        className="grid gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const name = String(new FormData(form).get('name') ?? '');
          void run(async () => {
            await api('/portfolio/folders', { method: 'POST', body: { name } });
            form.reset();
          });
        }}
      >
        <Field label="Nova pasta">
          {(p) => (
            <Input {...p} name="name" required maxLength={60} placeholder="Ex.: Congressos" />
          )}
        </Field>
        <Button type="submit" variant="secondary">
          Criar pasta
        </Button>
      </form>
      {folders.length ? (
        <details>
          <summary className="cursor-pointer text-sm font-semibold">
            Renomear ou excluir pastas
          </summary>
          <ul className="mt-2 grid gap-2">
            {folders.map((f) => (
              <li key={f.id} className="grid gap-1">
                {editing === f.id ? (
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const name = String(new FormData(e.currentTarget).get('name') ?? '');
                      void run(() =>
                        api(`/portfolio/folders/${f.id}`, { method: 'PATCH', body: { name } }),
                      );
                    }}
                  >
                    <Input
                      name="name"
                      defaultValue={f.name}
                      aria-label={`Novo nome de ${f.name}`}
                      maxLength={60}
                      required
                    />
                    <Button type="submit" variant="secondary">
                      Salvar
                    </Button>
                  </form>
                ) : (
                  <span className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{f.name}</span>
                    <span className="flex gap-1">
                      <Button
                        variant="ghost"
                        onClick={() => setEditing(f.id)}
                        aria-label={`Renomear ${f.name}`}
                      >
                        Renomear
                      </Button>
                      <Button
                        variant="ghost"
                        aria-label={`Excluir ${f.name}`}
                        onClick={() => {
                          if (
                            confirm(
                              `Excluir a pasta "${f.name}"? Os certificados dela ficam sem pasta.`,
                            )
                          )
                            void run(() => api(`/portfolio/folders/${f.id}`, { method: 'DELETE' }));
                        }}
                      >
                        Excluir
                      </Button>
                    </span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
    </div>
  );
}
