import { sql } from 'drizzle-orm';
import {
  check,
  foreignKey,
  index,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, memberRole, pk, updatedAt } from './_shared';
import { authUsers } from './auth';
import { grades, tenants } from './tenancy';

const tenantRef = () =>
  uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' });
const userRef = (name: string) =>
  text(name)
    .notNull()
    .references(() => authUsers.id, { onDelete: 'cascade' });

// Matérias da instituição (EST-06). A lista BNCC sugerida é só um ponto de partida.
export const subjects = pgTable(
  'subjects',
  {
    id: pk(),
    tenantId: tenantRef(),
    name: text('name').notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('subjects_tenant_id_key').on(t.tenantId, t.id),
    uniqueIndex('subjects_tenant_name_key').on(t.tenantId, sql`lower(${t.name})`),
    check('subjects_name_length', sql`char_length(${t.name}) BETWEEN 2 AND 60`),
  ],
);

// Turmas (EST-05). O código de entrada é único na plataforma inteira: ele faz parte do login
// do aluno sem e-mail ("<código>.<apelido>", K-D07).
export const classes = pgTable(
  'classes',
  {
    id: pk(),
    tenantId: tenantRef(),
    gradeId: uuid('grade_id').notNull(),
    name: text('name').notNull(),
    schoolYear: smallint('school_year').notNull(),
    joinCode: text('join_code').notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('classes_tenant_id_key').on(t.tenantId, t.id),
    // FKs compostas: o banco impede apontar para dado de outra instituição (ADR 0022).
    foreignKey({
      name: 'classes_grade_fk',
      columns: [t.tenantId, t.gradeId],
      foreignColumns: [grades.tenantId, grades.id],
    }).onDelete('cascade'),
    uniqueIndex('classes_join_code_key').on(t.joinCode),
    uniqueIndex('classes_tenant_grade_year_name_key').on(
      t.tenantId,
      t.gradeId,
      t.schoolYear,
      sql`lower(${t.name})`,
    ),
    index('classes_tenant_grade_idx').on(t.tenantId, t.gradeId),
    check('classes_join_code_format', sql`${t.joinCode} ~ '^[a-z0-9]{6}$'`),
    check('classes_school_year_range', sql`${t.schoolYear} BETWEEN 2020 AND 2100`),
    check('classes_name_length', sql`char_length(${t.name}) BETWEEN 1 AND 40`),
  ],
);

// Aluno na turma. left_at preenchido = saiu (o histórico fica).
export const classMembers = pgTable(
  'class_members',
  {
    id: pk(),
    tenantId: tenantRef(),
    classId: uuid('class_id').notNull(),
    userId: userRef('user_id'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    leftAt: timestamp('left_at', { withTimezone: true }),
  },
  (t) => [
    foreignKey({
      name: 'class_members_class_fk',
      columns: [t.tenantId, t.classId],
      foreignColumns: [classes.tenantId, classes.id],
    }).onDelete('cascade'),
    uniqueIndex('class_members_class_user_key').on(t.classId, t.userId),
    index('class_members_tenant_user_idx').on(t.tenantId, t.userId),
  ],
);

// Professor ligado a turma × matéria (USR-04): define o que ele edita e vê.
export const teacherAssignments = pgTable(
  'teacher_assignments',
  {
    id: pk(),
    tenantId: tenantRef(),
    classId: uuid('class_id').notNull(),
    subjectId: uuid('subject_id').notNull(),
    userId: userRef('user_id'),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: 'teacher_assignments_class_fk',
      columns: [t.tenantId, t.classId],
      foreignColumns: [classes.tenantId, classes.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'teacher_assignments_subject_fk',
      columns: [t.tenantId, t.subjectId],
      foreignColumns: [subjects.tenantId, subjects.id],
    }).onDelete('cascade'),
    uniqueIndex('teacher_assignments_class_subject_user_key').on(t.classId, t.subjectId, t.userId),
    index('teacher_assignments_tenant_user_idx').on(t.tenantId, t.userId),
  ],
);

// Convites de gestor e professor (USR-01, INS-03). Só o hash do token fica no banco; o
// aceite passa por funções SECURITY DEFINER, sem expor a tabela a quem não está logado.
export const invitations = pgTable(
  'invitations',
  {
    id: pk(),
    tenantId: tenantRef(),
    email: text('email').notNull(),
    role: memberRole('role').notNull(),
    tokenHash: text('token_hash').notNull(),
    invitedBy: text('invited_by').references(() => authUsers.id, { onDelete: 'set null' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    acceptedBy: text('accepted_by').references(() => authUsers.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('invitations_token_hash_key').on(t.tokenHash),
    index('invitations_tenant_idx').on(t.tenantId, t.createdAt),
    check('invitations_role_staff', sql`${t.role} IN ('manager', 'teacher')`),
    check('invitations_email_lower', sql`${t.email} = lower(${t.email})`),
  ],
);
