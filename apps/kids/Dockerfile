# Imagem do Cognuss Kids (ADR 0022). Build a partir da RAIZ do repositório:
#   docker build -f apps/kids/Dockerfile -t gutta-kids .

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN --mount=type=secret,id=ca,required=false \
    if [ -f /run/secrets/ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca npm_config_cafile=/run/secrets/ca; fi; \
    npm install -g pnpm@10.28.0 --silent
WORKDIR /repo

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc* ./
COPY apps/web/package.json apps/web/
COPY apps/kids/package.json apps/kids/
COPY apps/worker/package.json apps/worker/
COPY packages/ai/package.json packages/ai/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/db-kids/package.json packages/db-kids/
COPY packages/contracts/package.json packages/contracts/
COPY packages/jobs/package.json packages/jobs/
COPY packages/storage/package.json packages/storage/
COPY packages/ui/package.json packages/ui/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store --mount=type=secret,id=ca,required=false \
    if [ -f /run/secrets/ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca npm_config_cafile=/run/secrets/ca; fi; \
    pnpm install --frozen-lockfile

FROM deps AS build
ENV NEXT_OUTPUT_STANDALONE=1
COPY tsconfig.base.json ./
COPY packages packages
COPY apps/kids apps/kids
RUN pnpm --filter @gutta/db-kids build:migrate && pnpm --filter @gutta/kids build

FROM node:22-alpine AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3100 HOSTNAME=0.0.0.0 \
    MIGRATIONS_DIR=/app/migrations
WORKDIR /app
RUN addgroup -S -g 1001 kids && adduser -S -u 1001 -G kids kids
COPY --from=build --chown=kids:kids /repo/apps/kids/.next/standalone ./
COPY --from=build --chown=kids:kids /repo/apps/kids/.next/static ./apps/kids/.next/static
COPY --from=build --chown=kids:kids /repo/apps/kids/public ./apps/kids/public
COPY --from=build --chown=kids:kids /repo/packages/db-kids/migrations ./migrations
COPY --from=build --chown=kids:kids /repo/packages/db-kids/dist/migrate.mjs ./migrate.mjs
COPY --chown=kids:kids apps/kids/docker-entrypoint.sh ./docker-entrypoint.sh
USER kids
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3100/api/health >/dev/null || exit 1
ENTRYPOINT ["/bin/sh", "./docker-entrypoint.sh"]
