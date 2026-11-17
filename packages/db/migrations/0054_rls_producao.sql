-- Produção de aulas (ADR 0021): área só do admin. O worker grava em nome do admin que criou o
-- lote (withUser), então a mesma política vale para ele.
ALTER TABLE production_batches ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE production_batches FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY production_batches_admin ON production_batches FOR ALL
  USING ((SELECT app_has_role('admin')))
  WITH CHECK ((SELECT app_has_role('admin')));
--> statement-breakpoint
ALTER TABLE production_slides ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE production_slides FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY production_slides_admin ON production_slides FOR ALL
  USING ((SELECT app_has_role('admin')))
  WITH CHECK ((SELECT app_has_role('admin')));
--> statement-breakpoint
ALTER TABLE production_tasks ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE production_tasks FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY production_tasks_admin ON production_tasks FOR ALL
  USING ((SELECT app_has_role('admin')))
  WITH CHECK ((SELECT app_has_role('admin')));
