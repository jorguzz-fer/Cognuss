import { existsSync, symlinkSync } from 'node:fs';
import path from 'node:path';
import { createDb, createPool } from '../client';
import { loadEnv, requireEnv } from './env';
import { runMigrations } from './migrate';
import { dbNameOf, ensureRolesAndDatabase, passwordOf } from './roles';
import { runSeed } from './seed';

// pnpm kids:db:setup: papéis, banco, migrations e a escola de demonstração no Postgres local.
async function main() {
  loadEnv();
  const root = path.resolve(import.meta.dirname, '../../../..');
  const link = path.join(root, 'apps/kids/.env');
  if (existsSync(path.join(root, '.env')) && !existsSync(link)) symlinkSync('../../.env', link);
  const ownerUrl = requireEnv('KIDS_DATABASE_OWNER_URL');
  const appUrl = requireEnv('KIDS_DATABASE_URL');
  await ensureRolesAndDatabase({
    superuserUrl:
      process.env.PG_SUPERUSER_URL ?? 'postgres://postgres:postgres@localhost:5432/postgres',
    dbName: dbNameOf(ownerUrl),
    ownerPassword: passwordOf(ownerUrl),
    appPassword: passwordOf(appUrl),
  });
  await runMigrations(ownerUrl);
  console.log('migrations do Kids aplicadas');
  if (process.argv.includes('--no-seed')) return;
  const pool = createPool(ownerUrl, 1);
  try {
    await runSeed(createDb(pool));
  } finally {
    await pool.end();
  }
  console.log('escola de demonstração aplicada');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
