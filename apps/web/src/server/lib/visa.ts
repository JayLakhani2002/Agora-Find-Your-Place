/**
 * Weekly working-hours cap by visa type — drives ALL downstream eligibility
 * filtering, so it is legal-critical and unit-tested. Default is the conservative
 * 20 h/week student cap for any unknown type.
 */
export const WEEKLY_HOURS_LIMIT: Record<string, number> = {
  student_visa_16b: 20,
  chancenkarte_20a: 20,
  near_graduation: 20,
  eu_citizen: 40,
  blue_card: 40,
}

export function weeklyHoursForVisa(visaType: string): number {
  return WEEKLY_HOURS_LIMIT[visaType] ?? 20
}
