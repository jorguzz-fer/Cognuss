// Tipos compartilhados entre as ações de aluno e os formulários (sem 'use server').
export type Credential = { name: string; username: string; password: string };

export type StudentActionState = {
  error?: string;
  credentials?: Credential[];
  skipped?: { line: string; reason: string }[];
};
