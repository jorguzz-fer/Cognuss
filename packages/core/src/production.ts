// Produção de aulas interativas (docs/producao/ESPECIFICACAO.md; ADR 0021). Regras puras da
// Fase 1: separar os slides de instrução do professor dos slides de conteúdo, ligar cada pedido
// ao slide a que ele se refere, juntar pedidos que continuam no slide seguinte e marcar o que o
// professor disse ser prioridade. A IA planeja depois, sem poder criar nem apagar pedidos.

/** Tipos de peça do piloto (Aula 1 de Fisiologia Endócrina). */
export const PIECE_TYPES = [
  'simulator',
  'animation',
  'stepper',
  'map',
  'defect_map',
  'timeline',
  'video',
] as const;
export type PieceType = (typeof PIECE_TYPES)[number];

export function isPieceType(v: string): v is PieceType {
  return (PIECE_TYPES as readonly string[]).includes(v);
}

export const PIECE_TYPE_LABEL: Record<PieceType, string> = {
  simulator: 'Simulador com modelo',
  animation: 'Animação em 4 etapas',
  stepper: 'Passo a passo',
  map: 'Mapa clicável',
  defect_map: 'Mapa com defeitos',
  timeline: 'Linha do tempo',
  video: 'Vídeo com narração',
};

/** Quando usar cada tipo: vai para o planejador e para a tela de aprovação. */
export const PIECE_TYPE_WHEN: Record<PieceType, string> = {
  simulator: 'relação dinâmica entre variáveis',
  animation: 'emissor → sinal → receptor → resposta',
  stepper: 'cascata ou via com ordem fixa',
  map: 'estrutura com muitas partes',
  defect_map: 'via metabólica com deficiências',
  timeline: 'evolução ou sequência histórica',
  video: 'pedido explícito de vídeo ou zoom anatômico',
};

/**
 * Créditos de mídia estimados por peça (Higgsfield). Referência do piloto: o vídeo-resumo de
 * 58 s usou 6 clipes de 14 créditos (84) mais 9 imagens; uma aula com 2 vídeos fica entre 150
 * e 250 créditos. As peças em HTML não usam mídia gerada nesta estimativa.
 */
export const PIECE_CREDITS: Record<PieceType, number> = {
  simulator: 0,
  animation: 0,
  stepper: 0,
  map: 0,
  defect_map: 0,
  timeline: 0,
  video: 100,
};

export type SlideKind = 'content' | 'instruction' | 'reference';

export type SlideInput = { number: number; text: string; notes?: string | null };

export type DetectedTask = {
  /** Ordem do pedido na aula, começando em 1. */
  position: number;
  /** Slides de instrução que formam o pedido (mais de um quando o pedido continua). */
  sourceSlides: number[];
  /** Slides de conteúdo a que o pedido se refere. */
  targetSlides: number[];
  /** O pedido não diz o slide: assumimos o anterior. */
  targetAssumed: boolean;
  /** Texto do pedido, como o professor escreveu. */
  instruction: string;
  /** O professor marcou como prioridade ("a parte mais importante da aula"). */
  priority: boolean;
  /** Tipo de peça sugerido pelo próprio texto, quando ele é explícito. */
  hint: PieceType | null;
};

export type Detection = {
  slides: { number: number; kind: SlideKind }[];
  tasks: DetectedTask[];
  /** "instructions": a aula traz pedidos; "content": a IA propõe as peças pelo conteúdo. */
  mode: 'instructions' | 'content';
  /** Texto do slide de referência bibliográfica, quando houver. */
  bibliography: string | null;
};

/** Maiúsculas sem acento e com espaços simples, para comparar texto escrito de qualquer jeito. */
export function foldText(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase().replace(/\s+/g, ' ').trim();
}

