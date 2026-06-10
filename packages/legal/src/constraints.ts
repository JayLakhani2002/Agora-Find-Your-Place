// Visa → employment constraint table.
// Pure TypeScript, deterministic, zero dependencies, no AI, no DB.
// This table is the single source of truth for what each visa type permits —
// the SQL hard filter (packages/db/src/queries/matching.ts) and the per-card
// eligibility checks both derive from it. Full spec:
// Business Planning/Prototype/04-Phase-2-Job-Ingestion.md §4.

export type VisaType =
  | "student_visa_16b"
  | "chancenkarte_20a"
  | "eu_citizen"
  | "blue_card"
  | "near_graduation"

export type ContractType =
  | "werkstudent"
  | "minijob"
  | "vollzeit"
  | "teilzeit"
  | "praktikum"
  | "freelance"

export type EnrollmentStatus = "enrolled" | "near_graduation" | "graduated" | "leave_of_absence"

export type LegalConstraints = {
  maxWeeklyHours: number
  maxDailyHours: number
  /** null = no annual day limit */
  annualDayLimit: number | null
  requiresEnrollment: boolean
  allowedContractTypes: readonly ContractType[]
  minijobAllowed: boolean
}

/** §16b/§20a Minijob earnings ceiling (EUR per month, 2025 figure). */
export const MINIJOB_MONTHLY_CEILING_EUR = 556

/** Average weeks per month used to estimate monthly earnings from an hourly rate. */
export const WEEKS_PER_MONTH = 4.3

/** Assumed hours/week for Minijob earnings estimation when a job omits hours. */
export const DEFAULT_MINIJOB_HOURS_PER_WEEK = 10

export const VISA_CONSTRAINTS: Record<VisaType, LegalConstraints> = {
  // §16b student visa: 20 h/week during term, 140 full days (or 280 half days)
  // per year, must be enrolled. Minijob allowed within the €556/month ceiling.
  student_visa_16b: {
    maxWeeklyHours: 20,
    maxDailyHours: 8,
    annualDayLimit: 140,
    requiresEnrollment: true,
    allowedContractTypes: ["werkstudent", "minijob", "praktikum"],
    minijobAllowed: true,
  },
  // §20a Chancenkarte: 20 h/week while job-seeking, no annual day limit,
  // no enrollment requirement.
  chancenkarte_20a: {
    maxWeeklyHours: 20,
    maxDailyHours: 8,
    annualDayLimit: null,
    requiresEnrollment: false,
    allowedContractTypes: ["werkstudent", "minijob", "teilzeit"],
    minijobAllowed: true,
  },
  // EU citizens: full labour-market access.
  eu_citizen: {
    maxWeeklyHours: 40,
    maxDailyHours: 8,
    annualDayLimit: null,
    requiresEnrollment: false,
    allowedContractTypes: [
      "werkstudent",
      "minijob",
      "vollzeit",
      "teilzeit",
      "praktikum",
      "freelance",
    ],
    minijobAllowed: true,
  },
  // EU Blue Card: skilled-worker permit tied to qualified employment; no Minijob.
  blue_card: {
    maxWeeklyHours: 40,
    maxDailyHours: 8,
    annualDayLimit: null,
    requiresEnrollment: false,
    allowedContractTypes: ["werkstudent", "vollzeit", "teilzeit"],
    minijobAllowed: false,
  },
  // Transitional §16b→§18b (job-seeking after graduation): student limits apply
  // until the residence permit is converted.
  near_graduation: {
    maxWeeklyHours: 20,
    maxDailyHours: 8,
    annualDayLimit: 140,
    requiresEnrollment: true,
    allowedContractTypes: ["werkstudent", "minijob", "praktikum"],
    minijobAllowed: true,
  },
}

/** Contract types the SQL hard filter may return for a visa type. */
export function allowedContractTypesFor(visaType: VisaType): readonly ContractType[] {
  return VISA_CONSTRAINTS[visaType].allowedContractTypes
}

/** Weekly hours cap the SQL hard filter must enforce for a visa type. */
export function maxWeeklyHoursFor(visaType: VisaType): number {
  return VISA_CONSTRAINTS[visaType].maxWeeklyHours
}
