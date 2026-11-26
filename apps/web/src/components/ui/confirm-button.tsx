'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

/**
 * Botão de ação que apaga algo sem volta: o primeiro clique pergunta, o segundo confirma.
 * Fica na própria tela (sem a janela do navegador), com o foco no botão de confirmar.
 * Com `submit`, a confirmação envia o formulário em volta (ações de servidor).
 */
export function ConfirmButton({
  children,
  question,
  confirmLabel = 'Confirmar exclusão',
  onConfirm,
  submit = false,
  variant = 'ghost',
  disabled,
  'aria-label': ariaLabel,
}: {
  children: React.ReactNode;
  question: string;
  confirmLabel?: string;
  onConfirm?: () => void;
  submit?: boolean;
  variant?: Variant;
  disabled?: boolean;
  'aria-label'?: string;
}) {
  const [armed, setArmed] = useState(false);
  if (!armed)
    return (
      <Button
        type="button"
        variant={variant}
        disabled={disabled}
        aria-label={ariaLabel}
        onClick={() => setArmed(true)}
      >
        {children}
      </Button>
    );
  return (
    <span role="group" aria-label={question} className="inline-flex flex-wrap items-center gap-2">
      <span className="text-sm">{question}</span>
      <Button
        type={submit ? 'submit' : 'button'}
        variant="danger"
        autoFocus
        disabled={disabled}
        onClick={
          submit
            ? undefined
            : () => {
                setArmed(false);
                onConfirm?.();
              }
        }
      >
        {confirmLabel}
      </Button>
      <Button type="button" variant="ghost" onClick={() => setArmed(false)}>
        Cancelar
      </Button>
    </span>
  );
}
