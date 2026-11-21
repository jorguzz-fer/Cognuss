import { z } from 'zod';
import { Uuid } from '../common';
import { defineRoute } from '../registry';

// Produção de aulas interativas (docs/producao/ESPECIFICACAO.md; ADR 0021). Só admin. O
// arquivo da aula sobe pelo envio de arquivos (/api/v1/files) e o lote aponta para ele.

/** Mesma lista de PIECE_TYPES (@gutta/core); um teste do web confere. */
export const PieceType = z.enum([
  'simulator',
  'animation',
  'stepper',
  'map',
  'defect_map',
  'timeline',
  'video',
]);

export const BatchStatus = z.enum([
  'waiting_file',
  'extracting',
  'planning',
  'ready',
  'failed',
  'generating',
  'generated',
]);
export const TaskStatus = z.enum([
  'proposed',
  'approved',
  'discarded',
  'generating',
  'generated',
  'failed',
]);

/** Decisões que o admin toma na tela do lote (as outras situações vêm da geração). */
export const TaskDecision = z.enum(['proposed', 'approved', 'discarded']);

export const BatchDto = z.object({
  id: Uuid,
  title: z.string(),
  disciplineId: Uuid,
  disciplineName: z.string(),
  topicId: Uuid,
  topicName: z.string(),
  position: z.number().int(),
  status: BatchStatus,
  mode: z.enum(['instructions', 'content']).nullable(),
  error: z.string().nullable(),
  warnings: z.array(z.string()),
  fileName: z.string(),
  estimatedCredits: z.number().int(),
  planCostMicros: z.number().int(),
  createdAt: z.iso.datetime(),
});
export type BatchDto = z.infer<typeof BatchDto>;

export const SlideDto = z.object({
  number: z.number().int(),
  kind: z.enum(['content', 'instruction', 'reference']),
  text: z.string(),
  notes: z.string().nullable(),
  hidden: z.boolean(),
  /** URL assinada de vida curta da imagem do slide (1024 px), quando há. */
  imageUrl: z.string().nullable(),
});
export type SlideDto = z.infer<typeof SlideDto>;

export const TaskDto = z.object({
  id: Uuid,
  position: z.number().int(),
  origin: z.enum(['instruction', 'proposed']),
  sourceSlides: z.array(z.number().int()),
  targetSlides: z.array(z.number().int()),
  targetAssumed: z.boolean(),
  instruction: z.string(),
  priority: z.boolean(),
  pieceType: PieceType.nullable(),
  title: z.string(),
  plan: z.record(z.string(), z.unknown()).nullable(),
  status: TaskStatus,
  credits: z.number().int(),
  /** Última versão gerada da peça (Fase 2). */
  currentVersion: z.number().int().nullable(),
  /** Por que a última geração falhou. */
  lastError: z.string().nullable(),
});
export type TaskDto = z.infer<typeof TaskDto>;

export const createBatchBody = z.object({
  topicId: Uuid,
  title: z.string().trim().min(3, 'Dê um nome à aula.').max(160),
  position: z.number().int().min(0).max(999),
  fileId: Uuid,
});

export const createBatch = defineRoute({
  method: 'post',
  path: '/api/v1/production/batches',
  summary:
    'Cria um lote de produção a partir de um arquivo já enviado. A extração começa quando o arquivo terminar de processar.',
  tags: ['producao'],
  body: createBatchBody,
  response: z.object({ batch: BatchDto }),
  status: 201,
  errors: ['forbidden', 'not_found', 'conflict'],
});

const params = z.object({ id: Uuid });

export const getBatch = defineRoute({
  method: 'get',
  path: '/api/v1/production/batches/{id}',
  summary: 'Lote com os slides (imagem, texto e notas) e as tarefas detectadas ou propostas.',
  tags: ['producao'],
  params,
  response: z.object({ batch: BatchDto, slides: z.array(SlideDto), tasks: z.array(TaskDto) }),
  errors: ['forbidden', 'not_found'],
});

export const updateTaskBody = z
  .object({
    status: TaskDecision.optional(),
    title: z.string().trim().min(3, 'O título ficou curto.').max(160).optional(),
    pieceType: PieceType.nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nada para mudar.');

export const updateTask = defineRoute({
  method: 'patch',
  path: '/api/v1/production/tasks/{id}',
  summary:
    'Aprova, descarta ou edita uma tarefa (título e tipo de peça). Devolve o custo estimado do lote.',
  tags: ['producao'],
  params,
  body: updateTaskBody,
  response: z.object({ task: TaskDto, estimatedCredits: z.number().int() }),
  errors: ['forbidden', 'not_found', 'conflict'],
});

export const generateBatch = defineRoute({
  method: 'post',
  path: '/api/v1/production/batches/{id}/generate',
  summary:
    'Libera a geração das peças HTML das tarefas aprovadas (o vídeo fica para a fase de mídia).',
  tags: ['producao'],
  params,
  response: z.object({ batch: BatchDto, released: z.number().int() }),
  errors: ['forbidden', 'not_found', 'conflict'],
});

export const VersionDto = z.object({
  version: z.number().int(),
  ok: z.boolean(),
  tested: z.boolean(),
  problems: z.array(z.string()),
  warnings: z.array(z.string()),
  /** Capturas do teste de render: claro, escuro e celular (URLs assinadas de vida curta). */
  screenshots: z.record(z.string(), z.string()),
  costMicros: z.number().int(),
  createdAt: z.iso.datetime(),
});
export type VersionDto = z.infer<typeof VersionDto>;

export const getTask = defineRoute({
  method: 'get',
  path: '/api/v1/production/tasks/{id}',
  summary: 'Tarefa com o plano, os slides do pedido e o histórico de versões da peça.',
  tags: ['producao'],
  params,
  response: z.object({
    batch: BatchDto,
    task: TaskDto,
    slides: z.array(SlideDto),
    versions: z.array(VersionDto),
  }),
  errors: ['forbidden', 'not_found'],
});

export const regenerateTaskBody = z.object({
  note: z
    .string()
    .trim()
    .max(2000, 'O pedido de ajuste passa de 2.000 caracteres.')
    .optional()
    .transform((v) => v || null),
});

export const regenerateTask = defineRoute({
  method: 'post',
  path: '/api/v1/production/tasks/{id}/regenerate',
  summary:
    'Gera a peça de novo, opcionalmente com um pedido de ajuste que a IA aplica sobre a versão atual.',
  tags: ['producao'],
  params,
  body: regenerateTaskBody,
  response: z.object({ task: TaskDto }),
  errors: ['forbidden', 'not_found', 'conflict'],
});
