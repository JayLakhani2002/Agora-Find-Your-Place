import { pgEnum } from "drizzle-orm/pg-core"

export const visaTypeEnum = pgEnum("visa_type", [
  "student_visa_16b",
  "eu_citizen",
  "chancenkarte_20a",
  "blue_card",
  "near_graduation",
])

export const germanLevelEnum = pgEnum("german_level", [
  "none",
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
  "native",
])

export const contractTypeEnum = pgEnum("contract_type", [
  "werkstudent",
  "minijob",
  "vollzeit",
  "teilzeit",
  "praktikum",
  "freelance",
])

export const applicationStatusEnum = pgEnum("application_status", [
  "generated",
  "approved",
  "submitted",
  "rejected",
  "interview_invited",
  "offer_received",
  "withdrawn",
])

export const generationStatusEnum = pgEnum("generation_status", [
  "pending",
  "processing",
  "complete",
  "failed",
])

export const swipeActionEnum = pgEnum("swipe_action", ["right", "left", "save"])

export const documentTypeEnum = pgEnum("document_type", [
  "cv_upload",
  "generated_cv",
  "generated_cl",
])

export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "enrolled",
  "near_graduation",
  "graduated",
  "leave_of_absence",
])

// ── Billing (Agent 8 — dark until BSS funding; BILLING_ENABLED gates all paid paths) ──

export const planTierEnum = pgEnum("plan_tier", ["free", "pro"])

// Mirrors Stripe subscription statuses we act on; synced by the Stripe webhook.
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
  "paused",
])
