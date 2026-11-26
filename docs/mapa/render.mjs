// Gera apps/web/src/features/actor-map/content.generated.ts a partir de conteudo.html e dos
// diagramas em diagramas/*.mmd. Os diagramas viram SVG aqui, uma vez por tema, para a página
// /mapa não carregar o Mermaid no navegador.
//
// Uso (o Mermaid não é dependência do repositório):
//   npm i --prefix /tmp/mermaid mermaid@11.12.0
//   MERMAID_JS=/tmp/mermaid/node_modules/mermaid/dist/mermaid.min.js node docs/mapa/render.mjs
// Precisa do Playwright com o Chromium (já vem no ambiente de desenvolvimento).
/* global process, console, document, mermaid */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const out = join(root, 'apps/web/src/features/actor-map/content.generated.ts');
const mermaidJs = process.env.MERMAID_JS;
if (!mermaidJs) throw new Error('Defina MERMAID_JS com o caminho do mermaid.min.js.');

// Fonte de medida: a mesma Hind do app. No SVG final, o nome vira a variável do next/font.
const FONT = 'MapaSans';
const FONT_CSS = 'var(--font-hind), system-ui, sans-serif';
const hind = readFileSync(join(root, 'apps/web/src/fonts/hind-latin-400.woff2')).toString('base64');

const THEMES = {
  dark: {
    vars: { bg: '#1c1818', box: '#262121', text: '#f5f3f3', line: '#a59a99', border: '#8a7f7e' },
    cls: {
      aluno: 'fill:#16283b,stroke:#7fb4ea,color:#e3eefa',
      prof: 'fill:#3a2814,stroke:#e8a465,color:#fbeedf',
      editor: 'fill:#123327,stroke:#5cc79f,color:#e2f2eb',
      revisor: 'fill:#261d45,stroke:#ad95f2,color:#efe9ff',
      admin: 'fill:#3d1517,stroke:#f0707a,color:#f9e3e3',
      sistema: 'fill:#262b30,stroke:#aab3bd,color:#eceff2',
    },
  },
  light: {
    vars: { bg: '#ffffff', box: '#f6f2f2', text: '#2a2425', line: '#7a6f6f', border: '#8a7f7e' },
    cls: {
      aluno: 'fill:#e3eefa,stroke:#2a6fb0,color:#0f2f4d',
      prof: 'fill:#fbeedf,stroke:#a8601a,color:#4d2a0b',
      editor: 'fill:#e2f2eb,stroke:#1f7a5c,color:#0f3a2c',
      revisor: 'fill:#efe9ff,stroke:#6a4bc4,color:#2b1d5c',
      admin: 'fill:#f9e3e3,stroke:#b3262e,color:#4a1014',
      sistema: 'fill:#eceff2,stroke:#5b6570,color:#22282e',
    },
  },
};

function config(v) {
  return {
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    fontFamily: FONT,
    flowchart: { useMaxWidth: true },
    sequence: { useMaxWidth: true },
    state: { useMaxWidth: true },
    themeVariables: {
      darkMode: v.bg !== '#ffffff',
      background: v.bg,
      mainBkg: v.box,
      primaryColor: v.box,
      primaryTextColor: v.text,
      primaryBorderColor: v.border,
      nodeBorder: v.border,
      lineColor: v.line,
      textColor: v.text,
      titleColor: v.text,
      edgeLabelBackground: v.bg,
      clusterBkg: v.box,
      clusterBorder: v.border,
      actorBkg: v.box,
      actorBorder: v.border,
      actorTextColor: v.text,
      actorLineColor: v.line,
      signalColor: v.text,
      signalTextColor: v.text,
      labelBoxBkgColor: v.box,
      labelTextColor: v.text,
      noteBkgColor: v.box,
      noteTextColor: v.text,
      noteBorderColor: v.border,
      fontFamily: FONT,
      fontSize: '16px',
    },
    themeCSS:
      '.node rect, .node circle, .node polygon, .node path, .cluster rect { stroke-width: 2px; }',
  };
}

const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(
  `<style>@font-face{font-family:${FONT};src:url(data:font/woff2;base64,${hind}) format('woff2')}</style><body></body>`,
);
await page.addScriptTag({ path: mermaidJs });
await page.evaluate(() => document.fonts.ready);

const diagrams = Object.fromEntries(
  readdirSync(join(here, 'diagramas'))
    .filter((f) => f.endsWith('.mmd'))
    .map((f) => [f.slice(0, -4), readFileSync(join(here, 'diagramas', f), 'utf8')]),
);

// Os dois temas ficam na mesma página. O diagrama de sequência usa ids fixos ("arrowhead"): sem
// prefixo, a seta do SVG visível apontaria para o marcador do SVG escondido e sumiria.
function uniqueIds(svg, prefix) {
  const ids = [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]).filter((i) => !i.startsWith(prefix));
  for (const id of new Set(ids)) {
    const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    svg = svg
      .replace(new RegExp(` id="${esc}"`, 'g'), ` id="${prefix}-${id}"`)
      .replace(new RegExp(`#${esc}(?![\\w-])`, 'g'), `#${prefix}-${id}`);
  }
  return svg;
}

// Num celular, o diagrama não encolhe abaixo de 60% do tamanho natural: a caixa rola de lado.
function phoneWidth(svg) {
  return svg.replace(/style="max-width: ([\d.]+)px;"/, (_, w) => {
    const min = Math.round(Number(w) * 0.6);
    return `style="max-width: ${w}px; min-width: ${min}px;"`;
  });
}

const svgs = {};
for (const [theme, t] of Object.entries(THEMES)) {
  for (const [name, src] of Object.entries(diagrams)) {
    const code = src.replace(/__([A-Z]+)__/g, (_, k) => {
      const style = t.cls[k.toLowerCase()];
      if (!style) throw new Error(`Classe desconhecida ${k} em ${name}.mmd`);
      return style;
    });
    const svg = await page.evaluate(
      async ({ id, code, cfg }) => {
        mermaid.initialize(cfg);
        const r = await mermaid.render(id, code);
        return r.svg;
      },
      { id: `mapa-${name}-${theme}`, code, cfg: config(t.vars) },
    );
    // Coordenadas com uma casa decimal e sem os pontos de depuração: o SVG cai para menos da metade.
    svgs[`${name}:${theme}`] = phoneWidth(uniqueIds(svg, `mapa-${name}-${theme}`))
      .replace(/ data-points="[^"]*"/g, '')
      .replace(/(\d+\.\d)\d+/g, '$1')
      .replaceAll(`"${FONT}"`, FONT_CSS)
      .replaceAll(FONT, FONT_CSS);
  }
}
await browser.close();

let html = readFileSync(join(here, 'conteudo.html'), 'utf8');
html = html.replace(/<!-- diagrama:([a-z0-9-]+) -->/g, (_, name) => {
  if (!svgs[`${name}:dark`]) throw new Error(`Diagrama ${name} não existe em diagramas/.`);
  return `<div class="d-dark">${svgs[`${name}:dark`]}</div><div class="d-light">${svgs[`${name}:light`]}</div>`;
});

writeFileSync(
  out,
  `// Gerado por docs/mapa/render.mjs a partir de docs/mapa/. Não edite à mão.\nexport const ACTOR_MAP_HTML = ${JSON.stringify(html)};\n`,
);
console.log(`ok: ${Object.keys(diagrams).length} diagramas, ${(html.length / 1024).toFixed(0)} KB`);
