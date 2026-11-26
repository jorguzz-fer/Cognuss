import type { Metadata } from 'next';
import Link from 'next/link';
import { Wordmark } from '@/components/shared/logo';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { ACTOR_MAP_HTML } from '@/features/actor-map/content.generated';
import '@/features/actor-map/actor-map.css';
import { requireRole } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Mapa de atores' };

/**
 * Mapa de atores: quem faz cada ação, em que tela e o que acontece depois. Só para a equipe,
 * porque traz detalhes internos (deploy, 2FA, pontos em aberto). O conteúdo é estático e vem
 * de docs/mapa/ (render.mjs gera o HTML com os diagramas já em SVG).
 */
export default async function ActorMapPage() {
  const user = await requireRole(['admin', 'reviewer', 'editor', 'teacher'], '/mapa');
  const back = user.roles.some((r) => r === 'admin' || r === 'reviewer' || r === 'editor')
    ? '/admin'
    : '/professor';
  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-4 py-3">
          <Link href={back} className="text-fg no-underline">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-3">
            <Link href={back} className="text-sm">
              Voltar
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <div className="mapa-doc" dangerouslySetInnerHTML={{ __html: ACTOR_MAP_HTML }} />
    </>
  );
}
