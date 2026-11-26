import { describe, expect, it } from 'vitest';
import { googleFontCssUrls, inlineGoogleFonts, pickFontFaces } from './lesson-fonts';

const HTML = `<!doctype html><html><head>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400&amp;display=swap" rel="stylesheet">
<style>body{font-family:'Public Sans',sans-serif}</style>
</head><body><h1>Farmacocinética</h1></body></html>`;

const CSS = `/* cyrillic */
@font-face { font-family: 'Public Sans'; src: url(https://fonts.gstatic.com/s/ps/cyr.woff2) format('woff2'); }
/* latin-ext */
@font-face { font-family: 'Public Sans'; src: url(https://fonts.gstatic.com/s/ps/ext.woff2) format('woff2'); }
/* latin */
@font-face { font-family: 'Public Sans'; src: url(https://fonts.gstatic.com/s/ps/latin.woff2) format('woff2'); }`;

function fakeFetch(fail = false) {
  const calls: string[] = [];
  const impl = async (url: string) => {
    calls.push(url);
    if (fail) return new Response('erro', { status: 500 });
    if (url.startsWith('https://fonts.googleapis.com/')) return new Response(CSS);
    return new Response(new Uint8Array([1, 2, 3]));
  };
  return { impl, calls };
}

describe('aula pronta: fontes do Google embutidas', () => {
  it('acha o CSS pedido pela aula (com &amp; desfeito)', () => {
    expect(googleFontCssUrls(HTML)).toEqual([
      'https://fonts.googleapis.com/css2?family=Public+Sans:wght@400&display=swap',
    ]);
  });

  it('fica só com latin e latin-ext', () => {
    const faces = pickFontFaces(CSS);
    expect(faces).toHaveLength(2);
    expect(faces.join()).not.toContain('cyr.woff2');
  });

  it('embute as fontes e tira os links do Google', async () => {
    const { impl, calls } = fakeFetch();
    const r = await inlineGoogleFonts(HTML, impl);
    expect(r.warning).toBeNull();
    expect(r.fonts).toBe(2);
    expect(r.html).not.toMatch(/https:\/\/fonts\.g(oogleapis|static)\.com/);
    expect(r.html).toContain('data:font/woff2;base64,AQID');
    expect(r.html).toMatch(/<style data-cognuss="fontes">[\s\S]*<\/style><\/head>/);
    // Só os dois endereços do Google Fonts, nada além.
    expect(calls.every((u) => /^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(u))).toBe(true);
  });

  it('sem rede, a aula segue sem as fontes e com aviso', async () => {
    const r = await inlineGoogleFonts(HTML, fakeFetch(true).impl);
    expect(r.fonts).toBe(0);
    expect(r.warning).toMatch(/fontes do sistema/);
    expect(r.html).not.toContain('fonts.googleapis.com');
    expect(r.html).toContain('<h1>Farmacocinética</h1>');
  });

  it('aula sem Google Fonts passa igual', async () => {
    const plain = '<!doctype html><p>oi</p>';
    const { impl, calls } = fakeFetch();
    expect(await inlineGoogleFonts(plain, impl)).toEqual({ html: plain, fonts: 0, warning: null });
    expect(calls).toHaveLength(0);
  });
});
