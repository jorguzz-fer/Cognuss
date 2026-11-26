import Link from 'next/link';
import { buttonClass } from '@gutta/ui/button';
import { ThemeToggle } from '@gutta/ui/theme-toggle';
import { KidsWordmark } from '@/components/brand';

// Uma promessa e um único botão primário (docs/ux.md). Contas entram por convite da escola.
export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col px-4 py-6 sm:px-8">
      <div className="flex items-center justify-between">
        <KidsWordmark className="text-2xl" />
        <ThemeToggle />
      </div>
      <main
        id="conteudo"
        className="mx-auto grid w-full max-w-xl flex-1 content-center gap-6 py-10"
      >
        <p className="font-mono text-xs font-semibold tracking-[0.2em] text-muted uppercase">
          Ensino Fundamental e Médio
        </p>
        <h1 className="text-[clamp(34px,6vw,56px)]">
          O plano de estudos da sua escola, um pouco todo dia.
        </h1>
        <p className="text-muted">
          Matérias e tópicos do seu ano, flashcards, simulados e provas. O acesso é feito pela sua
          escola.
        </p>
        <Link href="/entrar" className={buttonClass('primary', 'lg', 'justify-self-start')}>
          Entrar
        </Link>
      </main>
    </div>
  );
}
