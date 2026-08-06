DROP INDEX "user_profiles_user_id_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "applications_user_id_job_id_idx" ON "applications" USING btree ("user_id","job_id");--> statement-breakpoint
CREATE INDEX "jobs_is_active_scraped_at_idx" ON "jobs" USING btree ("is_active","scraped_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "jobs_source_scraped_at_idx" ON "jobs" USING btree ("source","scraped_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_profiles_user_id_idx" ON "user_profiles" USING btree ("user_id");