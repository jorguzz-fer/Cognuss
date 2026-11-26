import { BookOpen, ClipboardCheck, Layers } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@gutta/ui/theme-toggle';
import { KidsWordmark } from '../brand';

const POINTS = [
  {
    icon: Layers,
    title: 'O plano da sua escola',
    text: 'Matérias e tópicos do seu ano, dia a dia.',
  },
  { icon: BookOpen, title: 'Entender e revisar', text: 'Conteúdo, flashcards e simulados.' },
  {
    icon: ClipboardCheck,
    title: 'Prova com recuperação',
    text: 'Se precisar, as questões voltam em outro formato.',
  },
];

// Mesmo layout das telas de conta do Cognuss (ADR 0007): painel da marca no desktop e o
// formulário ao lado. O painel é decorativo.
export function AuthShell({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside
        aria-hidden="true"
        className="relative isolate hidden overflow-hidden bg-login-panel px-12 py-14 text-cover-fg lg:flex lg:flex-col"
      >
        <KidsWordmark className="text-3xl" tone="cover" />
        <div className="mt-auto grid max-w-md gap-6">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase">
            <span className="size-1.5 rounded-full bg-accent" /> Ensino Fundamental e Médio
          </p>
          <p className="font-display text-[clamp(30px,3vw,40px)] leading-[1.08]">
            Um pouco,
            <br />
            todo dia.
          </p>
          <span className="h-1 w-12 bg-accent" />
          <ul className="grid gap-3">
            {POINTS.map((p) => (
              <li
                key={p.title}
                className="flex gap-4 rounded-[var(--radius)] border border-login-line bg-login-surface/70 p-4"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius)] bg-login-panel">
                  <p.icon className="size-5 text-accent" />
                </span>
                <span>
                  <span className="block font-semibold">{p.title}</span>
                  <span className="block text-sm text-cover-muted">{p.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-fg no-underline">
            ← Início
          </Link>
          <ThemeToggle />
        </div>
        <main
          id="conteudo"
          className="mx-auto grid w-full max-w-sm flex-1 content-center gap-6 py-10"
        >
          <Link href="/" aria-label="Cognuss Kids, página inicial" className="no-underline">
            <KidsWordmark className="text-4xl" />
          </Link>
          <div className="grid gap-2">
            <h1 className="text-3xl">{title}</h1>
            {lead ? <p className="text-muted">{lead}</p> : null}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
