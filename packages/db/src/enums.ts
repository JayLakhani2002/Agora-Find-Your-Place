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
