// Waitlist provider — webhook-or-log. The honest simplest option:
// - WAITLIST_WEBHOOK_URL set → forward the signup (Zapier/Make/Sheet endpoint).
// - Unset → log loudly and tell the caller it wasn't persisted. We never silently
//   pretend to store emails (in-memory loses data on serverless; lambda FS is read-only).

export type WaitlistResult = { ok: boolean; stored: boolean }

export async function saveWaitlistEmail(email: string): Promise<WaitlistResult> {
  const url = process.env.WAITLIST_WEBHOOK_URL
  if (!url) {
    console.warn("[waitlist] WAITLIST_WEBHOOK_URL not configured — email NOT persisted:", email)
    return { ok: true, stored: false }
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, ts: new Date().toISOString(), source: "agora-website" }),
  })
  if (!res.ok) {
    console.error("[waitlist] webhook responded", res.status)
    return { ok: false, stored: false }
  }
  return { ok: true, stored: true }
}
