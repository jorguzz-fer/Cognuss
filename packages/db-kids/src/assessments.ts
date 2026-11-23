import { randomUUID } from 'node:crypto';
import type { Tx } from './client';
import * as s from './schema';

// Fase 3 (SPEC Kids, AVA-01): uma questão é um conceito em até três formatos, como no piloto.
// A recuperação (AVA-05) usa os outros formatos do mesmo conceito.

export type QuestionKind = (typeof s.questionKind.enumValues)[number];

export const QUESTION_KIND_LABEL: Record<QuestionKind, string> = {
  multiple_choice: 'Alternativas',
  true_false: 'Verdadeiro ou falso',
  short_answer: 'Escrever',
};

export type ConceptInput = {
  tenantId: string;
  topicId: string;
  explanation?: string | null;
  multipleChoice?: { stem: string; options: string[]; correct: number } | null;
  trueFalse?: { stem: string; value: boolean } | null;
  shortAnswer?: {
    stem: string;
    groups: string[][];
    min: number;
    modelAnswer?: string | null;
  } | null;
};

/**
 * Palavras-chave da resposta escrita: grupos separados por ";" e, dentro do grupo, radicais
 * alternativos separados por "/". Ex.: "brânqui/guelra; oxigênio" = 2 grupos.
 */
export function parseKeywordGroups(raw: string): string[][] {
  return raw
    .split(';')
    .map((g) =>
      g
        .split('/')
        .map((w) => w.trim().toLowerCase())
        .filter(Boolean),
    )
    .filter((g) => g.length > 0);
}

/** Cria o conceito com os formatos informados (pelo menos um). Devolve o group_id. */
export async function addConcept(tx: Tx, input: ConceptInput): Promise<string> {
  const groupId = randomUUID();
  const base = {
    tenantId: input.tenantId,
    topicId: input.topicId,
    groupId,
    explanation: input.explanation?.trim() || null,
  };
  const rows: (typeof s.questions.$inferInsert)[] = [];
  if (input.multipleChoice) {
    rows.push({
      ...base,
      kind: 'multiple_choice',
      stem: input.multipleChoice.stem.trim(),
      options: input.multipleChoice.options.map((o) => o.trim()),
      answer: { correct: input.multipleChoice.correct },
    });
  }
  if (input.trueFalse) {
    rows.push({
      ...base,
      kind: 'true_false',
      stem: input.trueFalse.stem.trim(),
      answer: { value: input.trueFalse.value },
    });
  }
  if (input.shortAnswer) {
    rows.push({
      ...base,
      kind: 'short_answer',
      stem: input.shortAnswer.stem.trim(),
      answer: { groups: input.shortAnswer.groups, min: input.shortAnswer.min },
      modelAnswer: input.shortAnswer.modelAnswer?.trim() || null,
    });
  }
  if (rows.length === 0) throw new Error('a questão precisa de pelo menos um formato');
  await tx.insert(s.questions).values(rows);
  return groupId;
}
