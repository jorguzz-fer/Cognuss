import { defineConfig } from 'drizzle-kit';

// Banco do Cognuss Kids (ADR 0022), separado do banco do Cognuss.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './migrations',
  dbCredentials: { url: process.env.KIDS_DATABASE_OWNER_URL ?? '' },
  strict: true,
});
