import type { Metadata } from 'next';
import Link from 'next/link';
import { Wordmark } from '@/components/shared/logo';
import { buttonClass } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Página não encontrada' };

/*
  404 em português. Também aparece quando um módulo da v2 está desligado (requireFeature):
  por isso o texto não culpa o endereço digitado.
*/
export default function NotFound() {
  return (
    <main
      id="conteudo"
      className="mx-auto grid min-h-dvh max-w-xl content-center gap-6 px-4 py-10 sm:px-6"
    >
      <Link href="/app" className="w-fit no-underline" aria-label="Cognuss, início">
        <Wordmark className="text-[26px]" />
      </Link>
      <div className="grid gap-2">
        <h1 className="text-4xl">Esta página não está disponível</h1>
        <p className="text-muted">
          Ela pode ter mudado de endereço ou ainda não estar liberada para a sua conta.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href="/app" className={buttonClass('primary', 'md')}>
          Ir para o início
        </Link>
        <Link href="/app/perfil" className={buttonClass('secondary', 'md')}>
          Ver meu perfil
        </Link>
      </div>
    </main>
  );
}
