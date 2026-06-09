import { Queue } from "bullmq"
import { Redis } from "ioredis"

// maxRetriesPerRequest: null is REQUIRED by BullMQ — without it the client throws on queue ops
export const connection = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null })

// Agent 3: export const scraperQueue = new Queue("job-scraper", { connection })
// Agent 4: export const profileQueue = new Queue("profile-extract", { connection })
// Agent 6: export const generationQueue = new Queue("ai-generation", { connection })
// Agent 6: export const followUpQueue = new Queue("follow-up", { connection })
