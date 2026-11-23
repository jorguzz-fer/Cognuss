import Link from 'next/link';

const ITEMS = [
  { href: '/escola', label: 'Visão geral' },
  { href: '/escola/estrutura', label: 'Etapas e anos' },
  { href: '/escola/turmas', label: 'Turmas' },
  { href: '/escola/materias', label: 'Matérias' },
  { href: '/escola/pessoas', label: 'Pessoas' },
];

// Navegação da gestão. Uma área por item (docs/ux.md: consolidar, navegar em contexto).
export function SchoolNav({ current }: { current: string }) {
  return (
    <nav aria-label="Gestão da escola" className="no-scrollbar -mx-4 overflow-x-auto px-4">
      <ul className="flex gap-1 border-b border-line">
        {ITEMS.map((i) => (
          <li key={i.href}>
            <Link
              href={i.href}
              aria-current={current === i.href ? 'page' : undefined}
              className="inline-flex min-h-11 items-center px-3 text-sm font-semibold whitespace-nowrap text-muted no-underline aria-[current=page]:border-b-2 aria-[current=page]:border-accent aria-[current=page]:text-fg"
            >
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
