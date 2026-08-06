import { randomUUID } from "node:crypto"
import { UPLOADS_PER_HOUR, consume } from "@/server/lib/rate-limit"
import { uploadBuffer } from "@agora/ai"
import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

export const runtime = "nodejs"
// 10 MB limit — PDFs are rarely larger
export const maxDuration = 30

const MAX_BYTES = 10 * 1024 * 1024

/**
 * Every PDF begins with the 5 bytes `%PDF-`. `file.type` is only the Content-Type the
 * *client* wrote into the multipart part — an attacker sets it to anything, so on its own
 * it validates nothing. Checking the real leading bytes is what stops this endpoint being
 * a free general-purpose blob store on our object-storage bill, and stops the worker's
 * `unpdf` parser being handed something that is not a PDF at all.
 */
const PDF_MAGIC = Buffer.from("%PDF-", "ascii")

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 10 MB apiece into paid object storage with no billing gate in front of it.
  // Fails closed: if Redis is down we would rather refuse uploads than eat the storage.
  const verdict = await consume(UPLOADS_PER_HOUR, userId)
  if (!verdict.allowed) {
    return NextResponse.json(
      { error: "Too many uploads. Try again later." },
      { status: 429, headers: { "Retry-After": String(verdict.retryAfterSeconds) } },
    )
  }

  const formData = await req.formData()
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  // Re-check the size against the real buffer: file.size is client-reported metadata.
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 400 })
  }
  if (!buffer.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) {
    return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 })
  }

  // The object key is built entirely from server-controlled values. It previously ended
  // in `-${file.name}`, which put an attacker-chosen string (`../`, control characters,
  // 4 KB of junk) into a storage path. The original filename is still returned to the
  // client for display and stored in the DB column built for it — it just has no say in
  // where the bytes land.
  const key = `cv/${userId}/${randomUUID()}.pdf`
  await uploadBuffer(key, buffer, "application/pdf")

  return NextResponse.json({ key, filename: file.name, sizeBytes: buffer.byteLength })
}
