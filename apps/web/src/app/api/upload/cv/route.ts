import { randomUUID } from "node:crypto"
import { uploadBuffer } from "@agora/ai"
import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

export const runtime = "nodejs"
// 10 MB limit — PDFs are rarely larger
export const maxDuration = 30

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 })
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 400 })
  }

  const key = `cv/${userId}/${randomUUID()}-${file.name}`
  const buffer = Buffer.from(await file.arrayBuffer())
  await uploadBuffer(key, buffer, "application/pdf")

  return NextResponse.json({ key, filename: file.name, sizeBytes: file.size })
}
