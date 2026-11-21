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
  /** Etapa da mídia do vídeo (Fase 3), ou null nas peças sem mídia. */
  mediaStage: z.string().nullable(),
  /** Aviso da mídia: cota do dia, fila cheia, saldo, falta de chave. */
  mediaAlert: z.string().nullable(),
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
    'Libera a geração das tarefas aprovadas: peças HTML e, nos vídeos, o roteiro (a mídia só depois das aprovações).',
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

export const StoryboardScene = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9-]{1,40}$/, 'Use letras minúsculas, números e hífen no identificador da cena.'),
  narration: z.string().trim().min(1, 'A cena precisa de narração.').max(600),
  imagePrompt: z.string().trim().min(1, 'Descreva a imagem da cena.').max(2000),
  motionPrompt: z.string().trim().max(1000),
  labels: z.array(z.string().trim().min(1).max(40)).max(3),
  referenceScene: z.string().nullable(),
});
export const Storyboard = z.object({
  title: z.string().trim().min(1).max(160),
  scenes: z.array(StoryboardScene).min(1).max(8),
});

export const MediaFileDto = z.object({
  /** URL assinada de vida curta, quando o arquivo já chegou. */
  url: z.string().nullable(),
  status: z.enum(['submitting', 'pending', 'ready', 'failed']),
  error: z.string().nullable(),
  /** Quantas vezes a cena já foi pedida (as anteriores ficam no histórico). */
  attempt: z.number().int(),
  credits: z.number().int(),
});

export const MediaDto = z.object({
  stage: z.string(),
  alert: z.string().nullable(),
  storyboard: Storyboard.nullable(),
  scenes: z.array(
    z.object({
      id: z.string(),
      image: MediaFileDto.nullable(),
      clip: MediaFileDto.nullable(),
    }),
  ),
  narrationUrl: z.string().nullable(),
  videoUrl: z.string().nullable(),
  /** Créditos da Higgsfield gastos nesta tarefa. */
  credits: z.number().int(),
});
export type MediaDto = z.infer<typeof MediaDto>;

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
    media: MediaDto.nullable(),
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

export const mediaActionBody = z.discriminatedUnion('action', [
  /** Aprova o roteiro (com as edições do admin, se houver) e libera as imagens. */
  z.object({ action: z.literal('approve_storyboard'), storyboard: Storyboard.optional() }),
  /** Pede outro roteiro à IA, com um ajuste opcional. */
  z.object({
    action: z.literal('redo_storyboard'),
    note: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .transform((v) => v || null),
  }),
  /** Refaz a imagem de uma cena com outra descrição (novo pedido, novos créditos). */
  z.object({
    action: z.literal('redo_image'),
    scene: z.string().min(1).max(40),
    prompt: z.string().trim().min(1, 'Descreva a imagem.').max(2000),
  }),
  /** Aprova as imagens e libera os clipes, a narração e a montagem. */
  z.object({ action: z.literal('approve_images') }),
  /** Retoma a mídia pausada (saldo, chave, falha); os pedidos que falharam são refeitos. */
  z.object({ action: z.literal('resume') }),
]);

export const mediaAction = defineRoute({
  method: 'post',
  path: '/api/v1/production/tasks/{id}/media',
  summary:
    'Decisões do admin na mídia do vídeo: aprovar ou refazer o roteiro, refazer uma imagem, aprovar as imagens e retomar.',
  tags: ['producao'],
  params,
  body: mediaActionBody,
  response: z.object({ task: TaskDto }),
  errors: ['forbidden', 'not_found', 'conflict'],
});

export const MediaSettingsDto = z.object({
  /** Voz da ElevenLabs por disciplina (id da disciplina → id da voz). */
  voices: z.record(z.string(), z.string()),
  /** Créditos da Higgsfield por dia, somando todos os lotes. */
  dailyCredits: z.number().int(),
  spentToday: z.number().int(),
  disciplines: z.array(z.object({ id: Uuid, name: z.string() })),
});

export const getMediaSettings = defineRoute({
  method: 'get',
  path: '/api/v1/production/settings',
  summary: 'Vozes de narração por disciplina e cota diária de créditos de mídia.',
  tags: ['producao'],
  response: z.object({ settings: MediaSettingsDto }),
  errors: ['forbidden'],
});

export const updateMediaSettingsBody = z.object({
  voices: z.record(
    Uuid,
    z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9]{8,40}$/, 'O id da voz da ElevenLabs tem só letras e números.'),
  ),
  dailyCredits: z.number().int().min(0).max(100_000),
});

export const updateMediaSettings = defineRoute({
  method: 'put',
  path: '/api/v1/production/settings',
  summary: 'Grava as vozes por disciplina e a cota diária de créditos de mídia.',
  tags: ['producao'],
  body: updateMediaSettingsBody,
  response: z.object({ settings: MediaSettingsDto }),
  errors: ['forbidden'],
});
