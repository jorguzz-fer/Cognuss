import Link from 'next/link';
import { Wordmark } from '@/components/shared/logo';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import '@/features/wiki/wiki.css';
import { requireRole } from '@/lib/auth/session';

// Wiki da equipe (docs/wiki): como fazer cada ação. Só para quem trabalha na plataforma.
export default async function WikiLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(['admin', 'reviewer', 'editor', 'teacher'], '/wiki');
  const back = user.roles.some((r) => r === 'admin' || r === 'reviewer' || r === 'editor')
    ? '/admin'
    : '/professor';
  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href={back} className="text-fg no-underline">
              <Wordmark />
            </Link>
            <Link href="/wiki" className="text-sm font-semibold no-underline">
              Wiki
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href={back} className="text-sm">
              Voltar
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main id="conteudo" className="mx-auto max-w-4xl px-4 py-8">
        {children}
      </main>
    </>
  );
}
