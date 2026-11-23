// Regra pura da situação do aluno numa prova (AVA-04, AVA-05). Testada em exam-state.test.ts.

export type AttemptLite = {
  id: string;
  retakeOf: string | null;
  submittedAt: Date | null;
  passed: boolean | null;
  score: string | null;
};

/**
 * Situação do aluno numa prova: o que mostrar e qual o próximo passo. Recuperação aparece quando
 * a última tentativa enviada ficou abaixo da nota e ainda há recuperações (AVA-05).
 */
export function examState(
  a: { kind: 'practice' | 'exam'; maxAttempts: number | null; maxRetakes: number; open: boolean },
  attempts: AttemptLite[],
) {
  const inProgress = attempts.find((t) => !t.submittedAt) ?? null;
  const submitted = attempts.filter((t) => t.submittedAt);
  const last = submitted[0] ?? null;
  const passed = submitted.some((t) => t.passed === true);
  const firstTries = attempts.filter((t) => !t.retakeOf).length;
  const retakes = attempts.filter((t) => t.retakeOf).length;
  const canRetake =
    a.kind === 'exam' &&
    !inProgress &&
    !passed &&
    last?.passed === false &&
    retakes < a.maxRetakes &&
    !attempts.some((t) => t.retakeOf === last.id);
  const canStart =
    a.open &&
    !inProgress &&
    (a.kind === 'practice' || (!passed && (a.maxAttempts === null || firstTries < a.maxAttempts)));
  return {
    inProgress,
    last,
    passed,
    canRetake: a.open && canRetake,
    canStart,
    retakeOf: last?.id ?? null,
  };
}
