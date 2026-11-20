import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  index,
  pgTable,
  smallint,
  text,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  createdAt,
  memberRole,
  membershipStatus,
  pk,
  schoolStage,
  tenantKind,
  tenantStatus,
  updatedAt,
} from './_shared';
import { authUsers } from './auth';

// Instituição de ensino: a raiz do isolamento (ADR 0022). Não tem tenant_id; o RLS usa o id.
export const tenants = pgTable(
  'tenants',
  {
    id: pk(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    cnpj: text('cnpj'),
    city: text('city').notNull(),
    state: text('state').notNull(),
    kind: tenantKind('kind').notNull(),
    status: tenantStatus('status').notNull().default('active'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('tenants_slug_key').on(t.slug),
    check('tenants_slug_format', sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check('tenants_state_format', sql`${t.state} ~ '^[A-Z]{2}$'`),
  ],
);

const tenantRef = () =>
  uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' });

// Etapas que a instituição oferece (EST-01).
export const tenantStages = pgTable(
  'tenant_stages',
  {
    id: pk(),
    tenantId: tenantRef(),
    stage: schoolStage('stage').notNull(),
    active: boolean('active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  // Constraint (não só índice): é alvo da FK composta de grades.
  (t) => [unique('tenant_stages_tenant_stage_key').on(t.tenantId, t.stage)],
);

// Anos e séries ativados (EST-02). O rótulo ("3º ano", "1ª série") é calculado, não guardado.
export const grades = pgTable(
  'grades',
  {
    id: pk(),
    tenantId: tenantRef(),
    stage: schoolStage('stage').notNull(),
    number: smallint('number').notNull(),
    active: boolean('active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('grades_tenant_stage_number_key').on(t.tenantId, t.stage, t.number),
    // O ano só existe se a etapa dele estiver cadastrada na mesma instituição.
    foreignKey({
      name: 'grades_tenant_stage_fk',
      columns: [t.tenantId, t.stage],
      foreignColumns: [tenantStages.tenantId, tenantStages.stage],
    }).onDelete('cascade'),
    check(
      'grades_number_range',
      sql`(${t.stage} = 'fundamental' AND ${t.number} BETWEEN 1 AND 9) OR (${t.stage} = 'medio' AND ${t.number} BETWEEN 1 AND 3)`,
    ),
  ],
);

// Super Admin da plataforma (SPEC Kids, seção 3). Sem tenant_id. Só o dono do banco escreve
// (bootstrap); a aplicação lê a própria linha.
export const platformAdmins = pgTable('platform_admins', {
  userId: text('user_id')
    .primaryKey()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  grantedBy: text('granted_by'),
  createdAt: createdAt(),
});

// Vínculo usuário × instituição × papel (Blueprint §7). Uma pessoa pode ser professora em
// duas escolas e escolhe a instituição ativa depois do login.
export const memberships = pgTable(
  'memberships',
  {
    id: pk(),
    tenantId: tenantRef(),
    userId: text('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    role: memberRole('role').notNull(),
    status: membershipStatus('status').notNull().default('active'),
    invitedBy: text('invited_by').references(() => authUsers.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('memberships_tenant_user_role_key').on(t.tenantId, t.userId, t.role),
    index('memberships_user_idx').on(t.userId),
  ],
);
