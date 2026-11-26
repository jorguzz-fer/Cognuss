import { sql } from 'drizzle-orm';
import {
  check,
  doublePrecision,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, pk, updatedAt } from './_shared';
import { authUsers } from './auth';
import { subjects } from './school';
import { grades, tenants } from './tenancy';

// Fase 2 da SPEC Kids: plano de estudos (PLA), conteúdo e flashcards (CON), progresso (PAI-01).

export const planStatus = pgEnum('plan_status', [
  'draft',
  'in_review',
  'approved',
  'published',
  'archived',
]);

// Tipos de conteúdo do tópico (CON-01). Imagem enviada pela escola entra com o armazenamento.
export const contentKind = pgEnum('content_kind', ['text', 'video', 'table', 'timeline']);

const tenantRef = () =>
  uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' });
const userRef = (name: string) =>
  text(name)
    .notNull()
    .references(() => authUsers.id, { onDelete: 'cascade' });

/**
 * Plano de estudos de um ano/série e uma matéria (PLA-01). Versões: root_id agrupa as versões
 * do mesmo plano; editar um plano publicado cria uma versão nova em rascunho (PLA-05).
 */
export const studyPlans = pgTable(
  'study_plans',
  {
    id: pk(),
    tenantId: tenantRef(),
    gradeId: uuid('grade_id').notNull(),
    subjectId: uuid('subject_id').notNull(),
    schoolYear: smallint('school_year').notNull(),
    title: text('title').notNull(),
    periodLabel: text('period_label'),
    helperTipsMd: text('helper_tips_md'),
    status: planStatus('status').notNull().default('draft'),
    rootId: uuid('root_id').notNull(),
    version: integer('version').notNull().default(1),
    authorId: text('author_id').references(() => authUsers.id, { onDelete: 'set null' }),
    reviewerId: text('reviewer_id').references(() => authUsers.id, { onDelete: 'set null' }),
    reviewNote: text('review_note'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('study_plans_tenant_id_key').on(t.tenantId, t.id),
    foreignKey({
      name: 'study_plans_grade_fk',
      columns: [t.tenantId, t.gradeId],
      foreignColumns: [grades.tenantId, grades.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'study_plans_subject_fk',
      columns: [t.tenantId, t.subjectId],
      foreignColumns: [subjects.tenantId, subjects.id],
    }).onDelete('cascade'),
    uniqueIndex('study_plans_root_version_key').on(t.rootId, t.version),
    index('study_plans_tenant_grade_subject_idx').on(t.tenantId, t.gradeId, t.subjectId),
    check('study_plans_title_length', sql`char_length(${t.title}) BETWEEN 3 AND 120`),
  ],
);

// Tópicos do plano (PLA-02, PLA-03): árvore, ordem e "dia N" do cronograma.
export const planTopics = pgTable(
  'plan_topics',
  {
    id: pk(),
    tenantId: tenantRef(),
    planId: uuid('plan_id').notNull(),
    parentId: uuid('parent_id'),
    title: text('title').notNull(),
    summary: text('summary'),
    orderIndex: integer('order_index').notNull().default(0),
    dayNumber: smallint('day_number'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('plan_topics_tenant_id_key').on(t.tenantId, t.id),
    foreignKey({
      name: 'plan_topics_plan_fk',
      columns: [t.tenantId, t.planId],
      foreignColumns: [studyPlans.tenantId, studyPlans.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'plan_topics_parent_fk',
      columns: [t.parentId],
      foreignColumns: [t.id],
    }).onDelete('cascade'),
    index('plan_topics_plan_order_idx').on(t.planId, t.orderIndex),
    check('plan_topics_day_range', sql`${t.dayNumber} IS NULL OR ${t.dayNumber} BETWEEN 1 AND 366`),
  ],
);

/**
 * Conteúdo do tópico (CON-01). text: Markdown seguro; video: link; table: {columns, rows};
 * timeline: {steps}. O jsonb só guarda a forma da tabela e da linha do tempo.
 */
export const topicContents = pgTable(
  'topic_contents',
  {
    id: pk(),
    tenantId: tenantRef(),
    topicId: uuid('topic_id').notNull(),
    kind: contentKind('kind').notNull(),
    title: text('title'),
    bodyMd: text('body_md'),
    url: text('url'),
    data: jsonb('data').$type<{ columns?: string[]; rows?: string[][]; steps?: string[] }>(),
    orderIndex: integer('order_index').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({
      name: 'topic_contents_topic_fk',
      columns: [t.tenantId, t.topicId],
      foreignColumns: [planTopics.tenantId, planTopics.id],
    }).onDelete('cascade'),
    index('topic_contents_topic_order_idx').on(t.topicId, t.orderIndex),
    check(
      'topic_contents_shape',
      sql`(${t.kind} = 'text' AND ${t.bodyMd} IS NOT NULL)
        OR (${t.kind} = 'video' AND ${t.url} ~ '^https://')
        OR (${t.kind} IN ('table', 'timeline') AND ${t.data} IS NOT NULL)`,
    ),
  ],
);

// Flashcards do tópico (CON-03).
export const flashcards = pgTable(
  'flashcards',
  {
    id: pk(),
    tenantId: tenantRef(),
    topicId: uuid('topic_id').notNull(),
    front: text('front').notNull(),
    back: text('back').notNull(),
    orderIndex: integer('order_index').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('flashcards_tenant_id_key').on(t.tenantId, t.id),
    foreignKey({
      name: 'flashcards_topic_fk',
      columns: [t.tenantId, t.topicId],
      foreignColumns: [planTopics.tenantId, planTopics.id],
    }).onDelete('cascade'),
    index('flashcards_topic_idx').on(t.topicId, t.orderIndex),
    check(
      'flashcards_text_length',
      sql`char_length(${t.front}) BETWEEN 1 AND 300 AND char_length(${t.back}) BETWEEN 1 AND 600`,
    ),
  ],
);

// Revisão espaçada do aluno (packages/core/srs). Uma linha por aluno e cartão.
export const flashcardSchedules = pgTable(
  'flashcard_schedules',
  {
    id: pk(),
    tenantId: tenantRef(),
    flashcardId: uuid('flashcard_id').notNull(),
    userId: userRef('user_id'),
    repetitions: integer('repetitions').notNull().default(0),
    intervalDays: integer('interval_days').notNull().default(0),
    ease: doublePrecision('ease').notNull().default(2.5),
    lapses: integer('lapses').notNull().default(0),
    dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
    lastReviewedAt: timestamp('last_reviewed_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({
      name: 'flashcard_schedules_card_fk',
      columns: [t.tenantId, t.flashcardId],
      foreignColumns: [flashcards.tenantId, flashcards.id],
    }).onDelete('cascade'),
    uniqueIndex('flashcard_schedules_card_user_key').on(t.flashcardId, t.userId),
    index('flashcard_schedules_user_due_idx').on(t.tenantId, t.userId, t.dueAt),
  ],
);

// Tópico estudado (PAI-01). Marcar de novo não duplica.
export const topicProgress = pgTable(
  'topic_progress',
  {
    id: pk(),
    tenantId: tenantRef(),
    topicId: uuid('topic_id').notNull(),
    userId: userRef('user_id'),
    completedAt: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      name: 'topic_progress_topic_fk',
      columns: [t.tenantId, t.topicId],
      foreignColumns: [planTopics.tenantId, planTopics.id],
    }).onDelete('cascade'),
    uniqueIndex('topic_progress_topic_user_key').on(t.topicId, t.userId),
    index('topic_progress_user_idx').on(t.tenantId, t.userId),
  ],
);
