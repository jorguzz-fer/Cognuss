CREATE TYPE "public"."content_kind" AS ENUM('text', 'video', 'table', 'timeline');--> statement-breakpoint
CREATE TYPE "public"."plan_status" AS ENUM('draft', 'in_review', 'approved', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."consent_purpose" AS ENUM('platform');--> statement-breakpoint
CREATE TYPE "public"."consent_source" AS ENUM('online', 'paper');--> statement-breakpoint
CREATE TYPE "public"."guardian_request_kind" AS ENUM('access', 'correction', 'export', 'deletion');--> statement-breakpoint
CREATE TYPE "public"."guardian_request_status" AS ENUM('open', 'done');--> statement-breakpoint
CREATE TABLE "flashcard_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"flashcard_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"repetitions" integer DEFAULT 0 NOT NULL,
	"interval_days" integer DEFAULT 0 NOT NULL,
	"ease" double precision DEFAULT 2.5 NOT NULL,
	"lapses" integer DEFAULT 0 NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flashcards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"front" text NOT NULL,
	"back" text NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "flashcards_tenant_id_key" UNIQUE("tenant_id","id"),
	CONSTRAINT "flashcards_text_length" CHECK (char_length("flashcards"."front") BETWEEN 1 AND 300 AND char_length("flashcards"."back") BETWEEN 1 AND 600)
);
--> statement-breakpoint
CREATE TABLE "plan_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"parent_id" uuid,
	"title" text NOT NULL,
	"summary" text,
	"order_index" integer DEFAULT 0 NOT NULL,
	"day_number" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plan_topics_tenant_id_key" UNIQUE("tenant_id","id"),
	CONSTRAINT "plan_topics_day_range" CHECK ("plan_topics"."day_number" IS NULL OR "plan_topics"."day_number" BETWEEN 1 AND 366)
);
--> statement-breakpoint
CREATE TABLE "study_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"grade_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"school_year" smallint NOT NULL,
	"title" text NOT NULL,
	"period_label" text,
	"helper_tips_md" text,
	"status" "plan_status" DEFAULT 'draft' NOT NULL,
	"root_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"author_id" text,
	"reviewer_id" text,
	"review_note" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "study_plans_tenant_id_key" UNIQUE("tenant_id","id"),
	CONSTRAINT "study_plans_title_length" CHECK (char_length("study_plans"."title") BETWEEN 3 AND 120)
);
--> statement-breakpoint
CREATE TABLE "topic_contents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"kind" "content_kind" NOT NULL,
	"title" text,
	"body_md" text,
	"url" text,
	"data" jsonb,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "topic_contents_shape" CHECK (("topic_contents"."kind" = 'text' AND "topic_contents"."body_md" IS NOT NULL)
        OR ("topic_contents"."kind" = 'video' AND "topic_contents"."url" ~ '^https://')
        OR ("topic_contents"."kind" IN ('table', 'timeline') AND "topic_contents"."data" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "topic_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guardian_access_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"guardian_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guardian_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"guardian_id" uuid NOT NULL,
	"student_user_id" text NOT NULL,
	"purpose" "consent_purpose" NOT NULL,
	"policy_version" text NOT NULL,
	"granted" boolean NOT NULL,
	"source" "consent_source" NOT NULL,
	"note" text,
	"recorded_by" text,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guardian_consents_paper_by_staff" CHECK ("guardian_consents"."source" = 'online' OR "guardian_consents"."recorded_by" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "guardian_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"guardian_id" uuid NOT NULL,
	"student_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guardian_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"guardian_id" uuid NOT NULL,
	"student_user_id" text NOT NULL,
	"kind" "guardian_request_kind" NOT NULL,
	"details" text,
	"status" "guardian_request_status" DEFAULT 'open' NOT NULL,
	"resolved_by" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guardian_requests_details_length" CHECK ("guardian_requests"."details" IS NULL OR char_length("guardian_requests"."details") <= 2000)
);
--> statement-breakpoint
CREATE TABLE "guardians" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guardians_tenant_id_key" UNIQUE("tenant_id","id"),
	CONSTRAINT "guardians_email_lower" CHECK ("guardians"."email" = lower("guardians"."email"))
);
--> statement-breakpoint
ALTER TABLE "flashcard_schedules" ADD CONSTRAINT "flashcard_schedules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_schedules" ADD CONSTRAINT "flashcard_schedules_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_schedules" ADD CONSTRAINT "flashcard_schedules_card_fk" FOREIGN KEY ("tenant_id","flashcard_id") REFERENCES "public"."flashcards"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_topic_fk" FOREIGN KEY ("tenant_id","topic_id") REFERENCES "public"."plan_topics"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_topics" ADD CONSTRAINT "plan_topics_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_topics" ADD CONSTRAINT "plan_topics_plan_fk" FOREIGN KEY ("tenant_id","plan_id") REFERENCES "public"."study_plans"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_topics" ADD CONSTRAINT "plan_topics_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."plan_topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_author_id_auth_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."auth_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_reviewer_id_auth_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."auth_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_grade_fk" FOREIGN KEY ("tenant_id","grade_id") REFERENCES "public"."grades"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_subject_fk" FOREIGN KEY ("tenant_id","subject_id") REFERENCES "public"."subjects"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_contents" ADD CONSTRAINT "topic_contents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_contents" ADD CONSTRAINT "topic_contents_topic_fk" FOREIGN KEY ("tenant_id","topic_id") REFERENCES "public"."plan_topics"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_progress" ADD CONSTRAINT "topic_progress_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_progress" ADD CONSTRAINT "topic_progress_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_progress" ADD CONSTRAINT "topic_progress_topic_fk" FOREIGN KEY ("tenant_id","topic_id") REFERENCES "public"."plan_topics"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_access_tokens" ADD CONSTRAINT "guardian_access_tokens_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_access_tokens" ADD CONSTRAINT "guardian_access_tokens_guardian_fk" FOREIGN KEY ("tenant_id","guardian_id") REFERENCES "public"."guardians"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_consents" ADD CONSTRAINT "guardian_consents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_consents" ADD CONSTRAINT "guardian_consents_student_user_id_auth_users_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_consents" ADD CONSTRAINT "guardian_consents_recorded_by_auth_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."auth_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_consents" ADD CONSTRAINT "guardian_consents_guardian_fk" FOREIGN KEY ("tenant_id","guardian_id") REFERENCES "public"."guardians"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_links" ADD CONSTRAINT "guardian_links_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_links" ADD CONSTRAINT "guardian_links_student_user_id_auth_users_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_links" ADD CONSTRAINT "guardian_links_guardian_fk" FOREIGN KEY ("tenant_id","guardian_id") REFERENCES "public"."guardians"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_requests" ADD CONSTRAINT "guardian_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_requests" ADD CONSTRAINT "guardian_requests_student_user_id_auth_users_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_requests" ADD CONSTRAINT "guardian_requests_resolved_by_auth_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."auth_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_requests" ADD CONSTRAINT "guardian_requests_guardian_fk" FOREIGN KEY ("tenant_id","guardian_id") REFERENCES "public"."guardians"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "flashcard_schedules_card_user_key" ON "flashcard_schedules" USING btree ("flashcard_id","user_id");--> statement-breakpoint
CREATE INDEX "flashcard_schedules_user_due_idx" ON "flashcard_schedules" USING btree ("tenant_id","user_id","due_at");--> statement-breakpoint
CREATE INDEX "flashcards_topic_idx" ON "flashcards" USING btree ("topic_id","order_index");--> statement-breakpoint
CREATE INDEX "plan_topics_plan_order_idx" ON "plan_topics" USING btree ("plan_id","order_index");--> statement-breakpoint
CREATE UNIQUE INDEX "study_plans_root_version_key" ON "study_plans" USING btree ("root_id","version");--> statement-breakpoint
CREATE INDEX "study_plans_tenant_grade_subject_idx" ON "study_plans" USING btree ("tenant_id","grade_id","subject_id");--> statement-breakpoint
CREATE INDEX "topic_contents_topic_order_idx" ON "topic_contents" USING btree ("topic_id","order_index");--> statement-breakpoint
CREATE UNIQUE INDEX "topic_progress_topic_user_key" ON "topic_progress" USING btree ("topic_id","user_id");--> statement-breakpoint
CREATE INDEX "topic_progress_user_idx" ON "topic_progress" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guardian_access_tokens_hash_key" ON "guardian_access_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "guardian_consents_student_idx" ON "guardian_consents" USING btree ("tenant_id","student_user_id","purpose","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "guardian_links_guardian_student_key" ON "guardian_links" USING btree ("guardian_id","student_user_id");--> statement-breakpoint
CREATE INDEX "guardian_links_student_idx" ON "guardian_links" USING btree ("tenant_id","student_user_id");--> statement-breakpoint
CREATE INDEX "guardian_requests_tenant_status_idx" ON "guardian_requests" USING btree ("tenant_id","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "guardians_tenant_email_key" ON "guardians" USING btree ("tenant_id","email");