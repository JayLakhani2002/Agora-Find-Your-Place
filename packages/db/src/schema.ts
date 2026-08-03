import { createId } from "@paralleldrive/cuid2"
import { relations, sql } from "drizzle-orm"
import {
  boolean,
  index,
  integer,
  json,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { vector } from "drizzle-orm/pg-core"
import {
  applicationStatusEnum,
  contractTypeEnum,
  documentTypeEnum,
  enrollmentStatusEnum,
  generationStatusEnum,
  germanLevelEnum,
  planTierEnum,
  subscriptionStatusEnum,
  swipeActionEnum,
  visaTypeEnum,
} from "./enums"

export * from "./enums"

// ── Users ─────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull(),
  // Billing (Agent 8) — only Stripe IDs + tier live here; Stripe holds card data.
  stripeCustomerId: text("stripe_customer_id").unique(),
  planTier: planTierEnum("plan_tier").default("free").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, { fields: [users.id], references: [userProfiles.userId] }),
  documents: many(userDocuments),
  jobActions: many(userJobActions),
  applications: many(applications),
  subscriptions: many(subscriptions),
  resumes: many(resumes),
}))

// ── User Profiles ─────────────────────────────────────────────────────────────

export const userProfiles = pgTable(
  "user_profiles",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Legal constraints
    visaType: visaTypeEnum("visa_type").notNull(),
    weeklyHoursLimit: integer("weekly_hours_limit").notNull().default(20),
    daysRemainingThisYear: integer("days_remaining_this_year"),
    semesterEnd: timestamp("semester_end", { withTimezone: true }),
    enrollmentStatus: enrollmentStatusEnum("enrollment_status").default("enrolled"),

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
    // Nullable until embedding pipeline runs; queries must filter IS NOT NULL
    profileEmbedding: vector("profile_embedding", { dimensions: 1024 }),

    onboardingComplete: boolean("onboarding_complete").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("user_profiles_user_id_idx").on(t.userId),
    // HNSW index only on non-NULL rows — queries must always add WHERE profileEmbedding IS NOT NULL
    index("user_profiles_embedding_idx").using("hnsw", t.profileEmbedding.op("vector_cosine_ops")),
  ],
)

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, { fields: [userProfiles.userId], references: [users.id] }),
}))

// ── User Documents ────────────────────────────────────────────────────────────
// Only the Scaleway storage key is stored — never raw CV content

export const userDocuments = pgTable(
  "user_documents",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    fileType: documentTypeEnum("file_type").notNull(),
    filename: text("filename").notNull(),
    sizeBytes: integer("size_bytes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("user_documents_user_id_idx").on(t.userId)],
)

export const userDocumentsRelations = relations(userDocuments, ({ one }) => ({
  user: one(users, { fields: [userDocuments.userId], references: [users.id] }),
}))

// ── Jobs ──────────────────────────────────────────────────────────────────────
// No RLS — jobs are public to all authenticated users

export const jobs = pgTable(
  "jobs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    externalId: text("external_id").notNull(),
    source: text("source").notNull(),
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
    // Stored as text[] to allow Agent 3 to write freeform values; Agent 5 casts to visaTypeEnum
    allowedVisaTypes: text("allowed_visa_types").array().$type<string[]>(),

    description: text("description").notNull(),
    // Nullable until embedding pipeline runs; queries must filter IS NOT NULL
    jobEmbedding: vector("job_embedding", { dimensions: 1024 }),

    scrapedAt: timestamp("scraped_at", { withTimezone: true }).defaultNow().notNull(),
    isActive: boolean("is_active").default(true),
  },
  (t) => [
    uniqueIndex("jobs_external_id_source_idx").on(t.externalId, t.source),
    index("jobs_contract_type_idx").on(t.contractType),
    index("jobs_is_active_idx").on(t.isActive),
    // HNSW index only on non-NULL rows — queries must always add WHERE jobEmbedding IS NOT NULL
    index("jobs_embedding_idx").using("hnsw", t.jobEmbedding.op("vector_cosine_ops")),
  ],
)

export const jobsRelations = relations(jobs, ({ many }) => ({
  userActions: many(userJobActions),
  applications: many(applications),
}))

// ── User Job Actions (Swipe Deck) ─────────────────────────────────────────────

export const userJobActions = pgTable(
  "user_job_actions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    action: swipeActionEnum("action").notNull(),
    matchScore: real("match_score"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("user_job_actions_user_job_idx").on(t.userId, t.jobId),
    index("user_job_actions_user_id_idx").on(t.userId),
  ],
)

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

