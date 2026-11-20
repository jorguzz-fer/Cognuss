import 'server-only';
import { createDb, createPool, type Db } from '@gutta/db-kids';
import { env } from './env';

// Um pool por processo, no banco do Kids. O globalThis evita pools a mais no HMR.
const g = globalThis as unknown as { __kidsDb?: Db };

export function db(): Db {
  if (!g.__kidsDb) {
    const e = env();
    g.__kidsDb = createDb(createPool(e.KIDS_DATABASE_URL, e.DB_POOL_MAX));
  }
  return g.__kidsDb;
}
