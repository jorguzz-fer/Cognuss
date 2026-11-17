CREATE TYPE "public"."production_batch_status" AS ENUM('waiting_file', 'extracting', 'planning', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."production_slide_kind" AS ENUM('content', 'instruction', 'reference');--> statement-breakpoint
CREATE TYPE "public"."production_task_status" AS ENUM('proposed', 'approved', 'discarded');--> statement-breakpoint
CREATE TABLE "production_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discipline_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"title" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"file_id" uuid NOT NULL,
	"created_by" text,
	"status" "production_batch_status" DEFAULT 'waiting_file' NOT NULL,
	"mode" text,
	"bibliography" text,
	"error" text,
	"warnings" text[] DEFAULT '{}' NOT NULL,
	"estimated_credits" integer DEFAULT 0 NOT NULL,
	"actual_credits" integer DEFAULT 0 NOT NULL,
	"plan_cost_micros" bigint DEFAULT 0 NOT NULL,
	"plan_model" text,
	"planned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_slides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"kind" "production_slide_kind" NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"notes" text,
	"hidden" boolean DEFAULT false NOT NULL,
	"has_image" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"origin" text NOT NULL,
	"source_slides" integer[] NOT NULL,
	"target_slides" integer[] NOT NULL,
	"target_assumed" boolean DEFAULT false NOT NULL,
	"instruction" text NOT NULL,
	"priority" boolean DEFAULT false NOT NULL,
	"piece_type" text,
	"title" text NOT NULL,
	"plan" jsonb,
	"status" "production_task_status" DEFAULT 'proposed' NOT NULL,
	"module_id" uuid,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_discipline_id_disciplines_id_fk" FOREIGN KEY ("discipline_id") REFERENCES "public"."disciplines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_created_by_auth_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."auth_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_slides" ADD CONSTRAINT "production_slides_batch_id_production_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."production_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_tasks" ADD CONSTRAINT "production_tasks_batch_id_production_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."production_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_tasks" ADD CONSTRAINT "production_tasks_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_tasks" ADD CONSTRAINT "production_tasks_decided_by_auth_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."auth_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "production_batches_created_idx" ON "production_batches" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "production_batches_file_idx" ON "production_batches" USING btree ("file_id");--> statement-breakpoint
CREATE UNIQUE INDEX "production_slides_batch_number_uq" ON "production_slides" USING btree ("batch_id","number");--> statement-breakpoint
CREATE UNIQUE INDEX "production_tasks_batch_position_uq" ON "production_tasks" USING btree ("batch_id","position");