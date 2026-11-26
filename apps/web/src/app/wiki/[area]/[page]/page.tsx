import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { WIKI } from '@/features/wiki/content.generated';
import { WikiMarkdown, wikiTitle } from '@/features/wiki/render';

const AREA: Record<string, string> = {
  admin: 'Admin',
  aluno: 'Aluno',
  professor: 'Professor',
  producao: 'Produção de aulas',
};

type Params = { params: Promise<{ area: string; page: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { area, page } = await params;
  const source = WIKI[`${area}/${page}`];
  return { title: source ? wikiTitle(source) : 'Wiki' };
}

export default async function WikiPage({ params }: Params) {
  const { area, page } = await params;
  const key = `${area}/${page}`;
  const source = WIKI[key];
  if (!source || !AREA[area]) notFound();
  return (
    <div className="grid gap-4">
      <nav aria-label="Trilha" className="text-sm">
        <Link href="/wiki">Wiki</Link> <span className="text-muted">/</span> {AREA[area]}
      </nav>
      <WikiMarkdown source={source} from={key} />
    </div>
  );
}
