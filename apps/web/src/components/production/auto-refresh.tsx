'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Recarrega a tela enquanto o worker trabalha no lote (extração e plano). */
export function AutoRefresh({ everyMs = 3000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), everyMs);
    return () => clearInterval(t);
  }, [router, everyMs]);
  return null;
}
