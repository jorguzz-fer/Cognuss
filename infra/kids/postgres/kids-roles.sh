#!/bin/sh
# Papéis e banco do Cognuss Kids (ADR 0022), no Postgres próprio do Kids. Idempotente: roda a
# cada deploy pelo serviço db-roles de infra/kids/compose.yml, antes das migrations. Vale para
# um volume novo e para um que já existe (o init do Postgres só roda na criação do volume), e
# é também como uma senha trocada no Coolify chega ao banco.
# Mesma lógica de packages/db-kids/src/scripts/roles.ts.
set -eu
: "${KIDS_DB:=cognuss_kids}"
: "${KIDS_OWNER_PASSWORD:?defina KIDS_OWNER_PASSWORD}"
: "${KIDS_APP_PASSWORD:?defina KIDS_APP_PASSWORD}"
: "${PGHOST:=db}"
export PGHOST

psql -v ON_ERROR_STOP=1 --username postgres --dbname postgres \
  -v owner_pw="$KIDS_OWNER_PASSWORD" -v app_pw="$KIDS_APP_PASSWORD" -v db="$KIDS_DB" <<'SQL'
SELECT 'CREATE ROLE kids_owner LOGIN BYPASSRLS'
  WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'kids_owner') \gexec
SELECT 'CREATE ROLE kids_app LOGIN NOBYPASSRLS'
  WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'kids_app') \gexec
ALTER ROLE kids_owner WITH LOGIN BYPASSRLS PASSWORD :'owner_pw';
ALTER ROLE kids_app WITH LOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'app_pw';
SELECT format('CREATE DATABASE %I OWNER kids_owner', :'db')
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'db') \gexec
SELECT format('REVOKE CONNECT ON DATABASE %I FROM PUBLIC', :'db') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO kids_owner, kids_app', :'db') \gexec
SQL

psql -v ON_ERROR_STOP=1 --username postgres --dbname "$KIDS_DB" <<'SQL'
ALTER SCHEMA public OWNER TO kids_owner;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
SQL
echo "papéis e banco do Kids prontos"
