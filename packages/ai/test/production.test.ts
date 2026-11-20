import { describe, expect, it } from 'vitest';
import {
  FakeLessonPlanner,
  PRODUCTION_RULES,
  ProductionPlan,
  reconcilePlan,
  slidesForImages,
  type PiecePlan,
  type PlanInput,
} from '../src/production';

// Plano por IA da produção de aulas (ADR 0021): a IA não cria nem apaga pedidos.
const plan = (title: string): PiecePlan => ({
  pieceType: 'simulator',
  title,
  theme: 'Feedback',
  lead: 'Mude o cortisol e veja o CRH.',
  interaction: 'Eixo HHA com controles.',
  scenarios: [{ id: 'normal', label: 'Normal', description: 'Eixo em equilíbrio.' }],
  fixar: 'O produto inibe o liberador.',
  naProva: 'Corticoide exógeno suprime o eixo.',
  centralTheme: false,
  questions: [],
  media: [],
  reviewNotes: [],
});

const input = (mode: PlanInput['mode']): PlanInput => ({
  discipline: 'Fisiologia endócrina',
  lesson: 'Aula 1',
  bibliography: null,
  mode,
  slides: [1, 2, 3, 4, 5].map((n) => ({
    number: n,
    kind: n === 3 || n === 5 ? ('instruction' as const) : ('content' as const),
    text: '',
    notes: null,
  })),
  tasks:
    mode === 'content'
      ? []
      : [
          {
            position: 1,
            sourceSlides: [3],
            targetSlides: [2],
            targetAssumed: false,
            instruction: 'No slide anterior, montar um esquema',
            priority: false,
            hint: null,
          },
          {
            position: 2,
            sourceSlides: [5],
            targetSlides: [4],
            targetAssumed: false,
            instruction: 'No slide anterior, criar um simulador',
            priority: true,
            hint: 'simulator',
          },
        ],
});

describe('plano da produção', () => {
  it('um plano por pedido: o que a IA inventa sai, o que ela esquece fica sem plano', () => {
    const out = reconcilePlan(input('instructions'), {
      tasks: [
        { ref: 2, targetSlides: [], reason: '', plan: plan('Termostato') },
        { ref: 2, targetSlides: [], reason: '', plan: plan('Repetido') },
        { ref: 9, targetSlides: [], reason: '', plan: plan('Inventado') },
      ],
      warnings: [],
    });
    expect(out.map((t) => [t.ref, t.targetSlides, t.plan?.title ?? null])).toEqual([
      [1, [2], null],
      [2, [4], 'Termostato'],
    ]);
  });

  it('aula sem pedidos: aceita as propostas, renumera e tira slides que não existem', () => {
    const out = reconcilePlan(input('content'), {
      tasks: [
        { ref: 7, targetSlides: [4, 2, 99, 2], reason: 'Mecanismo dinâmico.', plan: plan('A') },
        { ref: 8, targetSlides: [1], reason: 'Caso clínico.', plan: plan('B') },
      ],
      warnings: [],
    });
    expect(out.map((t) => [t.ref, t.targetSlides])).toEqual([
      [1, [2, 4]],
      [2, [1]],
    ]);
  });

  it('imagens: os slides-alvo dos pedidos, ou todo o conteúdo numa aula sem pedidos', () => {
    expect(slidesForImages(input('instructions'))).toEqual([2, 4]);
    expect(slidesForImages(input('content'))).toEqual([1, 2, 4]);
  });

  it('o esquema aceita o plano e as regras citam os 7 tipos de peça', () => {
    expect(() =>
      ProductionPlan.parse({
        tasks: [{ ref: 1, targetSlides: [2], reason: '', plan: plan('X') }],
        warnings: [],
      }),
    ).not.toThrow();
    for (const t of ['simulator', 'animation', 'stepper', 'map', 'defect_map', 'timeline', 'video'])
      expect(PRODUCTION_RULES).toContain(`- ${t}:`);
  });

  it('o planejador falso segue o tipo indicado pelo pedido', async () => {
    const r = await new FakeLessonPlanner().plan(input('instructions'));
    expect(r.tasks.map((t) => t.plan?.pieceType)).toEqual(['animation', 'simulator']);
  });
});
