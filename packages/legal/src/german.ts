// CEFR German-level ordering — pure helper used for the per-card "german"
// eligibility tick. Not a hard legal filter: a missing requirement passes.

export type GermanLevel = "none" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "native"

const LEVEL_ORDER: Record<GermanLevel, number> = {
  none: 0,
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 6,
  native: 7,
}

/**
 * Does the user's German level satisfy the job's requirement?
 * A job with no stated requirement (null) is satisfied by any level.
 * A user with no stated level is treated as "none".
 */
export function germanLevelSatisfies(
  userLevel: GermanLevel | null | undefined,
  required: GermanLevel | null | undefined,
): boolean {
  if (required == null) return true
  return LEVEL_ORDER[userLevel ?? "none"] >= LEVEL_ORDER[required]
}
