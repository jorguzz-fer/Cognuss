# ADR 0022: Cognuss Kids, app próprio e banco multi-inquilino

- Status: aceito (banco separado confirmado pelo Fernando em 20/11/2026, K-D08 na SPEC)
- Data: 2026-11-20

## Contexto

O Cognuss Kids (`docs/spec/SPEC_Cognuss_Kids_v1.md`) é uma plataforma multi-instituição para o Ensino Fundamental e o Ensino Médio. Cada escola ativa os anos que oferece, monta planos de estudo e acompanha os alunos.

A plataforma atual (Medicina) isola os dados **por aluno**: `withUser` e `app.user_id` (ADR 0003). Ela não tem o conceito de inquilino: `institutions` é só um catálogo. Os papéis são globais (`role_assignments`).

O Kids precisa de:
- isolamento **por instituição**;
- papéis por instituição;
- dados de **crianças**, com consentimento do responsável (LGPD art. 14).

O Engineering Blueprint (§7) prescreve, quando há multi-inquilino: banco compartilhado, schema compartilhado, `tenant_id` e RLS, `SET LOCAL` do inquilino por transação, `memberships`, o inquilino presente em cache, armazenamento, registros e filas, e um teste de isolamento.

## Opções consideradas

1. **Pôr `tenant_id` no banco atual do Cognuss e servir o Kids pelo `apps/web`.**
   - Prós: um app e um banco só.
   - Contras:
     - mexe nas 54 migrations e nas políticas de uma plataforma em uso;
     - mistura dados de crianças com os de universitários;
     - os papéis globais conflitam com os papéis por escola;
     - qualquer erro de política afeta os dois produtos.
2. **Repositório novo.**
   - Prós: isolamento total.
   - Contras: duplica autenticação, RLS, LGPD, armazenamento, fila, CI e design system, e as correções deixam de valer para os dois.
3. **Mesmo monorepo, app novo (`apps/kids`) e pacote de banco novo (`packages/db-kids`), num banco próprio (`cognuss_kids`) no mesmo Postgres. Dentro dele, o padrão do Blueprint §7: `tenant_id` e RLS.**

## Decisão

Opção 3.

- **App:** `apps/kids` (Next.js 16), com rotas `/api/v1/kids` e contrato OpenAPI gerado dos esquemas Zod (ADR 0019).
- **Banco:** `cognuss_kids`, num **Postgres próprio do Kids** (atualizado em 23/11/2026: antes era um banco no mesmo container `db` do Cognuss). Papéis `kids_owner` (dono, roda migrations) e `kids_app` (sem BYPASSRLS, sem ser dono). O `gutta_app` não tem acesso ao `cognuss_kids`, e o `kids_app` não tem acesso ao banco do Cognuss.
- **Isolamento:**
  - Toda tabela de domínio tem `tenant_id`, com `ENABLE` e `FORCE ROW LEVEL SECURITY`.
  - `withTenantUser(tenantId, userId, tx => …)` executa `set_config('app.tenant_id', …, true)` e `set_config('app.user_id', …, true)`.
  - As políticas combinam `tenant_id = app_tenant_id()` com o papel em `memberships`.
  - Fora do contexto, nada é devolvido.
  - O tenant ativo vem da sessão e é validado contra `memberships`, nunca do corpo da requisição.
- **Super Admin:** fica em `platform_admins`. Entra num inquilino só por `withPlatformAdmin(tenantId, reason, …)`, que registra o motivo em `audit_logs`.
- **O inquilino em todas as camadas:**
  - chaves de cache `t:{tenant}:…`;
  - armazenamento `t/{tenant}/…`;
  - `tenant_id` nos registros;
  - `tenant_id` no conteúdo dos trabalhos da fila.
- **Reaproveitamento:** `packages/core` (SRS e regras novas de nota e recuperação), `contracts`, `storage`, `jobs`, `apps/worker`, a configuração do Better Auth com Argon2id e 2FA (ADR 0002) e o desenho de LGPD do ADR 0009. A UX e a UI são as do Cognuss (ADRs 0007 e 0010, `docs/ux.md`): tokens, fontes e componentes saem de `apps/web` para um pacote compartilhado `packages/ui`, usado pelos dois apps. O trigger editorial e as funções de RLS são copiados para `packages/db-kids`, adaptados ao inquilino.
- **Deploy:** recurso próprio no Coolify (`infra/kids/compose.yml`: `kids`, `db` e `db-roles`), com deploy, Watch Paths e backup separados do Cognuss. O `kids` aplica as migrations como `kids_owner` no start. Decidido em 23/11/2026, para um deploy do Kids não reiniciar o Cognuss.

## Consequências

- Os dados de crianças ficam num banco separado. O Cognuss (Medicina) não muda.
- O teste "o inquilino A nunca lê nem escreve no inquilino B" é obrigatório na CI para toda tabela do Kids.
- Há duas cópias do trigger editorial e das funções de RLS. Se a lógica divergir demais, extrair um gerador de SQL compartilhado.
- Com Postgres próprio, o Kids não divide ponto de falha de banco com o Cognuss, mas são dois servidores de banco para atualizar e dois backups para conferir.
- Seguem para decisão: o contrato com as escolas (controladora × operadora) e o parecer sobre o art. 14 (D-K01 na SPEC).
