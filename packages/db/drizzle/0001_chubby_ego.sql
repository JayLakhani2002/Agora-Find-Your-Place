CREATE TYPE "public"."document_type" AS ENUM('cv_upload', 'generated_cv', 'generated_cl');--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('enrolled', 'near_graduation', 'graduated', 'leave_of_absence');--> statement-breakpoint
CREATE TYPE "public"."swipe_action" AS ENUM('right', 'left', 'save');--> statement-breakpoint
ALTER TABLE "applications" DROP CONSTRAINT "applications_job_id_jobs_id_fk";
--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "job_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_documents" ALTER COLUMN "file_type" SET DATA TYPE document_type USING file_type::document_type;--> statement-breakpoint
ALTER TABLE "user_job_actions" ALTER COLUMN "action" SET DATA TYPE swipe_action USING action::swipe_action;--> statement-breakpoint
ALTER TABLE "user_profiles" ALTER COLUMN "enrollment_status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "user_profiles" ALTER COLUMN "enrollment_status" SET DATA TYPE enrollment_status USING enrollment_status::enrollment_status;--> statement-breakpoint
ALTER TABLE "user_profiles" ALTER COLUMN "enrollment_status" SET DEFAULT 'enrolled';--> statement-breakpoint
ALTER TABLE "follow_up_drafts" ADD COLUMN "user_id" text DEFAULT '';--> statement-breakpoint
UPDATE "follow_up_drafts" SET "user_id" = (SELECT "user_id" FROM "applications" WHERE "applications"."id" = "follow_up_drafts"."application_id") WHERE "user_id" = '';--> statement-breakpoint
ALTER TABLE "follow_up_drafts" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "follow_up_drafts" ALTER COLUMN "user_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_drafts" ADD CONSTRAINT "follow_up_drafts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "follow_up_drafts_user_id_idx" ON "follow_up_drafts" USING btree ("user_id");
