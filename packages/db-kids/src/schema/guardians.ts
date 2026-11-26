import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, pk } from './_shared';
import { authUsers } from './auth';
import { tenants } from './tenancy';

// Responsável e consentimento (SPEC Kids, RES; LGPD art. 14; K-D10). Na v1 o responsável não
// tem login (D-K04): ele entra por um link com token, e tudo passa por funções SECURITY DEFINER.

export const consentPurpose = pgEnum('consent_purpose', ['platform']);
export const consentSource = pgEnum('consent_source', ['online', 'paper']);
export const guardianRequestKind = pgEnum('guardian_request_kind', [
  'access',
  'correction',
  'export',
  'deletion',
]);
export const guardianRequestStatus = pgEnum('guardian_request_status', ['open', 'done']);

const tenantRef = () =>
  uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' });

export const guardians = pgTable(
  'guardians',
  {
    id: pk(),
    tenantId: tenantRef(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique('guardians_tenant_id_key').on(t.tenantId, t.id),
    uniqueIndex('guardians_tenant_email_key').on(t.tenantId, t.email),
    check('guardians_email_lower', sql`${t.email} = lower(${t.email})`),
  ],
);

// Responsável ↔ aluno (RES-01).
export const guardianLinks = pgTable(
  'guardian_links',
  {
    id: pk(),
    tenantId: tenantRef(),
    guardianId: uuid('guardian_id').notNull(),
    studentUserId: text('student_user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: 'guardian_links_guardian_fk',
      columns: [t.tenantId, t.guardianId],
      foreignColumns: [guardians.tenantId, guardians.id],
    }).onDelete('cascade'),
    uniqueIndex('guardian_links_guardian_student_key').on(t.guardianId, t.studentUserId),
    index('guardian_links_student_idx').on(t.tenantId, t.studentUserId),
  ],
);

// Link do responsável: o e-mail leva o token; o banco guarda só o hash.
export const guardianAccessTokens = pgTable(
  'guardian_access_tokens',
  {
    id: pk(),
    tenantId: tenantRef(),
    guardianId: uuid('guardian_id').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: 'guardian_access_tokens_guardian_fk',
      columns: [t.tenantId, t.guardianId],
      foreignColumns: [guardians.tenantId, guardians.id],
    }).onDelete('cascade'),
    uniqueIndex('guardian_access_tokens_hash_key').on(t.tokenHash),
  ],
);

/**
 * Registro de consentimento (RES-02, RES-04). Imutável: a aplicação só insere. Retirar o
 * consentimento é uma linha nova com granted = false; vale a mais recente.
 */
export const guardianConsents = pgTable(
  'guardian_consents',
  {
    id: pk(),
    tenantId: tenantRef(),
    guardianId: uuid('guardian_id').notNull(),
    studentUserId: text('student_user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    purpose: consentPurpose('purpose').notNull(),
    policyVersion: text('policy_version').notNull(),
    granted: boolean('granted').notNull(),
    source: consentSource('source').notNull(),
    note: text('note'),
    recordedBy: text('recorded_by').references(() => authUsers.id, { onDelete: 'set null' }),
    ipHash: text('ip_hash'),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: 'guardian_consents_guardian_fk',
      columns: [t.tenantId, t.guardianId],
      foreignColumns: [guardians.tenantId, guardians.id],
    }).onDelete('cascade'),
    index('guardian_consents_student_idx').on(t.tenantId, t.studentUserId, t.purpose, t.createdAt),
    check(
      'guardian_consents_paper_by_staff',
      sql`${t.source} = 'online' OR ${t.recordedBy} IS NOT NULL`,
    ),
  ],
);

// Pedidos do titular feitos pelo responsável (RES-05; LGPD art. 18).
export const guardianRequests = pgTable(
  'guardian_requests',
  {
    id: pk(),
    tenantId: tenantRef(),
    guardianId: uuid('guardian_id').notNull(),
    studentUserId: text('student_user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    kind: guardianRequestKind('kind').notNull(),
    details: text('details'),
    status: guardianRequestStatus('status').notNull().default('open'),
    resolvedBy: text('resolved_by').references(() => authUsers.id, { onDelete: 'set null' }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: 'guardian_requests_guardian_fk',
      columns: [t.tenantId, t.guardianId],
      foreignColumns: [guardians.tenantId, guardians.id],
    }).onDelete('cascade'),
    index('guardian_requests_tenant_status_idx').on(t.tenantId, t.status, t.createdAt),
    check(
      'guardian_requests_details_length',
      sql`${t.details} IS NULL OR char_length(${t.details}) <= 2000`,
    ),
  ],
);
