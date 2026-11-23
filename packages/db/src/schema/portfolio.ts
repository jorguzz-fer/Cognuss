import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
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
import { files } from './files';

// Cognuss Competências, Meus Certificados (docs/competencias/ESPECIFICACAO.md, K1). Dados do
// aluno: só o dono lê e escreve (RLS). Nada entra no currículo sem o aluno conferir.

const ownerRef = () =>
  text('owner_id')
    .notNull()
    .references(() => authUsers.id, { onDelete: 'cascade' });

export const portfolioFolders = pgTable(
  'portfolio_folders',
  {
    id: pk(),
    ownerId: ownerRef(),
    name: text('name').notNull(),
    position: integer('position').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('portfolio_folders_owner_name_uq').on(t.ownerId, sql`lower(${t.name})`),
    check('portfolio_folders_name_chk', sql`char_length(${t.name}) between 1 and 60`),
  ],
);

export const portfolioItemStatus = pgEnum('portfolio_item_status', [
  'reading', // esperando o arquivo ou a leitura com IA
  'to_confirm', // campos propostos (pela IA ou vazios), esperando o aluno conferir
  'confirmed', // conferido pelo aluno: entra na soma de horas e no currículo
]);

export const portfolioItems = pgTable(
  'portfolio_items',
  {
    id: pk(),
    ownerId: ownerRef(),
    folderId: uuid('folder_id').references(() => portfolioFolders.id, { onDelete: 'set null' }),
    /** Comprovante enviado (PDF ou imagem). Null quando o item é só um link. */
    fileId: uuid('file_id').references(() => files.id, { onDelete: 'set null' }),
    status: portfolioItemStatus('status').notNull().default('reading'),
    /** Um dos PORTFOLIO_KINDS (@gutta/core). */
    kind: text('kind').notNull().default('outro'),
    title: text('title').notNull().default(''),
    issuer: text('issuer'),
    role: text('role'),
    startedOn: date('started_on'),
    endedOn: date('ended_on'),
    /** Carga horária em minutos, para somar sem erro de arredondamento. */
    minutes: integer('minutes'),
    /** Nome de quem recebeu, como está no certificado. */
    holderName: text('holder_name'),
    /** Link de verificação, DOI ou página do evento. */
    link: text('link'),
    notes: text('notes'),
    /** envio, linkedin, link (K4). */
    source: text('source').notNull().default('upload'),
    /** O que a IA leu, como veio (para comparar com o que o aluno corrigiu). */
    extracted: jsonb('extracted').$type<Record<string, unknown>>(),
    /** Por que a leitura não aconteceu (sem autorização, desligada, arquivo recusado). */
    readNote: text('read_note'),
    inShortCv: boolean('in_short_cv').notNull().default(true),
    inAcademicCv: boolean('in_academic_cv').notNull().default(true),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('portfolio_items_owner_idx').on(t.ownerId, t.status, t.createdAt),
    index('portfolio_items_file_idx').on(t.fileId),
    check(
      'portfolio_items_minutes_chk',
      sql`${t.minutes} is null or ${t.minutes} between 0 and 120000`,
    ),
    check(
      'portfolio_items_dates_chk',
      sql`${t.endedOn} is null or ${t.startedOn} is null or ${t.endedOn} >= ${t.startedOn}`,
    ),
  ],
);
