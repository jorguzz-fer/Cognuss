import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { withTempDir } from './tools';

const run = promisify(execFile);

// Apresentações para a produção de aulas (ADR 0021). O texto, as notas e os slides ocultos
// saem do XML do PPTX, na numeração da apresentação; o PDF não traz slides ocultos, e é nele
// que o professor costuma esconder os pedidos de produção. Sem shell, sem rede.

export type PresentationSlide = {
  number: number;
  text: string;
  notes: string | null;
  hidden: boolean;
};

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

export function decodeXml(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#')
      return String.fromCodePoint(
        e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1),
      );
    return ENTITIES[e] ?? m;
  });
}

// Número do slide, data, rodapé e a miniatura do slide nas notas não são texto do professor.
const SKIP_PLACEHOLDER = /<p:ph\b[^>]*\btype="(?:sldNum|dt|ftr|hdr|sldImg)"/;

/** Texto de um slide ou de uma página de notas: um parágrafo por linha. */
export function xmlText(xml: string): string {
  const kept = xml.replace(/<p:sp\b[\s\S]*?<\/p:sp>/g, (sp) =>
    SKIP_PLACEHOLDER.test(sp) ? '' : sp,
  );
  const lines: string[] = [];
  for (const p of kept.matchAll(/<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g)) {
    const line = [...p[1]!.matchAll(/<a:t\b[^>]*>([\s\S]*?)<\/a:t>|<a:br\b[^>]*\/>/g)]
      .map((r) => (r[1] === undefined ? '\n' : decodeXml(r[1])))
      .join('')
      .replace(/[ \t ]+/g, ' ')
      .trim();
    if (line) lines.push(line);
  }
  return lines.join('\n');
}

/** Relações de um arquivo .rels: id → alvo, e tipo → alvo. */
export function parseRels(xml: string) {
  const byId = new Map<string, string>();
  const byType = new Map<string, string>();
  for (const m of xml.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const attrs = m[1]!;
    const id = /\bId="([^"]+)"/.exec(attrs)?.[1];
    const target = /\bTarget="([^"]+)"/.exec(attrs)?.[1];
    const type = /\bType="([^"]+)"/.exec(attrs)?.[1];
    if (id && target) byId.set(id, target);
    if (type && target) byType.set(type.split('/').pop()!, target);
  }
  return { byId, byType };
}

/** Ordem dos slides na apresentação: os r:id de p:sldIdLst. */
export function slideOrder(presentationXml: string): string[] {
  const list = /<p:sldIdLst\b[^>]*>([\s\S]*?)<\/p:sldIdLst>/.exec(presentationXml)?.[1] ?? '';
  return [...list.matchAll(/<p:sldId\b[^>]*\br:id="([^"]+)"/g)].map((m) => m[1]!);
}

export function isHiddenSlide(slideXml: string): boolean {
  return /<p:sld\b[^>]*\bshow="(?:0|false)"/.test(slideXml);
}

/** Caminho dentro do zip a partir de um alvo relativo ("../notesSlides/notesSlide1.xml"). */
export function resolvePart(from: string, target: string): string {
  if (target.startsWith('/')) return target.slice(1);
  return path.posix.normalize(path.posix.join(path.posix.dirname(from), target));
}

/** Lê uma parte do PPTX sem extrair o arquivo inteiro. Parte que não existe: null. */
async function part(file: string, name: string): Promise<string | null> {
  try {
    const { stdout } = await run('unzip', ['-p', file, name], {
      timeout: 30_000,
      maxBuffer: 32 * 1024 * 1024,
      encoding: 'utf8',
    });
    return stdout || null;
  } catch {
    return null;
  }
}

export async function readPptx(pptx: Buffer): Promise<PresentationSlide[]> {
  return withTempDir(async (dir) => {
    const file = path.join(dir, 'aula.pptx');
    await writeFile(file, pptx);
    const presentation = await part(file, 'ppt/presentation.xml');
    const rels = await part(file, 'ppt/_rels/presentation.xml.rels');
    if (!presentation || !rels) throw new Error('PPTX sem presentation.xml');
    const { byId } = parseRels(rels);
    const slides: PresentationSlide[] = [];
    for (const rid of slideOrder(presentation)) {
      const target = byId.get(rid);
      if (!target) continue;
      const slidePath = resolvePart('ppt/presentation.xml', target);
      const xml = (await part(file, slidePath)) ?? '';
      const slideRels = await part(
        file,
        path.posix.join(
          path.posix.dirname(slidePath),
          '_rels',
          `${path.posix.basename(slidePath)}.rels`,
        ),
      );
      const notesTarget = slideRels ? parseRels(slideRels).byType.get('notesSlide') : undefined;
      const notesXml = notesTarget ? await part(file, resolvePart(slidePath, notesTarget)) : null;
      slides.push({
        number: slides.length + 1,
        text: xmlText(xml),
        notes: notesXml ? xmlText(notesXml) || null : null,
        hidden: isHiddenSlide(xml),
      });
    }
    return slides;
  });
}

/** Apresentação antiga (.ppt) ou do LibreOffice (.odp) para PPTX. */
export async function toPptx(input: Buffer, ext: string, timeoutMs = 180_000): Promise<Buffer> {
  return withTempDir(async (dir) => {
    const src = path.join(dir, `entrada.${ext}`);
    await writeFile(src, input);
    await run(
      'soffice',
      [
        `-env:UserInstallation=file://${dir}/perfil`,
        '--headless',
        '--norestore',
        '--nolockcheck',
        '--convert-to',
        'pptx',
        '--outdir',
        dir,
        src,
      ],
      { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 },
    );
    return readFile(path.join(dir, 'entrada.pptx'));
  });
}

export const PRESENTATION_EXT: Record<string, string> = {
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.oasis.opendocument.presentation': 'odp',
};

/**
 * Liga cada página do PDF a um slide. O PDF do LibreOffice não traz os slides ocultos: com
 * menos páginas que slides, a página N é o N-ésimo slide visível. Contagem que não bate com
 * nenhum dos dois: sem ligação (o lote avisa que faltam imagens).
 */
export function pageToSlide(
  slides: { number: number; hidden: boolean }[],
  pageCount: number,
): Map<number, number> | null {
  const map = new Map<number, number>();
  if (pageCount === slides.length) {
    slides.forEach((s, i) => map.set(i + 1, s.number));
    return map;
  }
  const visible = slides.filter((s) => !s.hidden);
  if (pageCount === visible.length) {
    visible.forEach((s, i) => map.set(i + 1, s.number));
    return map;
  }
  return null;
}
