import { describe, expect, it } from 'vitest';
import { examState, type AttemptLite } from './exam-state';

const exam = { kind: 'exam' as const, maxAttempts: 1, maxRetakes: 2, open: true };
const t = (id: string, o: Partial<AttemptLite> = {}): AttemptLite => ({
  id,
  retakeOf: null,
  submittedAt: new Date(),
  passed: false,
  score: '5.0',
  ...o,
});

describe('situação da prova (AVA-04, AVA-05)', () => {
  it('sem tentativa: pode começar', () => {
    expect(examState(exam, [])).toMatchObject({ canStart: true, canRetake: false });
  });

  it('reprovou: não refaz a prova, faz a recuperação', () => {
    expect(examState(exam, [t('a')])).toMatchObject({
      canStart: false,
      canRetake: true,
      retakeOf: 'a',
    });
  });

  it('a recuperação mais recente é a base da próxima; limite de recuperações', () => {
    const r1 = t('r1', { retakeOf: 'a' });
    expect(examState(exam, [r1, t('a')])).toMatchObject({ canRetake: true, retakeOf: 'r1' });
    const r2 = t('r2', { retakeOf: 'r1' });
    expect(examState(exam, [r2, r1, t('a')]).canRetake).toBe(false);
  });

  it('aprovado: nada mais a fazer; em andamento: continuar', () => {
    expect(examState(exam, [t('a', { passed: true })])).toMatchObject({
      canStart: false,
      canRetake: false,
      passed: true,
    });
    expect(examState(exam, [t('a', { submittedAt: null, passed: null })]).inProgress?.id).toBe('a');
  });

  it('simulado: pode repetir; fora do prazo, não começa', () => {
    expect(examState({ ...exam, kind: 'practice' }, [t('a', { passed: null })]).canStart).toBe(
      true,
    );
    expect(examState({ ...exam, open: false }, []).canStart).toBe(false);
  });
});
