// Rótulos de interface do Kids.
export const TENANT_STATUS = {
  active: 'Ativa',
  suspended: 'Suspensa',
  closed: 'Encerrada',
} as const;

export const ROLE_LABEL = { manager: 'Gestão', teacher: 'Professor', student: 'Aluno' } as const;

export const PLAN_STATUS_TONE = {
  draft: 'neutral',
  in_review: 'warn',
  approved: 'accent',
  published: 'success',
  archived: 'neutral',
} as const;
