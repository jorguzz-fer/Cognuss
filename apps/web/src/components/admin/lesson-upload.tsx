'use client';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/card';
import { api, ClientApiError } from '@/lib/client-api';
import { uploadFile } from '@/lib/upload';

const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Enviar a aula pronta (.html) do módulo. O arquivo passa pelo antivírus; o servidor embute as
 * fontes do Google e liga a aula ao módulo. Só com o módulo em rascunho.
 */
export function LessonUpload({
  moduleId,
  canUpload,
  hasLesson,
}: {
  moduleId: string;
  canUpload: boolean;
  hasLesson: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setDone(null);
    if (!/\.html?$/i.test(file.name)) return setError('Envie a aula como um arquivo .html.');
    if (file.size > MAX_BYTES) return setError('A aula passa de 15 MB.');
    try {
      setBusy('Enviando e verificando no antivírus…');
      // O navegador às vezes não informa o tipo do .html: o servidor exige text/html.
      const html =
        file.type === 'text/html' ? file : new File([file], file.name, { type: 'text/html' });
      const uploaded = await uploadFile(html);
      if (uploaded.status !== 'ready')
        throw new ClientApiError(
          409,
          'conflict',
          uploaded.error ?? 'O arquivo não passou na verificação.',
        );
      setBusy('Embutindo as fontes e ligando a aula ao módulo…');
      const res = await api<{ fonts: number; warning: string | null }>(
        `/admin/modules/${moduleId}/lesson`,
        { method: 'POST', body: { fileId: uploaded.id } },
      );
      setDone(
        res.warning ??
          (res.fonts
            ? `Aula enviada, com ${res.fonts} ${res.fonts === 1 ? 'fonte embutida' : 'fontes embutidas'}.`
            : 'Aula enviada.'),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : 'Não deu para enviar agora.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-3">
      <input
        ref={input}
        type="file"
        accept=".html,.htm,text/html"
        className="sr-only"
        aria-label="Arquivo da aula pronta"
        onChange={onFile}
        disabled={!canUpload || Boolean(busy)}
      />
      <div>
        <Button
          type="button"
          variant="secondary"
          disabled={!canUpload || Boolean(busy)}
          onClick={() => input.current?.click()}
        >
          {busy ?? (hasLesson ? 'Trocar a aula pronta (.html)' : 'Enviar aula pronta (.html)')}
        </Button>
      </div>
      {!canUpload ? (
        <p className="text-sm text-muted">
          Para trocar a aula, volte o módulo para rascunho: a aula nova passa pela revisão.
        </p>
      ) : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {done ? <Alert tone={done.startsWith('Não deu') ? 'warn' : 'success'}>{done}</Alert> : null}
    </div>
  );
}
