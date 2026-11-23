import { z } from 'zod';
import { Uuid } from '../common';
import { defineRoute } from '../registry';

// Cognuss Competências, Meus Certificados (docs/competencias/ESPECIFICACAO.md, K1). Tudo do
// próprio aluno. O comprovante sobe pelo envio de arquivos (/api/v1/files) e o item aponta
// para ele. Nada entra na soma de horas nem no currículo sem o aluno conferir.

/** Mesma lista de PORTFOLIO_KINDS (@gutta/core); um teste do web confere. */
export const PortfolioKind = z.enum([
  'horas_complementares',
  'evento',
  'apresentacao',
  'resumo_anais',
  'artigo',
  'curso',
  'monitoria',
  'iniciacao_cientifica',
  'liga_academica',
  'extensao',
  'estagio',
  'outro',
]);
export const PortfolioRole = z.enum([
  'participante',
  'ouvinte',
  'apresentador',
  'autor',
  'coautor',
  'organizador',
  'monitor',
]);
export const PortfolioStatus = z.enum(['reading', 'to_confirm', 'confirmed']);

export const FolderDto = z.object({
  id: Uuid,
  name: z.string(),
  items: z.number().int(),
  /** Horas conferidas na pasta, em minutos. */
  minutes: z.number().int(),
});
export type FolderDto = z.infer<typeof FolderDto>;

export const ItemDto = z.object({
  id: Uuid,
  folderId: Uuid.nullable(),
  fileId: Uuid.nullable(),
  fileName: z.string().nullable(),
  /** Miniatura da primeira página ou da imagem (URL assinada de vida curta). */
  thumbnailUrl: z.string().nullable(),
  status: PortfolioStatus,
  kind: PortfolioKind,
  title: z.string(),
  issuer: z.string().nullable(),
  role: PortfolioRole.nullable(),
  startedOn: z.iso.date().nullable(),
  endedOn: z.iso.date().nullable(),
  minutes: z.number().int().nullable(),
  holderName: z.string().nullable(),
  link: z.string().nullable(),
  notes: z.string().nullable(),
  /** O que a leitura com IA pede para conferir, ou por que ela não aconteceu. */
  readNote: z.string().nullable(),
  /** Os campos vieram da leitura com IA (selo de gerado por IA até o aluno confirmar). */
  readByAi: z.boolean(),
  confirmedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type ItemDto = z.infer<typeof ItemDto>;

export const SummaryDto = z.object({
  totalMinutes: z.number().int(),
  byKind: z.record(z.string(), z.number().int()),
  confirmedItems: z.number().int(),
  pendingItems: z.number().int(),
});

export const listPortfolioQuery = z.object({
  pasta: z.union([Uuid, z.literal('sem-pasta')]).optional(),
  tipo: PortfolioKind.optional(),
  situacao: z.enum(['a-conferir', 'conferidos']).optional(),
  q: z.string().trim().max(100).optional(),
});

export const listPortfolio = defineRoute({
  method: 'get',
  path: '/api/v1/portfolio',
  summary: 'Pastas, certificados (com filtros) e a soma de horas conferidas.',
  tags: ['competencias'],
  query: listPortfolioQuery,
  response: z.object({ folders: z.array(FolderDto), items: z.array(ItemDto), summary: SummaryDto }),
  errors: ['feature_disabled'],
});

const folderName = z
  .string()
  .trim()
  .min(1, 'Dê um nome à pasta.')
  .max(60, 'Use até 60 caracteres.');

export const createFolder = defineRoute({
  method: 'post',
  path: '/api/v1/portfolio/folders',
  summary: 'Cria uma pasta em Meus Certificados.',
  tags: ['competencias'],
  body: z.object({ name: folderName }),
  response: z.object({ folder: FolderDto }),
  status: 201,
  errors: ['conflict', 'feature_disabled'],
});

const params = z.object({ id: Uuid });

export const renameFolder = defineRoute({
  method: 'patch',
  path: '/api/v1/portfolio/folders/{id}',
  summary: 'Renomeia uma pasta.',
  tags: ['competencias'],
  params,
  body: z.object({ name: folderName }),
  response: z.object({ folder: FolderDto }),
  errors: ['not_found', 'conflict', 'feature_disabled'],
});

export const deleteFolder = defineRoute({
  method: 'delete',
  path: '/api/v1/portfolio/folders/{id}',
  summary: 'Exclui a pasta; os certificados dela ficam sem pasta.',
  tags: ['competencias'],
  params,
  response: z.object({ ok: z.literal(true) }),
  errors: ['not_found', 'feature_disabled'],
});

export const createItem = defineRoute({
  method: 'post',
  path: '/api/v1/portfolio/items',
  summary:
    'Registra um certificado. Com arquivo, a leitura com IA propõe os campos; sem arquivo, o aluno preenche.',
  tags: ['competencias'],
  body: z.object({ fileId: Uuid.optional(), folderId: Uuid.optional() }),
  response: z.object({ item: ItemDto }),
  status: 201,
  errors: ['not_found', 'feature_disabled'],
});

export const getItem = defineRoute({
  method: 'get',
  path: '/api/v1/portfolio/items/{id}',
  summary: 'Um certificado, com o endereço do comprovante (URL assinada de vida curta).',
  tags: ['competencias'],
  params,
  response: z.object({ item: ItemDto, fileUrl: z.string().nullable() }),
  errors: ['not_found', 'feature_disabled'],
});

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v === '' ? null : v));

export const updateItemBody = z.object({
  folderId: Uuid.nullable().optional(),
  kind: PortfolioKind.optional(),
  title: z.string().trim().max(300).optional(),
  issuer: optText(200),
  role: PortfolioRole.nullable().optional(),
  startedOn: z.iso.date().nullable().optional(),
  endedOn: z.iso.date().nullable().optional(),
  /** Carga horária como o aluno escreve ("20", "4h30", "90 min"). */
  hours: optText(20),
  holderName: optText(200),
  link: z
    .union([
      z.literal(''),
      z.url('Endereço inválido.').startsWith('https://', 'Use um endereço https.'),
    ])
    .nullable()
    .optional()
    .transform((v) => (v === '' ? null : v)),
  notes: optText(1000),
  /** true: o aluno conferiu e confirma (a partir daí entra na soma e no currículo). */
  confirm: z.boolean().optional(),
});

export const updateItem = defineRoute({
  method: 'patch',
  path: '/api/v1/portfolio/items/{id}',
  summary: 'Corrige os campos, move de pasta ou confirma o certificado.',
  tags: ['competencias'],
  params,
  body: updateItemBody,
  response: z.object({ item: ItemDto }),
  errors: ['not_found', 'invalid_request', 'feature_disabled'],
});

export const deleteItem = defineRoute({
  method: 'delete',
  path: '/api/v1/portfolio/items/{id}',
  summary: 'Exclui o certificado (o arquivo continua em Material de estudo, se estiver lá).',
  tags: ['competencias'],
  params,
  response: z.object({ ok: z.literal(true) }),
  errors: ['not_found', 'feature_disabled'],
});
