# Postgres do Cognuss Kids (ADR 0022): servidor próprio, separado do Cognuss. O script de
# papéis vai dentro da imagem: montado como volume, chegaria vazio no Coolify (mesmo motivo de
# infra/postgres/Dockerfile).
FROM postgres:16-alpine
COPY --chmod=755 kids-roles.sh /usr/local/bin/kids-roles.sh
