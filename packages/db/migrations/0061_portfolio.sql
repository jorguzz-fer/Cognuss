CREATE TYPE "public"."portfolio_item_status" AS ENUM('reading', 'to_confirm', 'confirmed');--> statement-breakpoint
CREATE TABLE "portfolio_folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "portfolio_folders_name_chk" CHECK (char_length("portfolio_folders"."name") between 1 and 60)
);
--> statement-breakpoint
CREATE TABLE "portfolio_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"folder_id" uuid,
	"file_id" uuid,
	"status" "portfolio_item_status" DEFAULT 'reading' NOT NULL,
	"kind" text DEFAULT 'outro' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"issuer" text,
	"role" text,
	"started_on" date,
	"ended_on" date,
	"minutes" integer,
	"holder_name" text,
	"link" text,
	"notes" text,
	"source" text DEFAULT 'upload' NOT NULL,
	"extracted" jsonb,
	"read_note" text,
	"in_short_cv" boolean DEFAULT true NOT NULL,
	"in_academic_cv" boolean DEFAULT true NOT NULL,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "portfolio_items_minutes_chk" CHECK ("portfolio_items"."minutes" is null or "portfolio_items"."minutes" between 0 and 120000),
	CONSTRAINT "portfolio_items_dates_chk" CHECK ("portfolio_items"."ended_on" is null or "portfolio_items"."started_on" is null or "portfolio_items"."ended_on" >= "portfolio_items"."started_on")
);
--> statement-breakpoint
ALTER TABLE "portfolio_folders" ADD CONSTRAINT "portfolio_folders_owner_id_auth_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_owner_id_auth_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_folder_id_portfolio_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."portfolio_folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "portfolio_folders_owner_name_uq" ON "portfolio_folders" USING btree ("owner_id",lower("name"));--> statement-breakpoint
CREATE INDEX "portfolio_items_owner_idx" ON "portfolio_items" USING btree ("owner_id","status","created_at");--> statement-breakpoint
CREATE INDEX "portfolio_items_file_idx" ON "portfolio_items" USING btree ("file_id");