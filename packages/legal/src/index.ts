// @agora/legal — Agent 5's pure-TS employment constraint engine.
// Deterministic, zero runtime dependencies, no AI, no DB.

export {
  type ContractType,
  type EnrollmentStatus,
  type LegalConstraints,
  type VisaType,
  allowedContractTypesFor,
  DEFAULT_MINIJOB_HOURS_PER_WEEK,
  maxWeeklyHoursFor,
  MINIJOB_MONTHLY_CEILING_EUR,
  VISA_CONSTRAINTS,
  WEEKS_PER_MONTH,
} from "./constraints"
export {
  type EligibilityJob,
  type EligibilityResult,
  type EligibilityUserState,
  type FailedCheck,
  checkEligibility,
} from "./eligibility"
export { type GermanLevel, germanLevelSatisfies } from "./german"
