// URLs do banco de teste do Kids. Na CI vêm do serviço Postgres do job; localmente, dos defaults.
export const TEST_OWNER_URL =
  process.env.KIDS_TEST_DATABASE_OWNER_URL ??
  'postgres://kids_owner:kids_owner_dev@localhost:5432/cognuss_kids_test';
export const TEST_APP_URL =
  process.env.KIDS_TEST_DATABASE_URL ??
  'postgres://kids_app:kids_app_dev@localhost:5432/cognuss_kids_test';
export const TEST_SUPERUSER_URL =
  process.env.PG_SUPERUSER_URL ?? 'postgres://postgres:postgres@localhost:5432/postgres';
