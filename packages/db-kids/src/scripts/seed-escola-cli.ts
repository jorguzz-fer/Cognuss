import { createDb, createPool } from '../client';
import { formatSchoolSeed, seedSchool } from './seed-escola';

// Entrada empacotada (esbuild) para rodar no container do Kids, pelo terminal do Coolify:
//   node seed/seed-escola.mjs
// Opcional: SEED_NOME, SEED_SLUG e SEED_DOMINIO (domínio dos e-mails de exemplo).
async function main() {
  const url = process.env.KIDS_DATABASE_OWNER_URL;
  if (!url) throw new Error('KIDS_DATABASE_OWNER_URL não definida');
  const pool = createPool(url, 1);
  try {
    const result = await seedSchool(createDb(pool), {
      name: process.env.SEED_NOME || undefined,
      slug: process.env.SEED_SLUG || undefined,
      emailDomain: process.env.SEED_DOMINIO || undefined,
      appUrl: process.env.APP_URL,
    });
    console.log(formatSchoolSeed(result));
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(`Falhou, nada foi gravado: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
