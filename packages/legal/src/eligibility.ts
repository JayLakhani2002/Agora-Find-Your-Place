// checkEligibility — the hard filter logic, evaluated per (user, job) pair.
// Pure TypeScript, deterministic, no AI. reasons[] are human-readable (shown in
// the UI); failedChecks[] are stable machine IDs used in tests and telemetry.

import {
  type ContractType,
  DEFAULT_MINIJOB_HOURS_PER_WEEK,
  type EnrollmentStatus,
  MINIJOB_MONTHLY_CEILING_EUR,
  VISA_CONSTRAINTS,
  type VisaType,
  WEEKS_PER_MONTH,
} from "./constraints"

export type FailedCheck =
  | "CONTRACT_TYPE_NOT_ALLOWED"
  | "HOURS_EXCEED_LIMIT"
  | "ANNUAL_DAY_LIMIT_EXHAUSTED"
  | "ENROLLMENT_REQUIRED"
  | "MINIJOB_CEILING_EXCEEDED"

export type EligibilityJob = {
  contractType: ContractType
  hoursPerWeek: number | null
  hourlyRate: number | null
}

export type EligibilityUserState = {
  daysRemainingThisYear: number | null
  enrollmentStatus?: EnrollmentStatus | null
}

export type EligibilityResult = {
  eligible: boolean
  reasons: string[]
  failedChecks: FailedCheck[]
}

const CONTRACT_LABELS: Record<ContractType, string> = {
  werkstudent: "Werkstudent",
  minijob: "Minijob",
  vollzeit: "full-time (Vollzeit)",
  teilzeit: "part-time (Teilzeit)",
  praktikum: "internship (Praktikum)",
  freelance: "freelance",
}

const VISA_LABELS: Record<VisaType, string> = {
  student_visa_16b: "a student visa (§16b)",
  chancenkarte_20a: "a Chancenkarte (§20a)",
  eu_citizen: "EU citizenship",
  blue_card: "an EU Blue Card",
  near_graduation: "a transitional student permit",
}

/** Statuses that do NOT satisfy an enrollment requirement. */
const NOT_ENROLLED: readonly EnrollmentStatus[] = ["graduated", "leave_of_absence"]

export function checkEligibility(
  visaType: VisaType,
  job: EligibilityJob,
  userState: EligibilityUserState,
): EligibilityResult {
  const constraints = VISA_CONSTRAINTS[visaType]
  const reasons: string[] = []
  const failedChecks: FailedCheck[] = []

  // Check 1: contract type permitted for this visa
  if (!constraints.allowedContractTypes.includes(job.contractType)) {
    failedChecks.push("CONTRACT_TYPE_NOT_ALLOWED")
    reasons.push(
      `${CONTRACT_LABELS[job.contractType]} contracts are not permitted with ${VISA_LABELS[visaType]}`,
    )
  }

  // Check 2: weekly hours cap. Jobs with unknown hours pass here — the worst
  // legal exposure is bounded by the contract-type check above, and the UI
  // shows hours as unverified via the per-card ticks.
  if (job.hoursPerWeek !== null && job.hoursPerWeek > constraints.maxWeeklyHours) {
    failedChecks.push("HOURS_EXCEED_LIMIT")
    reasons.push(
      `${job.hoursPerWeek} h/week exceeds the ${constraints.maxWeeklyHours} h/week limit for ${VISA_LABELS[visaType]}`,
    )
  }

  // Check 3: annual 140-day allowance (§16b / near_graduation only)
  if (
    constraints.annualDayLimit !== null &&
    userState.daysRemainingThisYear !== null &&
    userState.daysRemainingThisYear <= 0
  ) {
    failedChecks.push("ANNUAL_DAY_LIMIT_EXHAUSTED")
    reasons.push(
      `The annual ${constraints.annualDayLimit}-day working allowance is exhausted for this year`,
    )
  }

  // Check 4: enrollment requirement. Only fails on an explicit not-enrolled
  // status — a missing status is treated as enrolled (it was asserted at
  // onboarding when the user selected a student visa type).
  if (
    constraints.requiresEnrollment &&
    userState.enrollmentStatus != null &&
    NOT_ENROLLED.includes(userState.enrollmentStatus)
  ) {
    failedChecks.push("ENROLLMENT_REQUIRED")
    reasons.push(`${VISA_LABELS[visaType]} requires active university enrollment`)
  }

  // Check 5: Minijob €556/month earnings ceiling
  if (job.contractType === "minijob" && job.hourlyRate !== null) {
    const estimatedMonthly =
      job.hourlyRate * (job.hoursPerWeek ?? DEFAULT_MINIJOB_HOURS_PER_WEEK) * WEEKS_PER_MONTH
    if (estimatedMonthly > MINIJOB_MONTHLY_CEILING_EUR) {
      failedChecks.push("MINIJOB_CEILING_EXCEEDED")
      reasons.push(
        `Estimated €${estimatedMonthly.toFixed(0)}/month exceeds the €${MINIJOB_MONTHLY_CEILING_EUR} Minijob ceiling`,
      )
    }
  }

  return { eligible: failedChecks.length === 0, reasons, failedChecks }
}
