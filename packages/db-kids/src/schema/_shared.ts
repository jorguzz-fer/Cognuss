import { pgEnum, timestamp, uuid } from 'drizzle-orm/pg-core';

// Timestamps sempre em UTC (timestamptz). A apresentação usa o fuso da instituição.
export const createdAt = () =>
  timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
export const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
export const pk = () => uuid('id').primaryKey().defaultRandom();

// Papéis dentro de uma instituição (SPEC Kids, seção 3). O Super Admin é da plataforma
// e fica em platform_admins, fora deste enum.
export const memberRole = pgEnum('member_role', ['manager', 'teacher', 'student']);

export const membershipStatus = pgEnum('membership_status', ['invited', 'active', 'removed']);

export const tenantStatus = pgEnum('tenant_status', ['active', 'suspended', 'closed']);

export const tenantKind = pgEnum('tenant_kind', ['public', 'private']);

// Etapas da educação básica: Fundamental do 1º ao 9º ano, Médio da 1ª à 3ª série (K-D01).
export const schoolStage = pgEnum('school_stage', ['fundamental', 'medio']);
