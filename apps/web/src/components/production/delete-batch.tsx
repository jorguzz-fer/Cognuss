'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert } from '@/components/ui/card';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { api, ClientApiError } from '@/lib/client-api';

/** Lote que falhou: apaga e volta para a lista, para enviar a aula de novo. */
export function DeleteBatch({ batchId }: { batchId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="grid gap-2">
      <div>
        <ConfirmButton
          variant="secondary"
          disabled={busy}
          question="Apagar este lote?"
          confirmLabel="Apagar lote"
          onConfirm={async () => {
            setBusy(true);
            setError(null);
            try {
              await api(`/production/batches/${batchId}`, { method: 'DELETE' });
              router.push('/admin/producao');
              router.refresh();
            } catch (err) {
              setError(err instanceof ClientApiError ? err.message : 'Não deu para apagar agora.');
              setBusy(false);
            }
          }}
        >
          Apagar e enviar de novo
        </ConfirmButton>
      </div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
    </div>
  );
}
