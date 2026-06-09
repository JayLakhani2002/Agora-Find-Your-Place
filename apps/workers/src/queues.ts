import { Queue } from "bullmq"
import { Redis } from "ioredis"

const redisUrl = process.env.REDIS_URL
if (!redisUrl) throw new Error("REDIS_URL is not set")

// maxRetriesPerRequest: null is REQUIRED by BullMQ — without it the client throws on queue ops
// tls: {} is required when using rediss:// (TLS) — ioredis does not auto-inject it when an options object is provided
export const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  ...(redisUrl.startsWith("rediss://") ? { tls: {} } : {}),
})

// Agent 3: export const scraperQueue = new Queue("job-scraper", { connection })
// Agent 4: export const profileQueue = new Queue("profile-extract", { connection })
// Agent 6: export const generationQueue = new Queue("ai-generation", { connection })
// Agent 6: export const followUpQueue = new Queue("follow-up", { connection })
