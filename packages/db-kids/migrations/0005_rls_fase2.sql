-- RLS e fluxo editorial da Fase 2 (SPEC Kids: PLA, CON, PAI-01, RES; ADR 0022).

-- ── Quem escreve e quem lê um plano ───────────────────────────────────────
-- Autor possível de um plano de (ano, matéria): a gestão, ou o professor ligado a uma turma
-- daquele ano naquela matéria (SPEC Kids, seção 3).
CREATE OR REPLACE FUNCTION app_can_author(g uuid, s uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_has_tenant_role('manager') OR (
    app_has_tenant_role('teacher') AND EXISTS (
      SELECT 1 FROM teacher_assignments ta JOIN classes c ON c.id = ta.class_id
      WHERE ta.user_id = app_user_id() AND ta.subject_id = s AND c.grade_id = g
        AND ta.tenant_id = app_tenant_id() AND c.archived_at IS NULL
    )
  )
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app_can_edit_plan(p uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT app_can_author(sp.grade_id, sp.subject_id) FROM study_plans sp
    WHERE sp.id = p AND sp.tenant_id = app_tenant_id()
  ), false)
$$;
--> statement-breakpoint

-- Conteúdo só muda enquanto o plano está em rascunho (PLA-05: publicado não muda no lugar).
CREATE OR REPLACE FUNCTION app_plan_editable(p uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_can_edit_plan(p) AND EXISTS (
    SELECT 1 FROM study_plans WHERE id = p AND status = 'draft'
  )
$$;
--> statement-breakpoint

-- O aluno só estuda com o consentimento do responsável (RES-03, K-D10). Vale o registro mais
-- recente de cada responsável; basta um responsável ter autorizado.
CREATE OR REPLACE FUNCTION app_student_consented(u text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM (
      SELECT DISTINCT ON (gc.guardian_id) gc.granted
      FROM guardian_consents gc
      WHERE gc.student_user_id = u AND gc.purpose = 'platform' AND gc.tenant_id = app_tenant_id()
      ORDER BY gc.guardian_id, gc.created_at DESC
    ) latest
    WHERE latest.granted
  )
$$;
--> statement-breakpoint

-- Leitura do plano: equipe da escola lê todos; aluno lê só o publicado do ano da turma dele, e
-- só com consentimento.
CREATE OR REPLACE FUNCTION app_can_read_plan(p uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM study_plans sp
    WHERE sp.id = p AND sp.tenant_id = app_tenant_id() AND (
      app_has_tenant_role('manager') OR app_has_tenant_role('teacher') OR (
        sp.status = 'published'
        AND app_has_tenant_role('student')
        AND app_student_consented(app_user_id())
        AND EXISTS (
          SELECT 1 FROM class_members cm JOIN classes c ON c.id = cm.class_id
          WHERE cm.user_id = app_user_id() AND cm.left_at IS NULL AND c.grade_id = sp.grade_id
            AND c.archived_at IS NULL
        )
      )
    )
  )
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app_topic_plan(t uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT plan_id FROM plan_topics WHERE id = t
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION app_card_plan(f uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pt.plan_id FROM flashcards fc JOIN plan_topics pt ON pt.id = fc.topic_id WHERE fc.id = f
$$;
--> statement-breakpoint

-- ── Fluxo editorial no banco (PLA-05) ─────────────────────────────────────
-- Mesma regra do Cognuss (migration 0001 do packages/db): não pula a revisão, o autor não
-- aprova o próprio plano e o que foi aprovado ou publicado não muda no lugar. O dono do banco
-- (seeds) passa direto.
CREATE OR REPLACE FUNCTION enforce_plan_transition() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  actor text := app_user_id();
BEGIN
  IF current_user <> 'kids_app' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft' THEN
      RAISE EXCEPTION 'plano novo começa como rascunho' USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.author_id IS DISTINCT FROM actor THEN
      RAISE EXCEPTION 'o autor do plano é quem cria' USING ERRCODE = 'insufficient_privilege';
    END IF;
    NEW.reviewer_id := NULL;
    NEW.published_at := NULL;
    RETURN NEW;
  END IF;

  IF NEW.author_id IS DISTINCT FROM OLD.author_id OR NEW.root_id <> OLD.root_id
     OR NEW.version <> OLD.version THEN
    RAISE EXCEPTION 'autor e versão não mudam' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.status = OLD.status THEN
    IF OLD.status <> 'draft' THEN
      RAISE EXCEPTION 'só o rascunho pode ser editado; crie uma versão nova'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD.status = 'draft' AND NEW.status = 'in_review') OR
    (OLD.status = 'in_review' AND NEW.status IN ('draft', 'approved')) OR
    (OLD.status = 'approved' AND NEW.status IN ('published', 'draft')) OR
    (OLD.status = 'published' AND NEW.status = 'archived') OR
    (OLD.status = 'archived' AND NEW.status IN ('published', 'draft'))
  ) THEN
    RAISE EXCEPTION 'transição inválida: % → %', OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;

  -- Na transição, só o status, a nota de revisão e os campos que o banco preenche mudam.
  IF NEW.title <> OLD.title OR NEW.helper_tips_md IS DISTINCT FROM OLD.helper_tips_md
     OR NEW.period_label IS DISTINCT FROM OLD.period_label
     OR NEW.grade_id <> OLD.grade_id OR NEW.subject_id <> OLD.subject_id THEN
    RAISE EXCEPTION 'mudar o status não muda o conteúdo' USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.status = 'approved' THEN
    IF OLD.author_id IS NOT DISTINCT FROM actor THEN
      RAISE EXCEPTION 'o autor não aprova o próprio plano' USING ERRCODE = 'insufficient_privilege';
    END IF;
    NEW.reviewer_id := actor;
  END IF;

  IF NEW.status = 'published' THEN
    NEW.published_at := now();
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint

CREATE TRIGGER study_plans_editorial
  BEFORE INSERT OR UPDATE ON study_plans
  FOR EACH ROW EXECUTE FUNCTION enforce_plan_transition();
--> statement-breakpoint

-- ── Responsável: acesso por token, sem login (D-K04) ──────────────────────
CREATE OR REPLACE FUNCTION guardian_from_token(p_hash text) RETURNS guardians
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.* FROM guardian_access_tokens t
  JOIN guardians g ON g.id = t.guardian_id
  JOIN tenants tn ON tn.id = g.tenant_id
  WHERE t.token_hash = p_hash AND t.expires_at > now() AND tn.status = 'active'
$$;
--> statement-breakpoint

-- O que a página do responsável mostra: escola, alunos ligados e se cada um está autorizado.
CREATE OR REPLACE FUNCTION guardian_portal(p_hash text)
RETURNS TABLE (guardian_name text, tenant_name text, student_id text, student_name text,
               granted boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.name, tn.name, u.id, u.name,
    COALESCE((
      SELECT gc.granted FROM guardian_consents gc
      WHERE gc.guardian_id = g.id AND gc.student_user_id = u.id AND gc.purpose = 'platform'
      ORDER BY gc.created_at DESC LIMIT 1
    ), false)
  FROM guardian_from_token(p_hash) g
  JOIN tenants tn ON tn.id = g.tenant_id
  JOIN guardian_links gl ON gl.guardian_id = g.id
  JOIN auth_users u ON u.id = gl.student_user_id
  WHERE g.id IS NOT NULL
  ORDER BY u.name
$$;
--> statement-breakpoint

-- Registra a decisão do responsável (RES-02). Só para aluno ligado a ele.
CREATE OR REPLACE FUNCTION guardian_record_consent(
  p_hash text, p_student text, p_granted boolean, p_policy text, p_ip_hash text
) RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g guardians%ROWTYPE;
BEGIN
  g := guardian_from_token(p_hash);
  IF g.id IS NULL THEN RAISE EXCEPTION 'link inválido' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM guardian_links WHERE guardian_id = g.id AND student_user_id = p_student) THEN
    RAISE EXCEPTION 'aluno não ligado a este responsável' USING ERRCODE = '42501';
  END IF;
  INSERT INTO guardian_consents
    (tenant_id, guardian_id, student_user_id, purpose, policy_version, granted, source, ip_hash)
  VALUES (g.tenant_id, g.id, p_student, 'platform', p_policy, p_granted, 'online', p_ip_hash);
  INSERT INTO audit_logs (tenant_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (g.tenant_id, NULL, CASE WHEN p_granted THEN 'consent.granted' ELSE 'consent.revoked' END,
          'user', p_student, jsonb_build_object('guardian', g.id, 'policy', p_policy));
END
$$;
--> statement-breakpoint

-- Pedido do titular pelo responsável (RES-05).
CREATE OR REPLACE FUNCTION guardian_open_request(
  p_hash text, p_student text, p_kind guardian_request_kind, p_details text
) RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g guardians%ROWTYPE;
BEGIN
  g := guardian_from_token(p_hash);
  IF g.id IS NULL THEN RAISE EXCEPTION 'link inválido' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM guardian_links WHERE guardian_id = g.id AND student_user_id = p_student) THEN
    RAISE EXCEPTION 'aluno não ligado a este responsável' USING ERRCODE = '42501';
  END IF;
  INSERT INTO guardian_requests (tenant_id, guardian_id, student_user_id, kind, details)
  VALUES (g.tenant_id, g.id, p_student, p_kind, nullif(trim(p_details), ''));
END
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION app_can_author(uuid, uuid), app_can_edit_plan(uuid), app_plan_editable(uuid),
  app_student_consented(text), app_can_read_plan(uuid), app_topic_plan(uuid), app_card_plan(uuid),
  guardian_from_token(text), guardian_portal(text),
  guardian_record_consent(text, text, boolean, text, text),
  guardian_open_request(text, text, guardian_request_kind, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_can_author(uuid, uuid), app_can_edit_plan(uuid), app_plan_editable(uuid),
  app_student_consented(text), app_can_read_plan(uuid), app_topic_plan(uuid), app_card_plan(uuid),
  guardian_portal(text), guardian_record_consent(text, text, boolean, text, text),
  guardian_open_request(text, text, guardian_request_kind, text) TO kids_app;
--> statement-breakpoint

-- Consentimento é registro imutável; token não se edita.
REVOKE UPDATE, DELETE ON guardian_consents FROM kids_app;
--> statement-breakpoint
REVOKE UPDATE ON guardian_access_tokens FROM kids_app;
--> statement-breakpoint

-- ── RLS ligado e forçado ──────────────────────────────────────────────────
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE study_plans FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE plan_topics ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE plan_topics FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE topic_contents ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE topic_contents FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE flashcards FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE flashcard_schedules ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE flashcard_schedules FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE topic_progress ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE topic_progress FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE guardians FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE guardian_links ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE guardian_links FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE guardian_access_tokens ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE guardian_access_tokens FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE guardian_consents ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE guardian_consents FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE guardian_requests ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE guardian_requests FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

-- ── study_plans ───────────────────────────────────────────────────────────
CREATE POLICY study_plans_read ON study_plans FOR SELECT
  USING (tenant_id = app_tenant_id() AND app_can_read_plan(id));
--> statement-breakpoint
CREATE POLICY study_plans_insert ON study_plans FOR INSERT
  WITH CHECK (tenant_id = app_tenant_id() AND app_can_author(grade_id, subject_id));
--> statement-breakpoint
CREATE POLICY study_plans_update ON study_plans FOR UPDATE
  USING (tenant_id = app_tenant_id() AND app_can_author(grade_id, subject_id))
  WITH CHECK (tenant_id = app_tenant_id() AND app_can_author(grade_id, subject_id));
--> statement-breakpoint
CREATE POLICY study_plans_delete_draft ON study_plans FOR DELETE
  USING (tenant_id = app_tenant_id() AND status = 'draft' AND app_can_author(grade_id, subject_id));
--> statement-breakpoint

-- ── plan_topics, topic_contents, flashcards ───────────────────────────────
CREATE POLICY plan_topics_read ON plan_topics FOR SELECT
  USING (tenant_id = app_tenant_id() AND app_can_read_plan(plan_id));
--> statement-breakpoint
CREATE POLICY plan_topics_write ON plan_topics FOR ALL
  USING (tenant_id = app_tenant_id() AND app_plan_editable(plan_id))
  WITH CHECK (tenant_id = app_tenant_id() AND app_plan_editable(plan_id));
--> statement-breakpoint
CREATE POLICY topic_contents_read ON topic_contents FOR SELECT
  USING (tenant_id = app_tenant_id() AND app_can_read_plan(app_topic_plan(topic_id)));
--> statement-breakpoint
CREATE POLICY topic_contents_write ON topic_contents FOR ALL
  USING (tenant_id = app_tenant_id() AND app_plan_editable(app_topic_plan(topic_id)))
  WITH CHECK (tenant_id = app_tenant_id() AND app_plan_editable(app_topic_plan(topic_id)));
--> statement-breakpoint
CREATE POLICY flashcards_read ON flashcards FOR SELECT
  USING (tenant_id = app_tenant_id() AND app_can_read_plan(app_topic_plan(topic_id)));
--> statement-breakpoint
CREATE POLICY flashcards_write ON flashcards FOR ALL
  USING (tenant_id = app_tenant_id() AND app_plan_editable(app_topic_plan(topic_id)))
  WITH CHECK (tenant_id = app_tenant_id() AND app_plan_editable(app_topic_plan(topic_id)));
--> statement-breakpoint

-- ── Progresso do aluno: só o próprio, só no que ele pode ler ──────────────
CREATE POLICY flashcard_schedules_own ON flashcard_schedules FOR ALL
  USING (tenant_id = app_tenant_id() AND user_id = app_user_id())
  WITH CHECK (tenant_id = app_tenant_id() AND user_id = app_user_id()
    AND app_can_read_plan(app_card_plan(flashcard_id)));
--> statement-breakpoint
CREATE POLICY flashcard_schedules_manager_read ON flashcard_schedules FOR SELECT
  USING (tenant_id = app_tenant_id() AND app_has_tenant_role('manager'));
--> statement-breakpoint
CREATE POLICY topic_progress_own ON topic_progress FOR ALL
  USING (tenant_id = app_tenant_id() AND user_id = app_user_id())
  WITH CHECK (tenant_id = app_tenant_id() AND user_id = app_user_id()
    AND app_can_read_plan(app_topic_plan(topic_id)));
--> statement-breakpoint
CREATE POLICY topic_progress_staff_read ON topic_progress FOR SELECT
  USING (tenant_id = app_tenant_id()
    AND (app_has_tenant_role('manager') OR app_teaches_student(user_id)));
--> statement-breakpoint

-- ── Responsáveis: só a gestão da escola ───────────────────────────────────
CREATE POLICY guardians_manager ON guardians FOR ALL
  USING (tenant_id = app_tenant_id() AND app_has_tenant_role('manager'))
  WITH CHECK (tenant_id = app_tenant_id() AND app_has_tenant_role('manager'));
--> statement-breakpoint
CREATE POLICY guardian_links_manager ON guardian_links FOR ALL
  USING (tenant_id = app_tenant_id() AND app_has_tenant_role('manager'))
  WITH CHECK (tenant_id = app_tenant_id() AND app_has_tenant_role('manager'));
--> statement-breakpoint
CREATE POLICY guardian_access_tokens_manager ON guardian_access_tokens FOR ALL
  USING (tenant_id = app_tenant_id() AND app_has_tenant_role('manager'))
  WITH CHECK (tenant_id = app_tenant_id() AND app_has_tenant_role('manager'));
--> statement-breakpoint
-- Gestão lê os registros e lança o consentimento em papel (RES-04), sempre em nome próprio.
CREATE POLICY guardian_consents_manager_read ON guardian_consents FOR SELECT
  USING (tenant_id = app_tenant_id() AND app_has_tenant_role('manager'));
--> statement-breakpoint
CREATE POLICY guardian_consents_manager_paper ON guardian_consents FOR INSERT
  WITH CHECK (tenant_id = app_tenant_id() AND app_has_tenant_role('manager')
    AND source = 'paper' AND recorded_by = app_user_id());
--> statement-breakpoint
CREATE POLICY guardian_requests_manager ON guardian_requests FOR ALL
  USING (tenant_id = app_tenant_id() AND app_has_tenant_role('manager'))
  WITH CHECK (tenant_id = app_tenant_id() AND app_has_tenant_role('manager'));
