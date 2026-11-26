-- ADR 0024: o admin (Super Admin) pode aprovar o próprio conteúdo (questões, módulos, peças da
-- produção e cartões editoriais). Revisor e editor continuam sem aprovar o que escreveram.
-- Só muda a regra do autor; o resto das funções fica igual às migrations 0001 e 0006.
CREATE OR REPLACE FUNCTION enforce_editorial_transition() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  actor text := app_user_id();
  is_reviewer boolean := app_has_role('reviewer') OR app_has_role('admin');
BEGIN
  IF current_user <> 'gutta_app' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('draft', 'in_review') THEN
      RAISE EXCEPTION 'conteúdo novo começa como rascunho ou em revisão'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = OLD.status THEN
    -- Conteúdo publicado não muda no lugar: edição gera nova versão em rascunho.
    IF OLD.status IN ('approved', 'published') AND NOT is_reviewer THEN
      RAISE EXCEPTION 'conteúdo aprovado ou publicado só muda por revisor'
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
    RAISE EXCEPTION 'transição editorial inválida: % → %', OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.status IN ('approved', 'published', 'archived') OR
     (OLD.status = 'in_review' AND NEW.status = 'draft') THEN
    IF NOT is_reviewer THEN
      RAISE EXCEPTION 'só revisor aprova, devolve, publica ou arquiva'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  IF NEW.status = 'approved' THEN
    -- O admin (Super Admin) pode aprovar o próprio conteúdo (ADR 0024); os demais, não.
    IF NEW.author_id IS NOT DISTINCT FROM actor AND NOT app_has_role('admin') THEN
      RAISE EXCEPTION 'o autor não aprova o próprio conteúdo'
        USING ERRCODE = 'insufficient_privilege';
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

CREATE OR REPLACE FUNCTION guard_flashcard_editorial() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF current_user <> 'gutta_app' OR NEW.visibility = 'private' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' AND NEW.status NOT IN ('draft', 'in_review') THEN
    RAISE EXCEPTION 'cartão editorial novo começa como rascunho' USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IN ('approved', 'published', 'archived')
     AND NEW.status IS DISTINCT FROM OLD.status
     AND NOT (app_has_role('reviewer') OR app_has_role('admin')) THEN
    RAISE EXCEPTION 'só revisor aprova ou publica' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status <> 'approved'
     AND NEW.author_id IS NOT DISTINCT FROM app_user_id() AND NOT app_has_role('admin') THEN
    RAISE EXCEPTION 'o autor não aprova o próprio conteúdo' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;
