CREATE TYPE "public"."assessment_kind" AS ENUM('practice', 'exam');--> statement-breakpoint
CREATE TYPE "public"."question_kind" AS ENUM('multiple_choice', 'true_false', 'short_answer');--> statement-breakpoint
CREATE TABLE "assessment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"client_key" text NOT NULL,
	"retake_of" uuid,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"correct_count" smallint,
	"total" smallint NOT NULL,
	"score" numeric(3, 1),
	"passed" boolean,
	CONSTRAINT "assessment_attempts_tenant_id_key" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"kind" "assessment_kind" NOT NULL,
	"title" text NOT NULL,
	"question_count" smallint DEFAULT 10 NOT NULL,
	"passing_score" numeric(3, 1) DEFAULT '8.0' NOT NULL,
	"max_attempts" smallint,
	"max_retakes" smallint DEFAULT 2 NOT NULL,
	"opens_at" timestamp with time zone,
	"closes_at" timestamp with time zone,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessments_tenant_id_key" UNIQUE("tenant_id","id"),
	CONSTRAINT "assessments_count_range" CHECK ("assessments"."question_count" BETWEEN 1 AND 40),
	CONSTRAINT "assessments_passing_range" CHECK ("assessments"."passing_score" BETWEEN 0 AND 10),
	CONSTRAINT "assessments_attempts_range" CHECK ("assessments"."max_attempts" IS NULL OR "assessments"."max_attempts" BETWEEN 1 AND 10),
	CONSTRAINT "assessments_retakes_range" CHECK ("assessments"."max_retakes" BETWEEN 0 AND 5),
	CONSTRAINT "assessments_window" CHECK ("assessments"."opens_at" IS NULL OR "assessments"."closes_at" IS NULL OR "assessments"."opens_at" < "assessments"."closes_at")
);
--> statement-breakpoint
CREATE TABLE "attempt_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"attempt_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"question_id" uuid NOT NULL,
	"answer" jsonb,
	"answered_at" timestamp with time zone,
	"is_correct" boolean
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"kind" "question_kind" NOT NULL,
	"stem" text NOT NULL,
	"options" jsonb,
	"answer" jsonb NOT NULL,
	"model_answer" text,
	"explanation" text,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "questions_tenant_id_key" UNIQUE("tenant_id","id"),
	CONSTRAINT "questions_stem_length" CHECK (char_length("questions"."stem") BETWEEN 3 AND 500),
	CONSTRAINT "questions_shape" CHECK (("questions"."kind" = 'multiple_choice' AND jsonb_array_length("questions"."options") BETWEEN 2 AND 5
            AND ("questions"."answer"->>'correct')::int BETWEEN 0 AND jsonb_array_length("questions"."options") - 1)
        OR ("questions"."kind" = 'true_false' AND "questions"."options" IS NULL AND jsonb_typeof("questions"."answer"->'value') = 'boolean')
        OR ("questions"."kind" = 'short_answer' AND "questions"."options" IS NULL
            AND jsonb_array_length("questions"."answer"->'groups') >= 1
            AND ("questions"."answer"->>'min')::int BETWEEN 1 AND jsonb_array_length("questions"."answer"->'groups')))
);
--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_assessment_fk" FOREIGN KEY ("tenant_id","assessment_id") REFERENCES "public"."assessments"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_retake_fk" FOREIGN KEY ("retake_of") REFERENCES "public"."assessment_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_created_by_auth_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."auth_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_plan_fk" FOREIGN KEY ("tenant_id","plan_id") REFERENCES "public"."study_plans"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_items" ADD CONSTRAINT "attempt_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_items" ADD CONSTRAINT "attempt_items_attempt_fk" FOREIGN KEY ("tenant_id","attempt_id") REFERENCES "public"."assessment_attempts"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_items" ADD CONSTRAINT "attempt_items_question_fk" FOREIGN KEY ("tenant_id","question_id") REFERENCES "public"."questions"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_topic_fk" FOREIGN KEY ("tenant_id","topic_id") REFERENCES "public"."plan_topics"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_attempts_user_key" ON "assessment_attempts" USING btree ("user_id","client_key");--> statement-breakpoint
CREATE INDEX "assessment_attempts_assessment_user_idx" ON "assessment_attempts" USING btree ("assessment_id","user_id","started_at");--> statement-breakpoint
CREATE INDEX "assessments_plan_idx" ON "assessments" USING btree ("plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attempt_items_attempt_position_key" ON "attempt_items" USING btree ("attempt_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "questions_group_kind_key" ON "questions" USING btree ("group_id","kind");--> statement-breakpoint
CREATE INDEX "questions_topic_idx" ON "questions" USING btree ("topic_id","order_index");