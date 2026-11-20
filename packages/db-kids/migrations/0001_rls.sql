-- Isolamento por instituição (ADR 0022; Engineering Blueprint §7).
-- Requer os papéis kids_owner (dono, BYPASSRLS) e kids_app (aplicação, sem BYPASSRLS),
-- criados por packages/db-kids/src/scripts/roles.ts ou infra/postgres/kids-roles.sh.
-- Toda política combina a instituição do contexto (app.tenant_id) com o papel do usuário
-- (app.user_id) em memberships. Sem contexto, nada aparece: falha fechada.

-- ── Contexto da requisição ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION app_user_id() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.user_id', true), '')
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app_tenant_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.tenant_id', true), '')::uuid
$$;
--> statement-breakpoint

-- SECURITY DEFINER: roda como kids_owner (BYPASSRLS), então consultar memberships dentro
-- de uma política não entra em recursão. Só membro ativo de instituição ativa conta.
CREATE OR REPLACE FUNCTION app_has_tenant_role(r member_role) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships m JOIN tenants t ON t.id = m.tenant_id
    WHERE m.tenant_id = app_tenant_id() AND m.user_id = app_user_id()
      AND m.role = r AND m.status = 'active' AND t.status = 'active'
  )
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app_is_tenant_member() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships m JOIN tenants t ON t.id = m.tenant_id
    WHERE m.tenant_id = app_tenant_id() AND m.user_id = app_user_id()
      AND m.status = 'active' AND t.status = 'active'
  )
$$;
--> statement-breakpoint

-- Para a escolha da instituição ativa: o usuário vê o nome das escolas de que é membro.
CREATE OR REPLACE FUNCTION app_member_of_tenant(t uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.tenant_id = t AND m.user_id = app_user_id() AND m.status = 'active'
  )
$$;
--> statement-breakpoint

-- Super Admin só vale dentro de withPlatformAdmin (app.platform_admin = 'on'), que grava o
-- motivo na auditoria antes. Fora dele, o Super Admin é um usuário comum.
CREATE OR REPLACE FUNCTION app_is_platform_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT current_setting('app.platform_admin', true) = 'on'
    AND EXISTS (SELECT 1 FROM platform_admins WHERE user_id = app_user_id())
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION app_has_tenant_role(member_role) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_is_tenant_member() FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_member_of_tenant(uuid) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_is_platform_admin() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_user_id(), app_tenant_id(), app_is_tenant_member(),
  app_member_of_tenant(uuid), app_is_platform_admin(), app_has_tenant_role(member_role)
  TO kids_app;
--> statement-breakpoint

-- ── Permissões do papel da aplicação ──────────────────────────────────────
GRANT USAGE ON SCHEMA public TO kids_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO kids_app;
--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO kids_app;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO kids_app;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO kids_app;
--> statement-breakpoint
REVOKE ALL ON ALL TABLES IN SCHEMA drizzle FROM kids_app;
--> statement-breakpoint
-- Auditoria imutável; Super Admin só pelo bootstrap (dono do banco).
REVOKE UPDATE, DELETE ON audit_logs FROM kids_app;
--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON platform_admins FROM kids_app;
--> statement-breakpoint

-- ── RLS ligado e forçado em toda tabela de domínio ────────────────────────
-- As tabelas auth_* do Better Auth ficam sem RLS: só o módulo de autenticação as acessa,
-- antes de existir usuário no contexto (mesma regra do ADR 0003).
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE tenant_stages ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE tenant_stages FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE grades FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE platform_admins FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE memberships FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

-- ── tenants ───────────────────────────────────────────────────────────────
-- Membro vê as escolas dele (para escolher a ativa). Só o Super Admin cria, altera e apaga.
CREATE POLICY tenants_member_read ON tenants FOR SELECT
  USING (app_member_of_tenant(id) OR app_is_platform_admin());
--> statement-breakpoint
CREATE POLICY tenants_platform_insert ON tenants FOR INSERT
  WITH CHECK (app_is_platform_admin());
--> statement-breakpoint
CREATE POLICY tenants_platform_update ON tenants FOR UPDATE
  USING (app_is_platform_admin()) WITH CHECK (app_is_platform_admin());
--> statement-breakpoint
CREATE POLICY tenants_platform_delete ON tenants FOR DELETE
  USING (app_is_platform_admin());
--> statement-breakpoint

-- ── tenant_stages e grades ────────────────────────────────────────────────
-- Membros leem a estrutura da instituição ativa; só o gestor dela altera (EST-01, EST-02).
CREATE POLICY tenant_stages_read ON tenant_stages FOR SELECT
  USING (tenant_id = app_tenant_id() AND (app_is_tenant_member() OR app_is_platform_admin()));
--> statement-breakpoint
CREATE POLICY tenant_stages_manager_write ON tenant_stages FOR ALL
  USING (tenant_id = app_tenant_id() AND app_has_tenant_role('manager'))
  WITH CHECK (tenant_id = app_tenant_id() AND app_has_tenant_role('manager'));
--> statement-breakpoint
CREATE POLICY grades_read ON grades FOR SELECT
  USING (tenant_id = app_tenant_id() AND (app_is_tenant_member() OR app_is_platform_admin()));
--> statement-breakpoint
CREATE POLICY grades_manager_write ON grades FOR ALL
  USING (tenant_id = app_tenant_id() AND app_has_tenant_role('manager'))
  WITH CHECK (tenant_id = app_tenant_id() AND app_has_tenant_role('manager'));
--> statement-breakpoint

-- ── platform_admins ───────────────────────────────────────────────────────
CREATE POLICY platform_admins_own_read ON platform_admins FOR SELECT
  USING (user_id = app_user_id());
--> statement-breakpoint

-- ── memberships ───────────────────────────────────────────────────────────
-- Cada um vê os próprios vínculos (em todas as escolas). O gestor vê e altera os da escola
-- ativa; o Super Admin também (convite do primeiro gestor, INS-03).
CREATE POLICY memberships_own_read ON memberships FOR SELECT
  USING (user_id = app_user_id());
--> statement-breakpoint
CREATE POLICY memberships_tenant_admin ON memberships FOR ALL
  USING (tenant_id = app_tenant_id() AND (app_has_tenant_role('manager') OR app_is_platform_admin()))
  WITH CHECK (tenant_id = app_tenant_id() AND (app_has_tenant_role('manager') OR app_is_platform_admin()));
--> statement-breakpoint

-- ── audit_logs ────────────────────────────────────────────────────────────
-- Qualquer usuário registra as próprias ações, na escola ativa ou na plataforma (Super Admin).
CREATE POLICY audit_logs_insert ON audit_logs FOR INSERT
  WITH CHECK (
    actor_id = app_user_id()
    AND ((tenant_id IS NULL AND app_is_platform_admin()) OR tenant_id = app_tenant_id())
  );
--> statement-breakpoint
CREATE POLICY audit_logs_read ON audit_logs FOR SELECT
  USING (
    app_is_platform_admin()
    OR (tenant_id = app_tenant_id() AND app_has_tenant_role('manager'))
  );
