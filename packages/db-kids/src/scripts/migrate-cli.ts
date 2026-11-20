import path from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDb, createPool } from '../client';
import { bootstrapPlatformAdmins, parseEmails } from './bootstrap';

// Entrada empacotada (esbuild) que roda no start do container do Kids, antes do servidor.
async function main() {
  const url = process.env.KIDS_DATABASE_OWNER_URL;
  if (!url) throw new Error('KIDS_DATABASE_OWNER_URL não definida');
  const folder = process.env.MIGRATIONS_DIR ?? path.resolve(process.cwd(), 'migrations');
  const pool = createPool(url, 1);
  try {
    const db = createDb(pool);
    await migrate(db, { migrationsFolder: folder });
    console.log(
      JSON.stringify({ level: 'info', event: 'kids_db.migrated', at: new Date().toISOString() }),
    );
    const boot = await bootstrapPlatformAdmins(
      db,
      parseEmails(process.env.KIDS_BOOTSTRAP_ADMIN_EMAILS),
    );
    if (boot.granted.length) {
      console.log(JSON.stringify({ level: 'info', event: 'kids_db.bootstrap_admins', ...boot }));
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(
    JSON.stringify({ level: 'error', event: 'kids_db.migrate_failed', err: String(err) }),
  );
  process.exit(1);
});
