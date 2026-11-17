import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, pk, updatedAt } from './_shared';
import { authUsers } from './auth';
import { disciplines, modules, topics } from './catalog';
import { files } from './files';

// Produção de aulas interativas (docs/producao/ESPECIFICACAO.md; ADR 0021). Área só do admin:
// o arquivo do professor vira slides, os pedidos viram tarefas e, nas próximas fases, cada
// tarefa aprovada vira peça (modules) e questões (questions). Tudo com prefixo production_.

export const productionBatchStatus = pgEnum('production_batch_status', [
  'waiting_file', // o arquivo ainda está sendo verificado e convertido
  'extracting', // separando slides, texto, notas e imagens
  'planning', // a IA está planejando as peças
  'ready', // plano pronto para o admin aprovar
  'failed',
]);

export const productionSlideKind = pgEnum('production_slide_kind', [
  'content', // slide da aula (vira contexto e imagem de referência)
  'instruction', // pedido do professor ("no slide anterior, montar um esquema…")
  'reference', // referência bibliográfica
]);

export const productionTaskStatus = pgEnum('production_task_status', [
  'proposed', // detectada ou proposta, esperando o admin
  'approved',
  'discarded',
]);

export const productionBatches = pgTable(
  'production_batches',
  {
    id: pk(),
    disciplineId: uuid('discipline_id')
      .notNull()
      .references(() => disciplines.id),
    topicId: uuid('topic_id')
      .notNull()
      .references(() => topics.id),
    /** "Aula 1 · Introdução à fisiologia endócrina". */
    title: text('title').notNull(),
    /** Posição da aula na ordem do curso (vira modules.order_index na publicação). */
    position: integer('position').notNull().default(0),
    fileId: uuid('file_id')
      .notNull()
      .references(() => files.id),
    createdBy: text('created_by').references(() => authUsers.id, { onDelete: 'set null' }),
    status: productionBatchStatus('status').notNull().default('waiting_file'),
    /** "instructions": a aula traz pedidos; "content": a IA propôs as peças pelo conteúdo. */
    mode: text('mode'),
    bibliography: text('bibliography'),
    error: text('error'),
    /** Avisos da extração e do plano para o admin (slides sem imagem, plano incompleto…). */
    warnings: text('warnings').array().notNull().default([]),
    /** Créditos de mídia: estimado pelas tarefas aprovadas; real a partir da Fase 3. */
    estimatedCredits: integer('estimated_credits').notNull().default(0),
    actualCredits: integer('actual_credits').notNull().default(0),
    /** Custo do plano por IA, em milionésimos de dólar (o mesmo de ai_usage). */
    planCostMicros: bigint('plan_cost_micros', { mode: 'number' }).notNull().default(0),
    planModel: text('plan_model'),
    plannedAt: timestamp('planned_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('production_batches_created_idx').on(t.createdAt),
    index('production_batches_file_idx').on(t.fileId),
  ],
);

export const productionSlides = pgTable(
  'production_slides',
  {
    id: pk(),
    batchId: uuid('batch_id')
      .notNull()
      .references(() => productionBatches.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    kind: productionSlideKind('kind').notNull(),
    text: text('text').notNull().default(''),
    notes: text('notes'),
    /** Slide oculto na apresentação: não sai no PDF nem tem imagem. */
    hidden: boolean('hidden').notNull().default(false),
    hasImage: boolean('has_image').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('production_slides_batch_number_uq').on(t.batchId, t.number)],
);

export const productionTasks = pgTable(
  'production_tasks',
  {
    id: pk(),
    batchId: uuid('batch_id')
      .notNull()
      .references(() => productionBatches.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    /** "instruction": pedido do professor; "proposed": proposta da IA numa aula sem pedidos. */
    origin: text('origin').notNull(),
    sourceSlides: integer('source_slides').array().notNull(),
    targetSlides: integer('target_slides').array().notNull(),
    targetAssumed: boolean('target_assumed').notNull().default(false),
    /** Texto do pedido como o professor escreveu, ou o motivo da proposta da IA. */
    instruction: text('instruction').notNull(),
    priority: boolean('priority').notNull().default(false),
    /** Um dos tipos de PIECE_TYPES (@gutta/core). */
    pieceType: text('piece_type'),
    title: text('title').notNull(),
    /** Plano da peça (formato ProductionPiecePlan de @gutta/ai), editável pelo admin. */
    plan: jsonb('plan').$type<Record<string, unknown>>(),
    status: productionTaskStatus('status').notNull().default('proposed'),
    /** Peça publicada (Fase 4). */
    moduleId: uuid('module_id').references(() => modules.id, { onDelete: 'set null' }),
    decidedBy: text('decided_by').references(() => authUsers.id, { onDelete: 'set null' }),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('production_tasks_batch_position_uq').on(t.batchId, t.position)],
);
