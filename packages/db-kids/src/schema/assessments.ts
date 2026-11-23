import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
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
import { planTopics, studyPlans } from './plans';
import { tenants } from './tenancy';

// Fase 3 da SPEC Kids: questões, simulado, prova e recuperação (AVA). Como no piloto, cada
// conceito pode existir em formatos diferentes (mesmo group_id), e a recuperação troca o
// formato da questão errada (AVA-05). O gabarito (answer) nunca vai ao navegador (AVA-02):
// o aluno não lê esta tabela; vê as questões só pelas funções attempt_* do banco.

export const questionKind = pgEnum('question_kind', [
  'multiple_choice',
  'true_false',
  'short_answer',
]);
export const assessmentKind = pgEnum('assessment_kind', ['practice', 'exam']);

const tenantRef = () =>
  uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' });

export type QuestionAnswer =
  { correct: number } | { value: boolean } | { groups: string[][]; min: number };

export const questions = pgTable(
  'questions',
  {
    id: pk(),
    tenantId: tenantRef(),
    topicId: uuid('topic_id').notNull(),
    groupId: uuid('group_id').notNull(),
    kind: questionKind('kind').notNull(),
    stem: text('stem').notNull(),
    options: jsonb('options').$type<string[]>(),
    answer: jsonb('answer').$type<QuestionAnswer>().notNull(),
    modelAnswer: text('model_answer'),
    explanation: text('explanation'),
    orderIndex: integer('order_index').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('questions_tenant_id_key').on(t.tenantId, t.id),
    foreignKey({
      name: 'questions_topic_fk',
      columns: [t.tenantId, t.topicId],
      foreignColumns: [planTopics.tenantId, planTopics.id],
    }).onDelete('cascade'),
    uniqueIndex('questions_group_kind_key').on(t.groupId, t.kind),
    index('questions_topic_idx').on(t.topicId, t.orderIndex),
    check('questions_stem_length', sql`char_length(${t.stem}) BETWEEN 3 AND 500`),
    check(
      'questions_shape',
      sql`(${t.kind} = 'multiple_choice' AND jsonb_array_length(${t.options}) BETWEEN 2 AND 5
            AND (${t.answer}->>'correct')::int BETWEEN 0 AND jsonb_array_length(${t.options}) - 1)
        OR (${t.kind} = 'true_false' AND ${t.options} IS NULL AND jsonb_typeof(${t.answer}->'value') = 'boolean')
        OR (${t.kind} = 'short_answer' AND ${t.options} IS NULL
            AND jsonb_array_length(${t.answer}->'groups') >= 1
            AND (${t.answer}->>'min')::int BETWEEN 1 AND jsonb_array_length(${t.answer}->'groups'))`,
    ),
  ],
);

/** Simulado (treino, sem nota oficial) ou prova (nota mínima e recuperação). AVA-03, AVA-04. */
export const assessments = pgTable(
  'assessments',
  {
    id: pk(),
    tenantId: tenantRef(),
    planId: uuid('plan_id').notNull(),
    kind: assessmentKind('kind').notNull(),
    title: text('title').notNull(),
    questionCount: smallint('question_count').notNull().default(10),
    passingScore: numeric('passing_score', { precision: 3, scale: 1 }).notNull().default('8.0'),
    maxAttempts: smallint('max_attempts'),
    maxRetakes: smallint('max_retakes').notNull().default(2),
    opensAt: timestamp('opens_at', { withTimezone: true }),
    closesAt: timestamp('closes_at', { withTimezone: true }),
    createdBy: text('created_by').references(() => authUsers.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('assessments_tenant_id_key').on(t.tenantId, t.id),
    foreignKey({
      name: 'assessments_plan_fk',
      columns: [t.tenantId, t.planId],
      foreignColumns: [studyPlans.tenantId, studyPlans.id],
    }).onDelete('cascade'),
    index('assessments_plan_idx').on(t.planId),
    check('assessments_count_range', sql`${t.questionCount} BETWEEN 1 AND 40`),
    check('assessments_passing_range', sql`${t.passingScore} BETWEEN 0 AND 10`),
    check(
      'assessments_attempts_range',
      sql`${t.maxAttempts} IS NULL OR ${t.maxAttempts} BETWEEN 1 AND 10`,
    ),
    check('assessments_retakes_range', sql`${t.maxRetakes} BETWEEN 0 AND 5`),
    check(
      'assessments_window',
      sql`${t.opensAt} IS NULL OR ${t.closesAt} IS NULL OR ${t.opensAt} < ${t.closesAt}`,
    ),
  ],
);

/**
 * Tentativa do aluno (AVA-07: idempotente por client_key). retake_of aponta para a tentativa
 * reprovada que gerou a recuperação. Só as funções attempt_* do banco gravam aqui.
 */
export const assessmentAttempts = pgTable(
  'assessment_attempts',
  {
    id: pk(),
    tenantId: tenantRef(),
    assessmentId: uuid('assessment_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    clientKey: text('client_key').notNull(),
    retakeOf: uuid('retake_of'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    correctCount: smallint('correct_count'),
    total: smallint('total').notNull(),
    score: numeric('score', { precision: 3, scale: 1 }),
    passed: boolean('passed'),
  },
  (t) => [
    unique('assessment_attempts_tenant_id_key').on(t.tenantId, t.id),
    foreignKey({
      name: 'assessment_attempts_assessment_fk',
      columns: [t.tenantId, t.assessmentId],
      foreignColumns: [assessments.tenantId, assessments.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'assessment_attempts_retake_fk',
      columns: [t.retakeOf],
      foreignColumns: [t.id],
    }).onDelete('cascade'),
    uniqueIndex('assessment_attempts_user_key').on(t.userId, t.clientKey),
    index('assessment_attempts_assessment_user_idx').on(t.assessmentId, t.userId, t.startedAt),
  ],
);

// Questões sorteadas para a tentativa, na ordem, com a resposta do aluno.
export const attemptItems = pgTable(
  'attempt_items',
  {
    id: pk(),
    tenantId: tenantRef(),
    attemptId: uuid('attempt_id').notNull(),
    position: smallint('position').notNull(),
    questionId: uuid('question_id').notNull(),
    answer: jsonb('answer').$type<{ choice?: number; value?: boolean; text?: string }>(),
    answeredAt: timestamp('answered_at', { withTimezone: true }),
    isCorrect: boolean('is_correct'),
  },
  (t) => [
    foreignKey({
      name: 'attempt_items_attempt_fk',
      columns: [t.tenantId, t.attemptId],
      foreignColumns: [assessmentAttempts.tenantId, assessmentAttempts.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'attempt_items_question_fk',
      columns: [t.tenantId, t.questionId],
      foreignColumns: [questions.tenantId, questions.id],
    }).onDelete('cascade'),
    uniqueIndex('attempt_items_attempt_position_key').on(t.attemptId, t.position),
  ],
);
