import {
  pgTable,
  text,
  timestamp,
  integer,
  real,
  boolean,
  json,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { vector } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import {
  visaTypeEnum,
  germanLevelEnum,
  contractTypeEnum,
  applicationStatusEnum,
  generationStatusEnum,
} from "./enums"

export * from "./enums"

// ── Users ─────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, { fields: [users.id], references: [userProfiles.userId] }),
  documents: many(userDocuments),
  jobActions: many(userJobActions),
  applications: many(applications),
}))

// ── User Profiles ─────────────────────────────────────────────────────────────

export const userProfiles = pgTable("user_profiles", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  // Legal constraints
  visaType: visaTypeEnum("visa_type").notNull(),
  weeklyHoursLimit: integer("weekly_hours_limit").notNull().default(20),
  daysRemainingThisYear: integer("days_remaining_this_year"),
  semesterEnd: timestamp("semester_end", { withTimezone: true }),
  enrollmentStatus: text("enrollment_status").default("enrolled"),

  // Professional profile
  germanLevel: germanLevelEnum("german_level").default("B1"),
  locationPreference: text("location_preference").default("Berlin"),
  minHourlyRate: real("min_hourly_rate"),
  preferredFields: text("preferred_fields").array().default([]),
  availableFrom: timestamp("available_from", { withTimezone: true }),

  // CV data — structured summaries only, never raw PII
  skills: text("skills").array().default([]),
  experienceSummary: text("experience_summary"),
  educationSummary: text("education_summary"),
  profileEmbedding: vector("profile_embedding", { dimensions: 1024 }),

  onboardingComplete: boolean("onboarding_complete").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("user_profiles_user_id_idx").on(t.userId),
  index("user_profiles_embedding_idx").using("hnsw", t.profileEmbedding.op("vector_cosine_ops")),
])

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, { fields: [userProfiles.userId], references: [users.id] }),
}))

// ── User Documents ────────────────────────────────────────────────────────────
// Only the Scaleway storage key is stored — never raw CV content

export const userDocuments = pgTable("user_documents", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull(),
  fileType: text("file_type").notNull(), // "cv_upload" | "generated_cv" | "generated_cl"
  filename: text("filename").notNull(),
  sizeBytes: integer("size_bytes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("user_documents_user_id_idx").on(t.userId),
])

export const userDocumentsRelations = relations(userDocuments, ({ one }) => ({
  user: one(users, { fields: [userDocuments.userId], references: [users.id] }),
}))

// ── Jobs ──────────────────────────────────────────────────────────────────────
// No RLS — jobs are public to all authenticated users

export const jobs = pgTable("jobs", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  externalId: text("external_id").notNull(),
  source: text("source").notNull(), // "stellenticket" | "berlinstartupjobs" etc.
  sourceUrl: text("source_url").notNull(),

  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location").notNull(),
  contractType: contractTypeEnum("contract_type").notNull(),
  hourlyRate: real("hourly_rate"),
  hoursPerWeek: integer("hours_per_week"),
  germanLevelRequired: germanLevelEnum("german_level_required"),
  requiredSkills: text("required_skills").array().default([]),

  // Legal filter fields — pre-computed at scrape time by Agent 3
  requiresEnrollment: boolean("requires_enrollment").default(true),
  allowedVisaTypes: text("allowed_visa_types").array().$type<string[]>(),

  description: text("description").notNull(),
  jobEmbedding: vector("job_embedding", { dimensions: 1024 }),

  scrapedAt: timestamp("scraped_at", { withTimezone: true }).defaultNow().notNull(),
  isActive: boolean("is_active").default(true),
}, (t) => [
  uniqueIndex("jobs_external_id_source_idx").on(t.externalId, t.source),
  index("jobs_contract_type_idx").on(t.contractType),
  index("jobs_is_active_idx").on(t.isActive),
  index("jobs_embedding_idx").using("hnsw", t.jobEmbedding.op("vector_cosine_ops")),
])

export const jobsRelations = relations(jobs, ({ many }) => ({
  userActions: many(userJobActions),
  applications: many(applications),
}))

// ── User Job Actions (Swipe Deck) ─────────────────────────────────────────────

export const userJobActions = pgTable("user_job_actions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // "right" | "left" | "save"
  matchScore: real("match_score"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex("user_job_actions_user_job_idx").on(t.userId, t.jobId),
  index("user_job_actions_user_id_idx").on(t.userId),
])

export const userJobActionsRelations = relations(userJobActions, ({ one }) => ({
  user: one(users, { fields: [userJobActions.userId], references: [users.id] }),
  job: one(jobs, { fields: [userJobActions.jobId], references: [jobs.id] }),
}))

// ── Applications ──────────────────────────────────────────────────────────────

export type AuditEntry = {
  timestamp: string
  action: string
  actor: "user" | "system"
  detail?: string
}

export const applications = pgTable("applications", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobId: text("job_id").notNull().references(() => jobs.id),

  status: applicationStatusEnum("status").default("generated").notNull(),
  generationStatus: generationStatusEnum("generation_status").default("pending").notNull(),

  // Generated document storage keys (Scaleway S3)
  cvStorageKey: text("cv_storage_key"),
  coverLetterStorageKey: text("cover_letter_storage_key"),

  // Quality eval scores — stored as JSON-queryable reals, not text
  evalScoreAts: real("eval_score_ats"),
  evalScoreKeywords: real("eval_score_keywords"),
  evalScoreFactual: real("eval_score_factual"),
  evalScoreFormat: real("eval_score_format"),
  evalScoreTone: real("eval_score_tone"),
  evalScoreLanguage: real("eval_score_language"),
  evalScoreOverall: real("eval_score_overall"),

  // Append-only audit trail — JSON so it stays queryable (eval data is the moat)
  auditLog: json("audit_log").$type<AuditEntry[]>().default([]),

  userApprovedAt: timestamp("user_approved_at", { withTimezone: true }),
  userSubmittedAt: timestamp("user_submitted_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("applications_user_id_idx").on(t.userId),
  index("applications_status_idx").on(t.status),
  index("applications_generation_status_idx").on(t.generationStatus),
])

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  user: one(users, { fields: [applications.userId], references: [users.id] }),
  job: one(jobs, { fields: [applications.jobId], references: [jobs.id] }),
  followUpDrafts: many(followUpDrafts),
}))

// ── Follow-up Drafts ──────────────────────────────────────────────────────────

export const followUpDrafts = pgTable("follow_up_drafts", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  applicationId: text("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  draftText: text("draft_text").notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
}, (t) => [
  index("follow_up_drafts_application_id_idx").on(t.applicationId),
])

export const followUpDraftsRelations = relations(followUpDrafts, ({ one }) => ({
  application: one(applications, { fields: [followUpDrafts.applicationId], references: [applications.id] }),
}))
