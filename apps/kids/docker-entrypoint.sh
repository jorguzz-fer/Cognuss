#!/bin/sh
set -e
# Migrations do Kids primeiro (como kids_owner); o servidor só sobe se elas passarem.
if [ "${SKIP_MIGRATIONS:-0}" != "1" ]; then
  node ./migrate.mjs
fi
exec node apps/kids/server.js
