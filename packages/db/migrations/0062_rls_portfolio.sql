-- Meus Certificados (docs/competencias, K1): só do dono. Item só aponta para pasta e arquivo
-- do próprio aluno.
ALTER TABLE portfolio_folders ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE portfolio_folders FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY portfolio_folders_own ON portfolio_folders FOR ALL
  USING (owner_id = (SELECT app_user_id()))
  WITH CHECK (owner_id = (SELECT app_user_id()));
--> statement-breakpoint
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE portfolio_items FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY portfolio_items_own ON portfolio_items FOR ALL
  USING (owner_id = (SELECT app_user_id()))
  WITH CHECK (
    owner_id = (SELECT app_user_id())
    AND (
      folder_id IS NULL
      OR EXISTS (SELECT 1 FROM portfolio_folders f WHERE f.id = folder_id AND f.owner_id = (SELECT app_user_id()))
    )
    AND (
      file_id IS NULL
      OR EXISTS (SELECT 1 FROM files f WHERE f.id = file_id AND f.owner_id = (SELECT app_user_id()))
    )
  );
