/**
 * Collect every storage key to erase for a GDPR account deletion: uploaded CVs plus
 * generated CV/cover-letter keys on applications. Filters out nulls so a missing key
 * never produces an `undefined` delete. Pure + unit-tested — the erasure path must
 * never silently skip a user's files.
 */
export function collectErasureKeys(
  docs: { key: string | null }[],
  apps: { cv: string | null; cl: string | null }[],
): string[] {
  return [...docs.map((d) => d.key), ...apps.flatMap((a) => [a.cv, a.cl])].filter(
    (k): k is string => !!k,
  )
}
