-- RLS da Fase 1 (SPEC Kids, seção 3; ADR 0022): matérias, turmas, alunos na turma, professores
-- por turma e matéria, e convites. Mesma regra: instituição do contexto + papel em memberships.

-- ── Funções de apoio ──────────────────────────────────────────────────────
-- Professor ligado à turma (por qualquer matéria) na instituição ativa.
CREATE OR REPLACE FUNCTION app_teaches_class(c uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_has_tenant_role('teacher') AND EXISTS (
    SELECT 1 FROM teacher_assignments ta
    WHERE ta.class_id = c AND ta.user_id = app_user_id() AND ta.tenant_id = app_tenant_id()
  )
$$;
--> statement-breakpoint

-- Aluno ativo na turma.
CREATE OR REPLACE FUNCTION app_in_class(c uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_has_tenant_role('student') AND EXISTS (
    SELECT 1 FROM class_members cm
    WHERE cm.class_id = c AND cm.user_id = app_user_id() AND cm.left_at IS NULL
      AND cm.tenant_id = app_tenant_id()
  )
$$;
--> statement-breakpoint

-- Professor de algum aluno: o professor vê e redefine a senha só de quem está nas turmas dele
-- (USR-07).
CREATE OR REPLACE FUNCTION app_teaches_student(u text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_has_tenant_role('teacher') AND EXISTS (
    SELECT 1 FROM class_members cm
    JOIN teacher_assignments ta ON ta.class_id = cm.class_id AND ta.user_id = app_user_id()
    WHERE cm.user_id = u AND cm.left_at IS NULL AND cm.tenant_id = app_tenant_id()
  )
$$;
--> statement-breakpoint

-- Convite pelo hash do token, sem sessão (tela /convite/[token]). Só devolve o necessário
-- para a tela: nunca o hash, nem convites de outras pessoas.
CREATE OR REPLACE FUNCTION invitation_lookup(p_hash text)
RETURNS TABLE (id uuid, tenant_name text, email text, role member_role, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.id, t.name, i.email, i.role,
    CASE
      WHEN i.accepted_at IS NOT NULL THEN 'accepted'
      WHEN i.expires_at < now() THEN 'expired'
      WHEN t.status <> 'active' THEN 'unavailable'
      ELSE 'open'
    END
  FROM invitations i JOIN tenants t ON t.id = i.tenant_id
  WHERE i.token_hash = p_hash
$$;
--> statement-breakpoint

-- Aceite do convite: cria o vínculo e marca o convite como usado, numa operação só. O usuário
-- vem de app.user_id (sessão), e o e-mail da conta precisa ser o do convite.
CREATE OR REPLACE FUNCTION invitation_accept(p_hash text) RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv invitations%ROWTYPE;
  account_email text;
BEGIN
  IF app_user_id() IS NULL THEN RAISE EXCEPTION 'sem usuário' USING ERRCODE = '42501'; END IF;
  SELECT * INTO inv FROM invitations WHERE token_hash = p_hash FOR UPDATE;
  IF NOT FOUND OR inv.accepted_at IS NOT NULL OR inv.expires_at < now() THEN
    RAISE EXCEPTION 'convite inválido' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = inv.tenant_id AND status = 'active') THEN
    RAISE EXCEPTION 'instituição indisponível' USING ERRCODE = '22023';
  END IF;
  SELECT lower(email) INTO account_email FROM auth_users WHERE id = app_user_id();
  IF account_email IS DISTINCT FROM inv.email THEN
    RAISE EXCEPTION 'convite de outro e-mail' USING ERRCODE = '42501';
  END IF;
  INSERT INTO memberships (tenant_id, user_id, role, status, invited_by)
  VALUES (inv.tenant_id, app_user_id(), inv.role, 'active', inv.invited_by)
  ON CONFLICT (tenant_id, user_id, role) DO UPDATE SET status = 'active', updated_at = now();
  UPDATE invitations SET accepted_at = now(), accepted_by = app_user_id() WHERE id = inv.id;
  INSERT INTO audit_logs (tenant_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (inv.tenant_id, app_user_id(), 'invitation.accepted', 'invitation', inv.id::text,
          jsonb_build_object('role', inv.role));
  RETURN inv.tenant_id;
END
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION app_teaches_class(uuid), app_in_class(uuid), app_teaches_student(text),
  invitation_lookup(text), invitation_accept(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_teaches_class(uuid), app_in_class(uuid), app_teaches_student(text),
  invitation_lookup(text), invitation_accept(text) TO kids_app;
--> statement-breakpoint

-- Convite não se edita pela aplicação: o aceite passa só por invitation_accept.
REVOKE UPDATE ON invitations FROM kids_app;
--> statement-breakpoint

-- ── RLS ligado e forçado ──────────────────────────────────────────────────
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE subjects FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE classes FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE class_members ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE class_members FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE teacher_assignments ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE teacher_assignments FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE invitations FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

-- ── subjects ──────────────────────────────────────────────────────────────
CREATE POLICY subjects_read ON subjects FOR SELECT
  USING (tenant_id = app_tenant_id() AND (app_is_tenant_member() OR app_is_platform_admin()));
--> statement-breakpoint
CREATE POLICY subjects_manager_write ON subjects FOR ALL
  USING (tenant_id = app_tenant_id() AND app_has_tenant_role('manager'))
  WITH CHECK (tenant_id = app_tenant_id() AND app_has_tenant_role('manager'));
--> statement-breakpoint

-- ── classes ───────────────────────────────────────────────────────────────
-- Gestor e professores veem todas as turmas da escola; o aluno vê só a(s) dele.
CREATE POLICY classes_staff_read ON classes FOR SELECT
  USING (tenant_id = app_tenant_id()
    AND (app_has_tenant_role('manager') OR app_has_tenant_role('teacher') OR app_is_platform_admin()));
--> statement-breakpoint
CREATE POLICY classes_student_read ON classes FOR SELECT
  USING (tenant_id = app_tenant_id() AND app_in_class(id));
--> statement-breakpoint
CREATE POLICY classes_manager_write ON classes FOR ALL
  USING (tenant_id = app_tenant_id() AND app_has_tenant_role('manager'))
  WITH CHECK (tenant_id = app_tenant_id() AND app_has_tenant_role('manager'));
--> statement-breakpoint

-- ── class_members ─────────────────────────────────────────────────────────
CREATE POLICY class_members_manager ON class_members FOR ALL
  USING (tenant_id = app_tenant_id() AND app_has_tenant_role('manager'))
  WITH CHECK (tenant_id = app_tenant_id() AND app_has_tenant_role('manager'));
--> statement-breakpoint
CREATE POLICY class_members_teacher_read ON class_members FOR SELECT
  USING (tenant_id = app_tenant_id() AND app_teaches_class(class_id));
--> statement-breakpoint
CREATE POLICY class_members_own_read ON class_members FOR SELECT
  USING (tenant_id = app_tenant_id() AND user_id = app_user_id());
--> statement-breakpoint

-- ── teacher_assignments ───────────────────────────────────────────────────
CREATE POLICY teacher_assignments_read ON teacher_assignments FOR SELECT
  USING (tenant_id = app_tenant_id() AND app_is_tenant_member());
--> statement-breakpoint
CREATE POLICY teacher_assignments_manager_write ON teacher_assignments FOR ALL
  USING (tenant_id = app_tenant_id() AND app_has_tenant_role('manager'))
  WITH CHECK (tenant_id = app_tenant_id() AND app_has_tenant_role('manager'));
--> statement-breakpoint

-- ── memberships: o professor vê os alunos das turmas dele ─────────────────
CREATE POLICY memberships_teacher_students_read ON memberships FOR SELECT
  USING (tenant_id = app_tenant_id() AND role = 'student' AND app_teaches_student(user_id));
--> statement-breakpoint

-- ── invitations ───────────────────────────────────────────────────────────
-- Gestor convida na escola dele; o Super Admin convida o primeiro gestor (INS-03).
CREATE POLICY invitations_admin ON invitations FOR ALL
  USING (tenant_id = app_tenant_id() AND (app_has_tenant_role('manager') OR app_is_platform_admin()))
  WITH CHECK (
    tenant_id = app_tenant_id() AND invited_by = app_user_id()
    AND (app_has_tenant_role('manager') OR (app_is_platform_admin() AND role = 'manager'))
  );
