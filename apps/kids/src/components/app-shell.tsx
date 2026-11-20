import Link from 'next/link';
import { ThemeToggle } from '@gutta/ui/theme-toggle';
import { SignOutButton } from './auth/sign-out-button';
import { KidsWordmark } from './brand';

// Topo das áreas logadas: marca, instituição ativa (com troca quando há mais de uma), tema e sair.
export function AppShell({
  area,
  tenantName,
  canSwitch,
  children,
}: {
  area: string;
  tenantName?: string;
  canSwitch?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link href="/inicio" aria-label="Cognuss Kids, início" className="no-underline">
            <KidsWordmark className="text-xl" />
          </Link>
          <span className="font-mono text-xs font-semibold tracking-widest text-muted uppercase">
            {area}
          </span>
          {tenantName ? (
            <span className="text-sm">
              {tenantName}
              {canSwitch ? (
                <>
                  {' · '}
                  <Link href="/escolher">Trocar</Link>
                </>
              ) : null}
            </span>
          ) : null}
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>
      <main id="conteudo" className="mx-auto grid max-w-5xl gap-6 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
