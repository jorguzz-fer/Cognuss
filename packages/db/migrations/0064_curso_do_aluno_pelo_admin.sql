-- Curso do aluno visto e trocado pelo admin (ADR 0026). O perfil do aluno continua só do
-- dono no RLS (student_profiles_own); o admin passa por estas funções, que leem e mudam só o
-- curso, e nada mais do perfil.

CREATE OR REPLACE FUNCTION admin_course_student_counts()
RETURNS TABLE (course_id uuid, students int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM app_assert_admin_or_system();
  RETURN QUERY
  SELECT sp.course_id, count(*)::int FROM student_profiles sp GROUP BY sp.course_id;
END;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION admin_student_course(p_user text)
RETURNS TABLE (
  course_id uuid, course_other text, semester smallint, institution_id uuid,
  onboarded_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM app_assert_admin_or_system();
  RETURN QUERY
  SELECT sp.course_id, sp.course_other, sp.semester, sp.institution_id,
         sp.onboarding_completed_at
  FROM student_profiles sp WHERE sp.user_id = p_user;
END;
$$;
--> statement-breakpoint

-- Troca só o curso. "Outro curso da saúde" guarda o nome digitado; nos demais ele sai.
-- Devolve o curso anterior, para a auditoria.
CREATE OR REPLACE FUNCTION admin_set_student_course(p_user text, p_course uuid)
RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  previous uuid;
  target_slug text;
BEGIN
  PERFORM app_assert_admin_or_system();
  SELECT slug INTO target_slug FROM courses WHERE id = p_course AND active;
  IF target_slug IS NULL THEN
    RAISE EXCEPTION 'curso indisponível' USING ERRCODE = 'check_violation';
  END IF;
  SELECT course_id INTO previous FROM student_profiles WHERE user_id = p_user FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'aluno sem perfil' USING ERRCODE = 'no_data_found';
  END IF;
  UPDATE student_profiles
     SET course_id = p_course,
         course_other = CASE WHEN target_slug = 'outro-curso-da-saude' THEN course_other END,
         updated_at = now()
   WHERE user_id = p_user;
  RETURN previous;
END;
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION admin_course_student_counts() FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION admin_student_course(text) FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON FUNCTION admin_set_student_course(text, uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION admin_course_student_counts() TO gutta_app;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION admin_student_course(text) TO gutta_app;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION admin_set_student_course(text, uuid) TO gutta_app;
