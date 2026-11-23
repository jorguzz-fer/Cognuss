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

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com']);
// Id de vídeo do YouTube: 11 caracteres de letras, números, - e _.
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Link de vídeo para incorporar (YouTube e Vimeo); outros abrem em nova aba. Só hosts exatos
 * (nada de "qualquercoisayoutube.com"), e o endereço incorporado é montado aqui, com o id
 * validado, nunca copiado do link.
 */
export function embedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return null;
    let id: string | null = null;
    if (YOUTUBE_HOSTS.has(u.hostname)) id = u.searchParams.get('v');
    else if (u.hostname === 'youtu.be') id = u.pathname.slice(1);
    if (id && YOUTUBE_ID.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
    const vimeo = /^\/(\d{1,12})$/.exec(u.pathname);
    if (VIMEO_HOSTS.has(u.hostname) && vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  } catch {
    // link inválido
  }
  return null;
}
