import { saveWaitlistEmail } from "@/lib/waitlist"
import { NextResponse } from "next/server"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function POST(req: Request) {
  let email: unknown
  try {
    ;({ email } = await req.json())
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 })
  }

  if (typeof email !== "string" || email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 })
  }

  const result = await saveWaitlistEmail(email.trim().toLowerCase())
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: "provider_error" }, { status: 502 })
  }
  return NextResponse.json({ ok: true })
}
