/*
  Aula pronta em HTML (módulo do catálogo): a aula roda isolada, sem rede (buildPieceCsp), então
  as fontes do Google Fonts que ela pede não carregariam. Aqui elas são baixadas uma vez, no
  envio, e entram no próprio arquivo como data URI. Só os subconjuntos latin e latin-ext (o
  português cabe neles) e só dos dois endereços do Google Fonts: nada de buscar outro host.
*/

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

const CSS_HOST = 'https://fonts.googleapis.com/';
const FONT_HOST = 'https://fonts.gstatic.com/';
const SUBSETS = new Set(['latin', 'latin-ext']);
// O Google só entrega woff2 para navegadores que ele reconhece.
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const MAX_FONT_BYTES = 4 * 1024 * 1024;
const TIMEOUT_MS = 10_000;

const GOOGLE_LINK =
  /<link\b[^>]*\bhref\s*=\s*["'](https:\/\/fonts\.(?:googleapis|gstatic)\.com(?:\/[^"']*)?)["'][^>]*>\s*/gi;
const GOOGLE_IMPORT =
  /@import\s+url\(\s*["']?(https:\/\/fonts\.googleapis\.com\/[^"')]+)["']?\s*\)\s*;?/gi;

const unescapeAttr = (v: string) => v.replaceAll('&amp;', '&');

/** Endereços de CSS do Google Fonts que a aula pede (por <link> ou @import). */
export function googleFontCssUrls(html: string): string[] {
  const urls = new Set<string>();
  for (const m of html.matchAll(GOOGLE_LINK)) {
    const url = unescapeAttr(m[1]!);
    if (url.startsWith(CSS_HOST) && /\/css2?\?/.test(url)) urls.add(url);
  }
  for (const m of html.matchAll(GOOGLE_IMPORT)) urls.add(unescapeAttr(m[1]!));
  return [...urls];
}

/** Os @font-face do CSS do Google, só dos subconjuntos que o português usa. */
export function pickFontFaces(css: string): string[] {
  const faces: string[] = [];
  // Cada bloco vem precedido do nome do subconjunto (/* latin */). Sem o comentário, fica.
  const re = /(?:\/\*\s*([\w-]+)\s*\*\/\s*)?(@font-face\s*\{[^}]*\})/g;
  for (const m of css.matchAll(re)) {
    if (!m[1] || SUBSETS.has(m[1])) faces.push(m[2]!);
  }
  return faces;
}

function withTimeout(): AbortSignal {
  return AbortSignal.timeout(TIMEOUT_MS);
}

/**
 * Troca o Google Fonts da aula pelas fontes embutidas. Se algo falhar, a aula segue sem elas
 * (o navegador usa as fontes do sistema) e o aviso volta para a tela do admin.
 */
export async function inlineGoogleFonts(
  html: string,
  fetchImpl: FetchLike = fetch,
): Promise<{ html: string; fonts: number; warning: string | null }> {
  const cssUrls = googleFontCssUrls(html);
  // Tira os <link> e @import do Google: dentro da aula isolada eles só geram erro.
  let out = html.replace(GOOGLE_LINK, '').replace(GOOGLE_IMPORT, '');
  if (!cssUrls.length) return { html: out, fonts: 0, warning: null };

  const faces: string[] = [];
  let bytes = 0;
  const cache = new Map<string, string>();
  try {
    for (const cssUrl of cssUrls) {
      const res = await fetchImpl(cssUrl, {
        headers: { 'user-agent': USER_AGENT },
        signal: withTimeout(),
      });
      if (!res.ok) throw new Error(`css ${res.status}`);
      for (const face of pickFontFaces(await res.text())) {
        let embedded = face;
        for (const m of face.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)) {
          const fontUrl = m[1]!;
          if (!fontUrl.startsWith(FONT_HOST)) continue;
          let dataUri = cache.get(fontUrl);
          if (!dataUri) {
            const f = await fetchImpl(fontUrl, { signal: withTimeout() });
            if (!f.ok) throw new Error(`font ${f.status}`);
            const buf = Buffer.from(await f.arrayBuffer());
            bytes += buf.length;
            if (bytes > MAX_FONT_BYTES) throw new Error('fontes grandes demais');
            const type = fontUrl.endsWith('.woff2') ? 'font/woff2' : 'font/woff';
            dataUri = `data:${type};base64,${buf.toString('base64')}`;
            cache.set(fontUrl, dataUri);
          }
          embedded = embedded.replace(m[0], `url(${dataUri})`);
        }
        faces.push(embedded);
      }
    }
  } catch {
    return {
      html: out,
      fonts: 0,
      warning: 'Não deu para embutir as fontes do Google: a aula vai usar as fontes do sistema.',
    };
  }
  const style = `<style data-cognuss="fontes">${faces.join('\n')}</style>`;
  out = /<\/head>/i.test(out) ? out.replace(/<\/head>/i, `${style}</head>`) : style + out;
  return { html: out, fonts: cache.size, warning: null };
}
