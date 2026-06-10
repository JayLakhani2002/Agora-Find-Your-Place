import { getDb, users } from "@agora/db"
import { eq, sql } from "drizzle-orm"
import type { NextRequest } from "next/server"
import { Webhook } from "svix"

/**
 * Clerk → DB user sync. Verifies the Standard-Webhooks signature with svix and the
 * CLERK_WEBHOOK_SIGNING_SECRET. Public route (see middleware).
 *
 * NOTE: @clerk/nextjs is pinned at 6.12.12, which predates the built-in
 * `verifyWebhook` helper. svix is exactly what that helper wraps internally, so this
 * is equivalent. When Clerk is upgraded, swap to `verifyWebhook` from
 * `@clerk/nextjs/webhooks` (per spec) and drop the svix dependency.
 *
 *  - user.created → insert user row (idempotent)
 *  - user.deleted → cascade-delete the user (FKs remove profile/docs/apps/etc.)
 */

type ClerkUserEvent = {
  type: string
  data: { id?: string; email_addresses?: { email_address: string }[] }
}

export async function POST(req: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET
  if (!secret) {
    console.error("CLERK_WEBHOOK_SIGNING_SECRET is not set")
    return new Response("Server not configured", { status: 500 })
  }

  const svixId = req.headers.get("svix-id")
  const svixTimestamp = req.headers.get("svix-timestamp")
  const svixSignature = req.headers.get("svix-signature")
  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 })
  }

  // Verify against the RAW body — parsing first would break the signature.
  const payload = await req.text()

  let evt: ClerkUserEvent
  try {
    evt = new Webhook(secret).verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkUserEvent
  } catch (err) {
    console.error("Clerk webhook verification failed:", err)
    return new Response("Error verifying webhook", { status: 400 })
  }

  try {
    const db = getDb()
    if ((evt.type === "user.created" || evt.type === "user.updated") && evt.data.id) {
      const email = evt.data.email_addresses?.[0]?.email_address ?? ""
      // Upsert (not DoNothing): JIT provisioning may have created the row with an
      // empty email — backfill the real address on conflict. Don't overwrite with "".
      await db
        .insert(users)
        .values({ clerkId: evt.data.id, email })
        .onConflictDoUpdate({
          target: users.clerkId,
          set: {
            email: sql`coalesce(nullif(excluded.email, ''), ${users.email})`,
            updatedAt: new Date(),
          },
        })
    } else if (evt.type === "user.deleted" && evt.data.id) {
      await db.delete(users).where(eq(users.clerkId, evt.data.id))
    }
    return new Response("Webhook received", { status: 200 })
  } catch (err) {
    console.error("Clerk webhook DB sync failed:", err)
    return new Response("Error processing webhook", { status: 500 })
  }
}
