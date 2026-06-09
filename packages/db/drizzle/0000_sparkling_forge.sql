CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('generated', 'approved', 'submitted', 'rejected', 'interview_invited', 'offer_received', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."contract_type" AS ENUM('werkstudent', 'minijob', 'vollzeit', 'teilzeit', 'praktikum', 'freelance');--> statement-breakpoint
CREATE TYPE "public"."generation_status" AS ENUM('pending', 'processing', 'complete', 'failed');--> statement-breakpoint
CREATE TYPE "public"."german_level" AS ENUM('none', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'native');--> statement-breakpoint
CREATE TYPE "public"."visa_type" AS ENUM('student_visa_16b', 'eu_citizen', 'chancenkarte_20a', 'blue_card', 'near_graduation');--> statement-breakpoint
CREATE TABLE "applications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"job_id" text NOT NULL,
	"status" "application_status" DEFAULT 'generated' NOT NULL,
	"generation_status" "generation_status" DEFAULT 'pending' NOT NULL,
	"cv_storage_key" text,
	"cover_letter_storage_key" text,
	"eval_score_ats" real,
	"eval_score_keywords" real,
	"eval_score_factual" real,
	"eval_score_format" real,
	"eval_score_tone" real,
	"eval_score_language" real,
	"eval_score_overall" real,
	"audit_log" json DEFAULT '[]'::json,
	"user_approved_at" timestamp with time zone,
	"user_submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follow_up_drafts" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" text NOT NULL,
	"draft_text" text NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"external_id" text NOT NULL,
	"source" text NOT NULL,
	"source_url" text NOT NULL,
	"title" text NOT NULL,
	"company" text NOT NULL,
	"location" text NOT NULL,
	"contract_type" "contract_type" NOT NULL,
	"hourly_rate" real,
	"hours_per_week" integer,
	"german_level_required" "german_level",
	"required_skills" text[] DEFAULT '{}',
	"requires_enrollment" boolean DEFAULT true,
	"allowed_visa_types" text[],
	"description" text NOT NULL,
	"job_embedding" vector(1024),
	"scraped_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "user_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"storage_key" text NOT NULL,
	"file_type" text NOT NULL,
	"filename" text NOT NULL,
	"size_bytes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_job_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"job_id" text NOT NULL,
	"action" text NOT NULL,
	"match_score" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"visa_type" "visa_type" NOT NULL,
	"weekly_hours_limit" integer DEFAULT 20 NOT NULL,
	"days_remaining_this_year" integer,
	"semester_end" timestamp with time zone,
	"enrollment_status" text DEFAULT 'enrolled',
	"german_level" "german_level" DEFAULT 'B1',
	"location_preference" text DEFAULT 'Berlin',
	"min_hourly_rate" real,
	"preferred_fields" text[] DEFAULT '{}',
	"available_from" timestamp with time zone,
	"skills" text[] DEFAULT '{}',
	"experience_summary" text,
	"education_summary" text,
	"profile_embedding" vector(1024),
	"onboarding_complete" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_drafts" ADD CONSTRAINT "follow_up_drafts_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_documents" ADD CONSTRAINT "user_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_job_actions" ADD CONSTRAINT "user_job_actions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_job_actions" ADD CONSTRAINT "user_job_actions_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "applications_user_id_idx" ON "applications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "applications_status_idx" ON "applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "applications_generation_status_idx" ON "applications" USING btree ("generation_status");--> statement-breakpoint
CREATE INDEX "follow_up_drafts_application_id_idx" ON "follow_up_drafts" USING btree ("application_id");--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_external_id_source_idx" ON "jobs" USING btree ("external_id","source");--> statement-breakpoint
CREATE INDEX "jobs_contract_type_idx" ON "jobs" USING btree ("contract_type");--> statement-breakpoint
CREATE INDEX "jobs_is_active_idx" ON "jobs" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "jobs_embedding_idx" ON "jobs" USING hnsw ("job_embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "user_documents_user_id_idx" ON "user_documents" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_job_actions_user_job_idx" ON "user_job_actions" USING btree ("user_id","job_id");--> statement-breakpoint
CREATE INDEX "user_job_actions_user_id_idx" ON "user_job_actions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_profiles_user_id_idx" ON "user_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_profiles_embedding_idx" ON "user_profiles" USING hnsw ("profile_embedding" vector_cosine_ops);