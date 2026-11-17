import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  detectTasks,
  estimateCredits,
  foldText,
  isInstruction,
  slidesLabel,
  targetsOf,
  type SlideInput,
} from './production';

// Texto real extraído dos .ppt do Dr. Rafael (docs/producao/referencias). Uma linha por slide:
// "--- N: texto", com " | " e " / " no lugar das quebras de parágrafo.
function fixture(aula: string): SlideInput[] {
  const raw = readFileSync(
    new URL(
      `../../../docs/producao/referencias/${aula}/fontes/slides-extraidos.txt`,
      import.meta.url,
    ),
    'utf8',
  );
  return raw
    .split('\n')
    .map((line) => /^--- (\d+): ?(.*)$/.exec(line))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ number: Number(m[1]), text: m[2]!.replace(/ (\||\/) /g, '\n') }));
}

describe('detecção de pedidos: Aula 1 (com slides de instrução)', () => {
  const d = detectTasks(fixture('aula-1'));

  it('acha as mesmas 13 tarefas do índice da aula, na ordem', () => {
    // docs/producao/referencias/aula-1/pecas/indice.html
    expect(d.mode).toBe('instructions');
    expect(d.tasks.map((t) => t.sourceSlides)).toEqual([
      [4],
      [6],
      [8],
      [10],
      [12],
      [14],
      [16],
      [18],
      [20],
      [21],
      [22],
      [28, 29],
      [32],
    ]);
    expect(d.tasks.map((t) => t.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });

  it('marca como prioridade só o feedback ("a parte mais importante da aula")', () => {
    expect(d.tasks.filter((t) => t.priority).map((t) => t.sourceSlides)).toEqual([[32]]);
  });

  it('liga cada pedido ao slide de conteúdo certo', () => {
    const bySource = new Map(d.tasks.map((t) => [t.sourceSlides[0], t]));
    expect(bySource.get(4)!.targetSlides).toEqual([3]);
    expect(bySource.get(4)!.targetAssumed).toBe(false);
    // "Fazer um esquema para esse slide" e "Animar esse esquema": o próprio slide.
    expect(bySource.get(21)!.targetSlides).toEqual([21]);
    expect(bySource.get(22)!.targetSlides).toEqual([22]);
    // "Os dois slides anteriores são muito importantes".
    expect(bySource.get(32)!.targetSlides).toEqual([30, 31]);
    // Pedido sem "slide anterior": presume o anterior, e a tela avisa.
    expect(bySource.get(18)!.targetSlides).toEqual([17]);
    expect(bySource.get(18)!.targetAssumed).toBe(true);
  });

  it('junta a continuação do slide 29 ao pedido do 28, com os dois textos', () => {
    const vias = d.tasks.find((t) => t.sourceSlides[0] === 28)!;
    expect(vias.targetSlides).toEqual([27]);
    expect(vias.instruction).toContain('Via do AMPc');
    expect(vias.instruction).toContain('Receptores nucleares');
  });

  it('reconhece o pedido de vídeo e separa a referência bibliográfica', () => {
    expect(d.tasks.find((t) => t.sourceSlides[0] === 20)!.hint).toBe('video');
    expect(d.tasks.find((t) => t.sourceSlides[0] === 4)!.hint).toBe('timeline');
    expect(d.slides.find((s) => s.number === 2)!.kind).toBe('reference');
    expect(d.bibliography).toContain('CAPÍTULO 64');
    expect(d.slides.filter((s) => s.kind === 'instruction')).toHaveLength(14);
  });
});

describe('detecção de pedidos: Aula 2 (sem instruções)', () => {
  const d = detectTasks(fixture('aula-2'));

  it('não acha pedido nenhum e passa a IA a propor pelo conteúdo', () => {
    expect(d.tasks).toEqual([]);
    expect(d.mode).toBe('content');
    expect(d.slides).toHaveLength(27);
    expect(d.bibliography).toContain('CAPÍTULO 73');
  });
});

describe('regras de texto', () => {
  it('compara sem acento, sem caixa e com espaços simples', () => {
    expect(foldText('  No slide   anterior,\nmontar ')).toBe('NO SLIDE ANTERIOR, MONTAR');
  });

  it('não confunde slide de conteúdo com pedido', () => {
    expect(isInstruction('Sinalização parácrina\nÓxido nítrico no endotélio')).toBe(false);
    expect(isInstruction('O esquema mostra a via do AMPc')).toBe(false);
    expect(isInstruction('')).toBe(false);
    expect(isInstruction('Criar uma animação da via')).toBe(true);
  });

  it('entende "slide anteior", "dois slides anteriores" e "este slide"', () => {
    expect(targetsOf('NO SLIDE ANTEIOR, MONTAR', 14)).toEqual({ slides: [13], assumed: false });
    expect(targetsOf('Os três slides anteriores', 10)).toEqual({
      slides: [7, 8, 9],
      assumed: false,
    });
    expect(targetsOf('Animar este esquema', 5)).toEqual({ slides: [5], assumed: false });
    expect(targetsOf('Montar um esquema', 1)).toEqual({ slides: [1], assumed: true });
  });

  it('soma os créditos só das tarefas que vão ser geradas', () => {
    expect(
      estimateCredits([
        { pieceType: 'video' },
        { pieceType: 'video', discarded: true },
        { pieceType: 'simulator' },
        { pieceType: null },
      ]),
    ).toBe(100);
  });

  it('escreve os slides como a tela mostra', () => {
    expect(slidesLabel([4])).toBe('Slide 4');
    expect(slidesLabel([29, 28])).toBe('Slides 28–29');
    expect(slidesLabel([30, 32])).toBe('Slides 30 e 32');
    expect(slidesLabel([1, 2, 3])).toBe('Slides 1–3');
  });
});
