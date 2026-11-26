// Gera src/features/wiki/content.generated.ts a partir de docs/wiki/ (as páginas "Como …").
// Uso: node apps/web/scripts/gen-wiki.mjs. O teste do wiki falha se o gerado ficar velho.
/* global console, process */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../../docs/wiki');
const out = join(here, '../src/features/wiki/content.generated.ts');

export function collect(dir = root) {
  const pages = {};
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith('.md')) pages[relative(root, p).replace(/\.md$/, '')] = readFileSync(p, 'utf8');
    }
  };
  walk(dir);
  return pages;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const pages = collect();
  writeFileSync(
    out,
    `// Gerado por apps/web/scripts/gen-wiki.mjs a partir de docs/wiki/. Não edite à mão.\nexport const WIKI: Record<string, string> = ${JSON.stringify(pages, null, 0)};\n`,
  );
  console.log(`ok: ${Object.keys(pages).length} páginas`);
}