/** Espaços e quebras de linha do PDF ficam simples, sem mudar o que o professor escreveu. */
export function tidyText(text: string): string {
  return text
    .split(/\n/)
    .map((l) => l.replace(/[ \t ]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

const VERBS =
  'MONTAR|FAZER|CRIAR|ANIMAR|MOSTRAR|APRESENTAR|ILUSTRAR|DESENHAR|ELABORAR|PRODUZIR|GERAR|INSERIR|COLOCAR|TRANSFORMAR';
const OBJECTS =
  'ESQUEMA|ILUSTRACAO|ANIMACAO|VIDEO|INFOGRAFICO|DIAGRAMA|LINHA DO TEMPO|MAPA|SIMULADOR|FLUXOGRAMA|DESENHO|IMAGEM';

// "Slide anterior" (com o erro de digitação "anteior" que aparece na Aula 1).
const PREVIOUS = /\bSLIDE ANTE(?:R)?IOR\b/;
const SEVERAL_PREVIOUS = /\b(?:OS )?(DOIS|DUAS|TRES|2|3) SLIDES ANTERIORES\b/;
const THIS_SLIDE = /\b(?:N?ESSE|N?ESTE) (?:SLIDE|ESQUEMA)\b/;
const STARTS_WITH_VERB = new RegExp(`^(?:${VERBS})\\b`);
const VERB_AND_OBJECT = new RegExp(`\\b(?:${VERBS})\\b.{0,80}?\\b(?:${OBJECTS})`);
// Prioridade dita sobre a aula ou os slides, não sobre o conteúdo: "um dos mecanismos mais
// importantes" e "exemplo mais importante" (Aula 1, slides 8 e 14) não marcam o pedido.
const PRIORITY =
  /PARTE MAIS IMPORTANTE|MAIS IMPORTANTE DA AULA|SLIDES? (?:ANTERIORE?S? )?(?:SAO|E) MUITO IMPORTANTE|IMPORTANTISSIM|PRIORIDADE|NAO PODE FALTAR/;
const REFERENCE = /^REFERENCIAS?(?: BIBLIOGRAFICAS?)?\b/;

/** Slide de instrução: pedido de produção escrito pelo professor. */
export function isInstruction(text: string): boolean {
  const t = foldText(text);
  if (!t) return false;
  if (/\bNO SLIDE ANTE(?:R)?IOR\b/.test(t) || SEVERAL_PREVIOUS.test(t)) return true;
  if (STARTS_WITH_VERB.test(t)) return true;
  return VERB_AND_OBJECT.test(t.slice(0, 300));
}

export function slideKind(text: string): SlideKind {
  const t = foldText(text);
  if (REFERENCE.test(t)) return 'reference';
  return isInstruction(text) ? 'instruction' : 'content';
}

/** Tipo de peça que o próprio pedido já diz; o resto fica para o planejador. */
export function pieceHint(text: string): PieceType | null {
  const t = foldText(text);
  if (/\bVIDEO\b/.test(t)) return 'video';
  if (/\bLINHA DO TEMPO\b/.test(t)) return 'timeline';
  if (/\bSIMULADOR\b/.test(t)) return 'simulator';
  return null;
}

const COUNT: Record<string, number> = { DOIS: 2, DUAS: 2, TRES: 3, '2': 2, '3': 3 };

/** A que slides o pedido se refere, e se isso foi dito ou presumido. */
export function targetsOf(text: string, number: number): { slides: number[]; assumed: boolean } {
  const t = foldText(text);
  const several = SEVERAL_PREVIOUS.exec(t);
  if (several) {
    const n = COUNT[several[1]!] ?? 2;
    const slides = Array.from({ length: n }, (_, i) => number - n + i).filter((x) => x >= 1);
    return { slides, assumed: false };
  }
  if (PREVIOUS.test(t)) return { slides: number > 1 ? [number - 1] : [number], assumed: false };
  if (THIS_SLIDE.test(t)) return { slides: [number], assumed: false };
  return { slides: number > 1 ? [number - 1] : [number], assumed: true };
}

/**
 * Detecta os pedidos de uma aula. Um pedido cujo slide-alvo é outro pedido (o slide 29 da
 * Aula 1 diz "no slide anterior", e o 28 é um pedido) continua aquele pedido em vez de abrir
 * outro. Sem nenhum pedido, a aula fica no modo "content": a IA propõe as peças.
 */
export function detectTasks(input: SlideInput[]): Detection {
  const ordered = [...input].sort((a, b) => a.number - b.number);
  const slides = ordered.map((s) => ({ number: s.number, kind: slideKind(s.text) }));
  const kindOf = new Map(slides.map((s) => [s.number, s.kind]));
  const bibliography =
    ordered
      .filter((s) => kindOf.get(s.number) === 'reference')
      .map((s) => tidyText(s.text))
      .join('\n') || null;

  const tasks: DetectedTask[] = [];
  const taskOfSlide = new Map<number, DetectedTask>();
  for (const s of ordered) {
    if (kindOf.get(s.number) !== 'instruction') continue;
    const text = tidyText(s.text);
    const { slides: targets, assumed } = targetsOf(text, s.number);
    const continues = targets
      .filter((n) => n !== s.number)
      .map((n) => taskOfSlide.get(n))
      .find(Boolean);
    if (continues) {
      continues.sourceSlides.push(s.number);
      continues.instruction += `\n\n${text}`;
      continues.priority ||= PRIORITY.test(foldText(text));
      continues.hint ??= pieceHint(text);
      taskOfSlide.set(s.number, continues);
      continue;
    }
    const task: DetectedTask = {
      position: tasks.length + 1,
      sourceSlides: [s.number],
      targetSlides: targets,
      targetAssumed: assumed,
      instruction: text,
      priority: PRIORITY.test(foldText(text)),
      hint: pieceHint(text),
    };
    tasks.push(task);
    taskOfSlide.set(s.number, task);
  }
  return { slides, tasks, mode: tasks.length ? 'instructions' : 'content', bibliography };
}

/**
 * Título provisório de um pedido, até a IA (ou o admin) dar o definitivo: a primeira frase,
 * sem "no slide anterior", em caixa normal quando o professor escreveu tudo em maiúsculas.
 */
export function provisionalTitle(instruction: string): string {
  let t = instruction.split('\n')[0]!.trim();
  t = t.replace(
    /^(?:no|nos|nesse|neste)\s+(?:dois\s+|tr[eê]s\s+)?slides?\s+ante(?:r)?iore?s?\s*,?\s*/i,
    '',
  );
  if (t === t.toUpperCase()) t = t.toLowerCase();
  t = t.charAt(0).toUpperCase() + t.slice(1);
  return t.length > 90 ? `${t.slice(0, 87).trimEnd()}…` : t;
}

/** Créditos estimados das tarefas que vão ser geradas (as descartadas não contam). */
export function estimateCredits(tasks: { pieceType: PieceType | null; discarded?: boolean }[]) {
  return tasks.reduce(
    (sum, t) => sum + (t.discarded || !t.pieceType ? 0 : PIECE_CREDITS[t.pieceType]),
    0,
  );
}

/** "Slide 28", "Slides 28–29", "Slides 30 e 31": como a tela fala dos slides de um pedido. */
export function slidesLabel(numbers: number[]): string {
  const ns = [...new Set(numbers)].sort((a, b) => a - b);
  if (ns.length === 0) return '';
  if (ns.length === 1) return `Slide ${ns[0]}`;
  const contiguous = ns.every((n, i) => i === 0 || n === ns[i - 1]! + 1);
  if (contiguous && ns.length > 2) return `Slides ${ns[0]}–${ns.at(-1)}`;
  if (ns.length === 2) return `Slides ${ns[0]}${contiguous ? '–' : ' e '}${ns[1]}`;
  return `Slides ${ns.slice(0, -1).join(', ')} e ${ns.at(-1)}`;
}