export const applications = pgTable(
  "applications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // SET NULL on job delete — preserves application history even if job is removed
    jobId: text("job_id").references(() => jobs.id, { onDelete: "set null" }),

    status: applicationStatusEnum("status").default("generated").notNull(),
    generationStatus: generationStatusEnum("generation_status").default("pending").notNull(),

    cvStorageKey: text("cv_storage_key"),
    coverLetterStorageKey: text("cover_letter_storage_key"),

    evalScoreAts: real("eval_score_ats"),
    evalScoreKeywords: real("eval_score_keywords"),
    evalScoreFactual: real("eval_score_factual"),
    evalScoreFormat: real("eval_score_format"),
    evalScoreTone: real("eval_score_tone"),
    evalScoreLanguage: real("eval_score_language"),
    evalScoreOverall: real("eval_score_overall"),

    // DB-level default ensures [] even on raw SQL inserts
    auditLog: json("audit_log").$type<AuditEntry[]>().default(sql`'[]'::json`),

    userApprovedAt: timestamp("user_approved_at", { withTimezone: true }),
    userSubmittedAt: timestamp("user_submitted_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("applications_user_id_idx").on(t.userId),
    index("applications_status_idx").on(t.status),
    index("applications_generation_status_idx").on(t.generationStatus),
  ],
)

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  user: one(users, { fields: [applications.userId], references: [users.id] }),
  job: one(jobs, { fields: [applications.jobId], references: [jobs.id] }),
  followUpDrafts: many(followUpDrafts),
}))

// ── Follow-up Drafts ──────────────────────────────────────────────────────────

export const followUpDrafts = pgTable(
  "follow_up_drafts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    applicationId: text("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    // userId denormalised for direct RLS without subquery through applications
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    draftText: text("draft_text").notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (t) => [
    index("follow_up_drafts_application_id_idx").on(t.applicationId),
    index("follow_up_drafts_user_id_idx").on(t.userId),
  ],
)

export const followUpDraftsRelations = relations(followUpDrafts, ({ one }) => ({
  application: one(applications, {
    fields: [followUpDrafts.applicationId],
    references: [applications.id],
  }),
  user: one(users, { fields: [followUpDrafts.userId], references: [users.id] }),
}))

// ── Resumes (standalone builder — not tied to one application) ────────────────
//
// PII NOTE: unlike userProfiles ("structured summaries only") and userDocuments
// ("storage key only"), a resume the user is editing IS raw PII by definition —
// their name, phone, and address are the document. It is stored inline as jsonb
// because a resume is always read and written whole; nothing ever queries a
// single bullet point. Erasure is covered by the userId cascade below, and no
// object-storage key is involved, so gdpr.deleteAccount needs no change.

export type ResumeEntry = {
  id: string
  title: string
  organisation: string
  /** Always present; empty string when the user leaves it blank. */
  location: string
  startDate: string
  endDate: string | null
  current: boolean
  bullets: string[]
}

export type ResumeRatedItem = { id: string; name: string; level: string }

export type ResumeSection =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "languages"
  | "certificates"

export type ResumeContent = {
  contact: {
    firstName: string
    lastName: string
    jobTitle: string
    email: string
    phone: string
    location: string
    linkedinUrl: string
    portfolioUrl: string
  }
  summary: string
  experience: ResumeEntry[]
  education: ResumeEntry[]
  skills: ResumeRatedItem[]
  languages: ResumeRatedItem[]
  certificates: ResumeRatedItem[]
  /** Render order of the body sections. Unlisted sections are hidden. */
  sectionOrder: ResumeSection[]
  showSkillLevels: boolean
}

export const resumes = pgTable(
  "resumes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // SET NULL, not cascade: a resume tailored to a listing must survive that
    // listing being deprecated by the scraper.
    jobId: text("job_id").references(() => jobs.id, { onDelete: "set null" }),

    title: text("title").notNull(),
    template: text("template").default("harvard").notNull(),
    /** The one resume used as the starting point for new tailored versions. */
    isBase: boolean("is_base").default(false).notNull(),

    content: jsonb("content").$type<ResumeContent>().notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("resumes_user_id_idx").on(t.userId)],
)

export const resumesRelations = relations(resumes, ({ one }) => ({
  user: one(users, { fields: [resumes.userId], references: [users.id] }),
  job: one(jobs, { fields: [resumes.jobId], references: [jobs.id] }),
}))

// ── Subscriptions (Agent 8 — billing, dark until BSS funding) ─────────────────
// Synced exclusively by the Stripe webhook. Stripe is the source of truth;
// this table is a local mirror so entitlement checks never need a Stripe call.

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
    status: subscriptionStatusEnum("status").notNull(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("subscriptions_user_id_idx").on(t.userId)],
)

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
}))
