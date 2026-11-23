'use client';
import { useState } from 'react';
import { Button } from '@gutta/ui/button';
import { startAttempt } from '@/app/estudar/avaliacoes/actions';

// A chave da tentativa nasce uma vez por formulário: clicar duas vezes ou repetir o envio abre
// a mesma tentativa (AVA-07).
export function StartAttemptForm({
  assessmentId,
  retakeOf,
  label,
  variant = 'primary',
}: {
  assessmentId: string;
  retakeOf?: string | null;
  label: string;
  variant?: 'primary' | 'secondary';
}) {
  const [key] = useState(() => crypto.randomUUID());
  const [pending, setPending] = useState(false);
  return (
    <form action={startAttempt} onSubmit={() => setPending(true)}>
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <input type="hidden" name="key" value={key} />
      <input type="hidden" name="retakeOf" value={retakeOf ?? ''} />
      <Button type="submit" size="lg" variant={variant} loading={pending}>
        {label}
      </Button>
    </form>
  );
}
