// Markdown da wiki (docs/wiki) em elementos React: títulos com âncora, parágrafos, listas
// (também numeradas e aninhadas), tabelas, citações e, no texto, **negrito**, *itálico*,
// `código` e [links](…). Nunca injeta HTML. Os links entre páginas viram rotas de /wiki.
import Link from 'next/link';
import { Fragment } from 'react';

/** Âncora como a do GitHub: minúsculas, sem pontuação, espaços viram hífen (acentos ficam). */
export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s/g, '-');
}

/** Destino de um link da página `from` (ex.: "admin/criar-usuario"). */
export function wikiHref(href: string, from: string): { href: string; external: boolean } {
  if (/^https?:\/\//.test(href)) return { href, external: true };
  if (href.startsWith('#')) return { href, external: false };
  const [path = '', anchor] = href.split('#');
  const parts = from.split('/').slice(0, -1);
  for (const seg of path.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg && seg !== '.') parts.push(seg);
  }
  const key = parts.join('/').replace(/\.md$/, '');
  const base = key === 'README' || key === '' ? '/wiki' : `/wiki/${key}`;
  return { href: anchor ? `${base}#${anchor}` : base, external: false };
}

function inline(text: string, from: string, key: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const k = `${key}-${i++}`;
    if (tok.startsWith('`')) out.push(<code key={k}>{tok.slice(1, -1)}</code>);
    else if (tok.startsWith('**'))
      out.push(<strong key={k}>{inline(tok.slice(2, -2), from, k)}</strong>);
    else if (tok.startsWith('*')) out.push(<em key={k}>{inline(tok.slice(1, -1), from, k)}</em>);
    else {
      const [, label = '', target = ''] = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok) ?? [];
      const dest = wikiHref(target, from);
      out.push(
        dest.external ? (
          <a key={k} href={dest.href} target="_blank" rel="noreferrer">
            {inline(label, from, k)}
          </a>
        ) : (
          <Link key={k} href={dest.href}>
            {inline(label, from, k)}
          </Link>
        ),
      );
    }
    last = m.index! + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Item = { text: string; children: List[] };
type List = { ordered: boolean; indent: number; items: Item[] };

function renderList(list: List, from: string, key: string): React.ReactNode {
  const Tag = list.ordered ? 'ol' : 'ul';
  return (
    <Tag
      key={key}
      className={list.ordered ? 'ml-6 list-decimal space-y-1' : 'ml-6 list-disc space-y-1'}
    >
      {list.items.map((it, j) => (
        <li key={j}>
          {inline(it.text, from, `${key}-${j}`)}
          {it.children.map((c, n) => renderList(c, from, `${key}-${j}-${n}`))}
        </li>
      ))}
    </Tag>
  );
}

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim());

export function WikiMarkdown({ source, from }: { source: string; from: string }) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let para: string[] = [];
  let lists: List[] = []; // pilha: a primeira é a lista de fora
  const flushPara = (k: number) => {
    if (para.length) blocks.push(<p key={`p${k}`}>{inline(para.join(' '), from, `p${k}`)}</p>);
    para = [];
  };
  const flushList = (k: number) => {
    if (lists[0]) blocks.push(renderList(lists[0], from, `l${k}`));
    lists = [];
  };
  const flush = (k: number) => {
    flushPara(k);
    flushList(k);
  };

  for (let k = 0; k < lines.length; k++) {
    const line = lines[k]!.replace(/\s+$/, '');
    if (!line.trim()) {
      flushPara(k);
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      flush(k);
      const level = h[1]!.length;
      const Tag = (['h1', 'h2', 'h3'] as const)[level - 1]!;
      blocks.push(
        <Tag key={`h${k}`} id={slugify(h[2]!.replace(/[*`]/g, ''))}>
          {inline(h[2]!, from, `h${k}`)}
        </Tag>,
      );
      continue;
    }
    if (line.startsWith('|') && /^\|?\s*:?-{3,}/.test(lines[k + 1] ?? '')) {
      flush(k);
      const head = cells(line);
      const rows: string[][] = [];
      k += 2;
      while (k < lines.length && lines[k]!.trim().startsWith('|')) rows.push(cells(lines[k++]!));
      k--;
      blocks.push(
        <div key={`t${k}`} className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                {head.map((c, j) => (
                  <th key={j}>{inline(c, from, `th${k}-${j}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, n) => (
                <tr key={n}>
                  {r.map((c, j) => (
                    <td key={j}>{inline(c, from, `td${k}-${n}-${j}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (line.startsWith('>')) {
      flush(k);
      blocks.push(
        <blockquote key={`q${k}`}>{inline(line.replace(/^>\s?/, ''), from, `q${k}`)}</blockquote>,
      );
      continue;
    }
    const li = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(line);
    if (li) {
      flushPara(k);
      const indent = li[1]!.length;
      const ordered = /\d/.test(li[2]!);
      const item: Item = { text: li[3]!, children: [] };
      while (lists.length && indent < lists[lists.length - 1]!.indent) lists.pop();
      const top = lists[lists.length - 1];
      if (!top) lists.push({ ordered, indent, items: [item] });
      else if (indent > top.indent) {
        const parent = top.items[top.items.length - 1]!;
        const child: List = { ordered, indent, items: [item] };
        parent.children.push(child);
        lists.push(child);
      } else top.items.push(item);
      continue;
    }
    // Continuação de um item de lista (linha recuada sem marcador).
    if (lists.length && /^\s+/.test(line)) {
      const top = lists[lists.length - 1]!;
      top.items[top.items.length - 1]!.text += ` ${line.trim()}`;
      continue;
    }
    flushList(k);
    para.push(line.trim());
  }
  flush(lines.length);
  return (
    <div className="wiki-doc">
      {blocks.map((b, i) => (
        <Fragment key={i}>{b}</Fragment>
      ))}
    </div>
  );
}

/** Título (o primeiro "# …") de uma página. */
export function wikiTitle(source: string) {
  return /^#\s+(.+)$/m.exec(source)?.[1]?.replace(/[*`]/g, '') ?? 'Wiki';
}
