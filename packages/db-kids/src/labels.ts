// Rótulos de etapa e ano/série (EST-03): calculados, nunca guardados nem editáveis.
export type Stage = 'fundamental' | 'medio';

export const STAGE_GRADES: Record<Stage, readonly number[]> = {
  fundamental: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  medio: [1, 2, 3],
};

export function stageLabel(stage: Stage): string {
  return stage === 'fundamental' ? 'Ensino Fundamental' : 'Ensino Médio';
}

/** "3º ano" no Fundamental, "1ª série" no Médio. */
export function gradeLabel(stage: Stage, n: number): string {
  if (!STAGE_GRADES[stage].includes(n)) throw new RangeError(`ano inválido: ${stage} ${n}`);
  return stage === 'fundamental' ? `${n}º ano` : `${n}ª série`;
}
