import { Wordmark } from '@gutta/ui/logo';

// Marca do Cognuss (ADR 0010) com o selo "Kids". Mesmo desenho, mesma cor (K-D06).
export function KidsWordmark({
  className = 'text-2xl',
  tone = 'accent',
}: {
  className?: string;
  tone?: 'accent' | 'cover';
}) {
  return (
    <span className={`inline-flex items-baseline gap-2 ${className}`}>
      <Wordmark className="text-[1em]" tone={tone} />
      <span className="font-mono text-[0.45em] font-semibold tracking-[0.2em] uppercase">Kids</span>
    </span>
  );
}
