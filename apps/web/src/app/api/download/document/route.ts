import { getObjectBuffer } from "@agora/ai"
import { getDb } from "@agora/db"
import { applications, users } from "@agora/db/schema"
import { auth } from "@clerk/nextjs/server"
import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 30

/**
 * Proxy: fetches a generated document from Scaleway S3 server-side so the
 * browser never makes a cross-origin request to the bucket.
 *
 * GET /api/download/document?key=applications/{id}/cv-v1.md&applicationId={id}
 *
 * Ownership check: the signed-in user must own the application that owns the key.
 */
export async function GET(req: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const key = searchParams.get("key")
  const applicationId = searchParams.get("applicationId")
  if (!key || !applicationId) {
    return NextResponse.json({ error: "key and applicationId required" }, { status: 400 })
  }

  const db = getDb()
  const row = await db
    .select({ cvKey: applications.cvStorageKey, clKey: applications.coverLetterStorageKey })
    .from(applications)
    .innerJoin(users, eq(users.id, applications.userId))
    .where(and(eq(applications.id, applicationId), eq(users.clerkId, clerkId)))
    .limit(1)
    .then((r) => r[0])

  if (!row) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  if (key !== row.cvKey && key !== row.clKey) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const buffer = await getObjectBuffer(key)
  return new Response(buffer, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      // `private, max-age=300` let the browser (and any intermediary honouring it) keep
      // a generated CV on disk for 5 minutes past sign-out, and survive GDPR erasure.
      // These documents are the most sensitive bytes we serve — never store them.
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      // The body is model-generated text. Without nosniff a browser may sniff it as
      // HTML and execute anything the generator was talked into emitting.
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "attachment",
    },
  })
}
