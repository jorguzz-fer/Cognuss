import { z } from 'zod';

// Validação dos formulários do Kids (Zod no servidor; o navegador nunca é a fronteira).

export const UF = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
] as const;

export const email = z.string().trim().toLowerCase().pipe(z.email());

export const tenantForm = z.object({
  name: z.string().trim().min(3).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .max(60),
  city: z.string().trim().min(2).max(80),
  state: z.enum(UF),
  kind: z.enum(['public', 'private']),
  cnpj: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v === '' || v.length === 14)
    .optional(),
  managerEmail: email,
});

export const staffInvite = z.object({ email, role: z.enum(['manager', 'teacher']) });

export const classForm = z.object({
  gradeId: z.uuid(),
  name: z.string().trim().min(1).max(40),
  schoolYear: z.coerce.number().int().min(2020).max(2100),
});

export const studentForm = z.object({
  name: z.string().trim().min(2).max(120),
  nickname: z.string().trim().min(1).max(40),
});

/** Converte um FormData em objeto simples para o Zod. */
export function formObject(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === 'string') out[k] = v;
  return out;
}

/** Postgres: violação de unicidade. */
export function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return (e?.code ?? e?.cause?.code) === '23505';
}
