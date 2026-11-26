-- Avaliação da Fase 3 (SPEC Kids: AVA-01 a AVA-08). O aluno não lê questions: as funções
-- attempt_* sorteiam, mostram sem gabarito, corrigem no servidor e devolvem o resultado.

-- ── Correção ──────────────────────────────────────────────────────────────
-- Mesma normalização do piloto: minúsculas, sem acento, só letras, números e espaço.
CREATE OR REPLACE FUNCTION kids_norm(t text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT ' ' || regexp_replace(
    translate(lower(coalesce(t, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
    '[^a-z0-9 -]', ' ', 'g') || ' '
$$;
--> statement-breakpoint

-- Resposta certa? Alternativa: índice; verdadeiro ou falso: valor; escrita: quantos grupos de
-- palavras-chave aparecem (basta um radical de cada grupo), contra o mínimo da questão.
CREATE OR REPLACE FUNCTION kids_grade(p_kind question_kind, p_key jsonb, p_given jsonb)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  hits int := 0;
  grp jsonb;
  stem text;
  txt text;
BEGIN
  IF p_given IS NULL THEN RETURN false; END IF;
  IF p_kind = 'multiple_choice' THEN
    RETURN (p_given->>'choice') ~ '^\d+$' AND (p_given->>'choice')::int = (p_key->>'correct')::int;
  ELSIF p_kind = 'true_false' THEN
    RETURN jsonb_typeof(p_given->'value') = 'boolean'
      AND (p_given->>'value')::boolean = (p_key->>'value')::boolean;
  END IF;
  txt := kids_norm(p_given->>'text');
  FOR grp IN SELECT * FROM jsonb_array_elements(p_key->'groups') LOOP
    FOR stem IN SELECT * FROM jsonb_array_elements_text(grp) LOOP
      IF length(trim(kids_norm(stem))) > 0 AND position(trim(kids_norm(stem)) IN txt) > 0 THEN
        hits := hits + 1;
        EXIT;
      END IF;
    END LOOP;
  END LOOP;
  RETURN hits >= (p_key->>'min')::int;
END
$$;
--> statement-breakpoint

-- ── Começar a tentativa (AVA-03 a AVA-05, AVA-07) ─────────────────────────
-- Idempotente por client_key. Prova e simulado: sorteia um conceito por questão e alterna os
-- formatos (alternativa, verdadeiro ou falso, escrita), como no piloto. Recuperação: para cada
-- questão errada, o mesmo conceito em outro formato; sem outro formato, outra questão do
-- mesmo tópico em outro formato; por último, a mesma questão.
CREATE OR REPLACE FUNCTION attempt_start(p_assessment uuid, p_key text, p_retake_of uuid)
RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me text := app_user_id();
  a assessments%ROWTYPE;
  prev assessment_attempts%ROWTYPE;
  att uuid;
  n int;
  pos int := 0;
  r record;
  chosen uuid;
  pref question_kind;
  used uuid[] := '{}';
BEGIN
  IF me IS NULL OR NOT app_has_tenant_role('student') THEN
    RAISE EXCEPTION 'só aluno faz avaliação' USING ERRCODE = '42501';
  END IF;
  IF p_key IS NULL OR length(p_key) NOT BETWEEN 8 AND 100 THEN
    RAISE EXCEPTION 'chave da tentativa inválida' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO a FROM assessments WHERE id = p_assessment AND tenant_id = app_tenant_id();
  IF NOT FOUND OR NOT app_can_read_plan(a.plan_id) THEN
    RAISE EXCEPTION 'avaliação indisponível' USING ERRCODE = '42501';
  END IF;
  SELECT id INTO att FROM assessment_attempts WHERE user_id = me AND client_key = p_key;
  IF FOUND THEN RETURN att; END IF;
  IF (a.opens_at IS NOT NULL AND now() < a.opens_at) OR (a.closes_at IS NOT NULL AND now() > a.closes_at) THEN
    RAISE EXCEPTION 'fora do prazo' USING ERRCODE = '22023';
  END IF;

  att := gen_random_uuid();
  IF p_retake_of IS NULL THEN
    IF a.max_attempts IS NOT NULL THEN
      SELECT count(*) INTO n FROM assessment_attempts
      WHERE assessment_id = a.id AND user_id = me AND retake_of IS NULL;
      IF n >= a.max_attempts THEN
        RAISE EXCEPTION 'tentativas esgotadas' USING ERRCODE = '22023';
      END IF;
    END IF;
    INSERT INTO assessment_attempts (id, tenant_id, assessment_id, user_id, client_key, total)
    VALUES (att, a.tenant_id, a.id, me, p_key, 0);
    FOR r IN
      SELECT g.group_id FROM (
        SELECT DISTINCT q.group_id FROM questions q JOIN plan_topics t ON t.id = q.topic_id
        WHERE t.plan_id = a.plan_id
      ) g ORDER BY random() LIMIT a.question_count
    LOOP
      pref := (ARRAY['multiple_choice', 'true_false', 'short_answer']::question_kind[])[pos % 3 + 1];
      SELECT id INTO chosen FROM questions WHERE group_id = r.group_id
      ORDER BY (kind = pref) DESC, random() LIMIT 1;
      pos := pos + 1;
      INSERT INTO attempt_items (tenant_id, attempt_id, "position", question_id)
      VALUES (a.tenant_id, att, pos, chosen);
    END LOOP;
  ELSE
    IF a.kind <> 'exam' THEN
      RAISE EXCEPTION 'recuperação só existe na prova' USING ERRCODE = '22023';
    END IF;
    SELECT * INTO prev FROM assessment_attempts
    WHERE id = p_retake_of AND user_id = me AND assessment_id = a.id;
    IF NOT FOUND OR prev.submitted_at IS NULL OR prev.passed IS DISTINCT FROM false THEN
      RAISE EXCEPTION 'recuperação só depois de uma prova abaixo da nota mínima' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (SELECT 1 FROM assessment_attempts WHERE retake_of = prev.id) THEN
      RAISE EXCEPTION 'esta recuperação já foi aberta' USING ERRCODE = '22023';
    END IF;
    SELECT count(*) INTO n FROM assessment_attempts
    WHERE assessment_id = a.id AND user_id = me AND retake_of IS NOT NULL;
    IF n >= a.max_retakes THEN
      RAISE EXCEPTION 'recuperações esgotadas' USING ERRCODE = '22023';
    END IF;
    INSERT INTO assessment_attempts (id, tenant_id, assessment_id, user_id, client_key, retake_of, total)
    VALUES (att, a.tenant_id, a.id, me, p_key, prev.id, 0);
    FOR r IN
      SELECT ai.question_id, q.group_id, q.kind, q.topic_id
      FROM attempt_items ai JOIN questions q ON q.id = ai.question_id
      WHERE ai.attempt_id = prev.id AND ai.is_correct IS NOT TRUE
      ORDER BY ai."position"
    LOOP
      chosen := NULL;
      SELECT id INTO chosen FROM questions
      WHERE group_id = r.group_id AND kind <> r.kind AND NOT (id = ANY (used))
      ORDER BY random() LIMIT 1;
      IF chosen IS NULL THEN
        SELECT id INTO chosen FROM questions
        WHERE topic_id = r.topic_id AND kind <> r.kind AND NOT (id = ANY (used))
        ORDER BY random() LIMIT 1;
      END IF;
      IF chosen IS NULL THEN chosen := r.question_id; END IF;
      used := used || chosen;
      pos := pos + 1;
      INSERT INTO attempt_items (tenant_id, attempt_id, "position", question_id)
      VALUES (a.tenant_id, att, pos, chosen);
    END LOOP;
  END IF;

  IF pos = 0 THEN
    RAISE EXCEPTION 'a avaliação ainda não tem questões' USING ERRCODE = '22023';
  END IF;
  UPDATE assessment_attempts SET total = pos WHERE id = att;
  RETURN att;
END
$$;
--> statement-breakpoint

-- ── Ver a tentativa sem gabarito (AVA-02) ─────────────────────────────────
-- Explicação e resposta certa só depois de enviar (prova) ou da questão respondida (simulado).
CREATE OR REPLACE FUNCTION attempt_view(p_attempt uuid)
RETURNS TABLE (pos smallint, kind question_kind, stem text, options jsonb, answer jsonb,
               is_correct boolean, explanation text, model_answer text, correct jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ai."position", q.kind, q.stem, q.options, ai.answer,
    CASE WHEN show THEN ai.is_correct END,
    CASE WHEN show THEN q.explanation END,
    CASE WHEN show THEN q.model_answer END,
    CASE WHEN show AND q.kind <> 'short_answer' THEN q.answer END
  FROM assessment_attempts aa
  JOIN assessments a ON a.id = aa.assessment_id
  JOIN attempt_items ai ON ai.attempt_id = aa.id
  JOIN questions q ON q.id = ai.question_id
  CROSS JOIN LATERAL (
    SELECT aa.submitted_at IS NOT NULL OR (a.kind = 'practice' AND ai.answered_at IS NOT NULL) AS show
  ) s
  WHERE aa.id = p_attempt AND aa.user_id = app_user_id() AND aa.tenant_id = app_tenant_id()
  ORDER BY ai."position"
$$;
--> statement-breakpoint

-- ── Responder uma questão ─────────────────────────────────────────────────
-- Grava a resposta. No simulado, corrige na hora e devolve a explicação (AVA-03).
CREATE OR REPLACE FUNCTION attempt_answer(p_attempt uuid, p_position int, p_answer jsonb)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  aa assessment_attempts%ROWTYPE;
  k assessment_kind;
  q questions%ROWTYPE;
  ok boolean;
BEGIN
  SELECT * INTO aa FROM assessment_attempts
  WHERE id = p_attempt AND user_id = app_user_id() AND tenant_id = app_tenant_id() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tentativa não encontrada' USING ERRCODE = '42501'; END IF;
  IF aa.submitted_at IS NOT NULL THEN
    RAISE EXCEPTION 'tentativa já enviada' USING ERRCODE = '22023';
  END IF;
  SELECT kind INTO k FROM assessments WHERE id = aa.assessment_id;
  SELECT q2.* INTO q FROM attempt_items ai JOIN questions q2 ON q2.id = ai.question_id
  WHERE ai.attempt_id = aa.id AND ai."position" = p_position;
  IF NOT FOUND THEN RAISE EXCEPTION 'questão não encontrada' USING ERRCODE = '22023'; END IF;
  IF k = 'practice' AND EXISTS (
    SELECT 1 FROM attempt_items WHERE attempt_id = aa.id AND "position" = p_position AND answered_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'no simulado, cada questão é respondida uma vez' USING ERRCODE = '22023';
  END IF;
  ok := kids_grade(q.kind, q.answer, p_answer);
  UPDATE attempt_items SET answer = p_answer, answered_at = now(),
    is_correct = CASE WHEN k = 'practice' THEN ok END
  WHERE attempt_id = aa.id AND "position" = p_position;
  IF k = 'practice' THEN
    RETURN jsonb_build_object('correct', ok, 'explanation', q.explanation,
      'model_answer', q.model_answer,
      'key', CASE WHEN q.kind <> 'short_answer' THEN q.answer END);
  END IF;
  RETURN '{}'::jsonb;
END
$$;
--> statement-breakpoint

-- ── Enviar e calcular a nota (AVA-04) ─────────────────────────────────────
-- Nota de 0 a 10, uma casa decimal. Questão sem resposta conta como errada. Idempotente.
CREATE OR REPLACE FUNCTION attempt_submit(p_attempt uuid) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  aa assessment_attempts%ROWTYPE;
  a assessments%ROWTYPE;
  ok_count int;
  sc numeric(3,1);
BEGIN
  SELECT * INTO aa FROM assessment_attempts
  WHERE id = p_attempt AND user_id = app_user_id() AND tenant_id = app_tenant_id() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tentativa não encontrada' USING ERRCODE = '42501'; END IF;
  SELECT * INTO a FROM assessments WHERE id = aa.assessment_id;
  IF aa.submitted_at IS NULL THEN
    UPDATE attempt_items ai SET is_correct = kids_grade(q.kind, q.answer, ai.answer)
    FROM questions q WHERE q.id = ai.question_id AND ai.attempt_id = aa.id;
    SELECT count(*) FILTER (WHERE is_correct) INTO ok_count FROM attempt_items WHERE attempt_id = aa.id;
    sc := round(ok_count * 10.0 / aa.total, 1);
    UPDATE assessment_attempts SET submitted_at = now(), correct_count = ok_count, score = sc,
      passed = CASE WHEN a.kind = 'exam' THEN sc >= a.passing_score END
    WHERE id = aa.id
    RETURNING * INTO aa;
    INSERT INTO audit_logs (tenant_id, actor_id, action, entity_type, entity_id, metadata)
    VALUES (aa.tenant_id, aa.user_id, 'attempt.submitted', 'assessment', a.id::text,
            jsonb_build_object('score', aa.score, 'retake', aa.retake_of IS NOT NULL));
  END IF;
  RETURN jsonb_build_object('score', aa.score, 'correct', aa.correct_count, 'total', aa.total,
    'passed', aa.passed, 'passing_score', a.passing_score, 'kind', a.kind);
END
$$;
--> statement-breakpoint

-- Professor: assessments de plano que ele edita. Leitura das tentativas pela equipe.
CREATE OR REPLACE FUNCTION app_attempt_visible(p uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM assessment_attempts aa
    WHERE aa.id = p AND aa.tenant_id = app_tenant_id() AND (
      aa.user_id = app_user_id() OR app_has_tenant_role('manager') OR app_teaches_student(aa.user_id)
    )
  )
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION kids_grade(question_kind, jsonb, jsonb), attempt_start(uuid, text, uuid),
  attempt_view(uuid), attempt_answer(uuid, int, jsonb), attempt_submit(uuid),
  app_attempt_visible(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION attempt_start(uuid, text, uuid), attempt_view(uuid),
  attempt_answer(uuid, int, jsonb), attempt_submit(uuid), app_attempt_visible(uuid) TO kids_app;
--> statement-breakpoint
-- Tentativas só mudam pelas funções acima.
REVOKE INSERT, UPDATE, DELETE ON assessment_attempts, attempt_items FROM kids_app;
--> statement-breakpoint

-- ── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE questions FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE assessments FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE assessment_attempts ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE assessment_attempts FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE attempt_items ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE attempt_items FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Questões: só a equipe lê (o aluno nunca, AVA-02); só muda no rascunho do plano.
CREATE POLICY questions_staff_read ON questions FOR SELECT
  USING (tenant_id = app_tenant_id()
    AND (app_has_tenant_role('manager') OR app_has_tenant_role('teacher')));
--> statement-breakpoint
CREATE POLICY questions_write ON questions FOR ALL
  USING (tenant_id = app_tenant_id() AND app_plan_editable(app_topic_plan(topic_id)))
  WITH CHECK (tenant_id = app_tenant_id() AND app_plan_editable(app_topic_plan(topic_id)));
--> statement-breakpoint

-- Simulados e provas: quem lê o plano vê; quem edita o plano cria e muda (mesmo publicado).
CREATE POLICY assessments_read ON assessments FOR SELECT
  USING (tenant_id = app_tenant_id() AND app_can_read_plan(plan_id));
--> statement-breakpoint
CREATE POLICY assessments_write ON assessments FOR ALL
  USING (tenant_id = app_tenant_id() AND app_can_edit_plan(plan_id))
  WITH CHECK (tenant_id = app_tenant_id() AND app_can_edit_plan(plan_id));
--> statement-breakpoint

CREATE POLICY assessment_attempts_read ON assessment_attempts FOR SELECT
  USING (tenant_id = app_tenant_id() AND app_attempt_visible(id));
--> statement-breakpoint
CREATE POLICY attempt_items_read ON attempt_items FOR SELECT
  USING (tenant_id = app_tenant_id() AND app_attempt_visible(attempt_id));
