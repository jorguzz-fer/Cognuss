import { describe, expect, it } from 'vitest';
// @ts-expect-error script em JavaScript puro, sem tipos
import { collect } from '../../../scripts/gen-wiki.mjs';
import { WIKI } from './content.generated';
import { slugify, wikiHref, wikiTitle } from './render';

describe('wiki', () => {
  it('o conteúdo gerado está em dia com docs/wiki (rode node apps/web/scripts/gen-wiki.mjs)', () => {
    expect(WIKI).toEqual(collect());
  });

  it('todo link entre páginas aponta para uma página que existe', () => {
    const broken: string[] = [];
    for (const [key, source] of Object.entries(WIKI)) {
      for (const m of source.matchAll(/\]\(([^)]+)\)/g)) {
        const dest = wikiHref(m[1]!, key);
        if (dest.external || dest.href.startsWith('#')) continue;
        const page = dest.href.split('#')[0]!.replace(/^\/wiki\/?/, '') || 'README';
        if (!WIKI[page]) broken.push(`${key} → ${m[1]}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it('links relativos viram rotas de /wiki', () => {
    expect(wikiHref('criar-assunto.md', 'admin/mover-assunto')).toEqual({
      href: '/wiki/admin/criar-assunto',
      external: false,
    });
    expect(wikiHref('../producao/visao-geral.md', 'admin/enviar-aula-pronta').href).toBe(
      '/wiki/producao/visao-geral',
    );
    expect(wikiHref('../README.md#aluno', 'admin/criar-usuario').href).toBe('/wiki#aluno');
    expect(wikiHref('admin/criar-usuario.md', 'README').href).toBe('/wiki/admin/criar-usuario');
    expect(wikiHref('https://exemplo.org', 'README')).toEqual({
      href: 'https://exemplo.org',
      external: true,
    });
  });

  it('âncora e título como na página', () => {
    expect(slugify('Produção de aulas e revisão')).toBe('produção-de-aulas-e-revisão');
    expect(wikiTitle(WIKI['admin/enviar-aula-pronta']!)).toBe(
      'Como enviar uma aula pronta (.html) para um módulo',
    );
  });
});
