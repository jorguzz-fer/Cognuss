// Conteúdo do tópico (CON-01) a partir do que o professor digita. Puro, testado em
// plan-content.test.ts.

export type ContentKind = 'text' | 'video' | 'table' | 'timeline';
export type ParsedContent =
  | { bodyMd: string }
  | { url: string }
  | { data: { columns: string[]; rows: string[][] } }
  | { data: { steps: string[] } };

/**
 * text: Markdown como veio. video: um link https. table: primeira linha com os títulos das
 * colunas, separados por "|"; cada linha seguinte é uma linha da tabela. timeline: uma etapa
 * por linha. Devolve null quando não dá para montar o conteúdo.
 */
export function parseContent(kind: ContentKind, raw: string): ParsedContent | null {
  const body = raw.replace(/\r\n/g, '\n').trim();
  if (!body) return null;
  if (kind === 'text') return { bodyMd: body };
  if (kind === 'video') {
    try {
      const u = new URL(body);
      return u.protocol === 'https:' ? { url: u.toString() } : null;
    } catch {
      return null;
    }
  }
  const lines = body
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (kind === 'timeline') {
    const steps = lines.map((l) => l.replace(/^\d+[.)-]?\s*/, '')).filter(Boolean);
    return steps.length >= 2 ? { data: { steps } } : null;
  }
  const split = (l: string) =>
    l
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim());
  const [head, ...rest] = lines;
  const columns = split(head!);
  const rows = rest.filter((l) => !/^\|?\s*-{2,}/.test(l)).map(split);
  if (columns.length < 2 || rows.length === 0) return null;
  return { data: { columns, rows: rows.map((r) => columns.map((_, i) => r[i] ?? '')) } };
}

/** Link de vídeo para incorporar (YouTube e Vimeo); outros abrem em nova aba. */
export function embedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith('youtube.com') && u.searchParams.get('v'))
      return `https://www.youtube-nocookie.com/embed/${u.searchParams.get('v')}`;
    if (u.hostname === 'youtu.be') return `https://www.youtube-nocookie.com/embed${u.pathname}`;
    if (u.hostname.endsWith('vimeo.com') && /^\/\d+/.test(u.pathname))
      return `https://player.vimeo.com/video${u.pathname}`;
  } catch {
    // link inválido
  }
  return null;
}
