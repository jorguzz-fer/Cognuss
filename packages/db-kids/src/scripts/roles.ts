import pg from 'pg';

// Cria (ou atualiza) os papéis kids_owner e kids_app e o banco do Kids (ADR 0022).
// Precisa de um superusuário do Postgres. Mesma lógica de infra/postgres/kids-roles.sql,
// usada no ambiente local, na CI e no passo db-kids-roles do compose.
export async function ensureRolesAndDatabase(opts: {
  superuserUrl: string;
  dbName: string;
  ownerPassword: string;
  appPassword: string;
}) {
  const client = new pg.Client({ connectionString: opts.superuserUrl });
  await client.connect();
  const lit = (s: string) => client.escapeLiteral(s);
  const id = (s: string) => client.escapeIdentifier(s);
  try {
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'kids_owner') THEN
          CREATE ROLE kids_owner LOGIN BYPASSRLS;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'kids_app') THEN
          CREATE ROLE kids_app LOGIN NOBYPASSRLS;
        END IF;
      END $$;`);
    await client.query(
      `ALTER ROLE kids_owner WITH LOGIN BYPASSRLS PASSWORD ${lit(opts.ownerPassword)}`,
    );
    await client.query(
      `ALTER ROLE kids_app WITH LOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD ${lit(opts.appPassword)}`,
    );
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      opts.dbName,
    ]);
    if (exists.rowCount === 0) {
      await client.query(`CREATE DATABASE ${id(opts.dbName)} OWNER kids_owner`);
    }
    // Só os papéis do Kids conectam ao banco do Kids (os dados de crianças ficam separados).
    await client.query(`REVOKE CONNECT ON DATABASE ${id(opts.dbName)} FROM PUBLIC`);
    await client.query(`GRANT CONNECT ON DATABASE ${id(opts.dbName)} TO kids_owner, kids_app`);
  } finally {
    await client.end();
  }
  const dbUrl = new URL(opts.superuserUrl);
  dbUrl.pathname = `/${opts.dbName}`;
  const c2 = new pg.Client({ connectionString: dbUrl.toString() });
  await c2.connect();
  try {
    await c2.query('ALTER SCHEMA public OWNER TO kids_owner');
    await c2.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
  } finally {
    await c2.end();
  }
}

export function dbNameOf(url: string) {
  return new URL(url).pathname.replace(/^\//, '');
}
export function passwordOf(url: string) {
  return decodeURIComponent(new URL(url).password);
}
