import { Queue } from "bullmq"
import { Redis } from "ioredis"

// Lazy singleton — not created at import time (Agent 1 safety rule)
let _connection: Redis | undefined

export function getConnection(): Redis {
  if (_connection) return _connection
  const url = process.env.REDIS_URL
  if (!url) throw new Error("REDIS_URL is not set")
  _connection = new Redis(url, {
    maxRetriesPerRequest: null,
    ...(url.startsWith("rediss://") ? { tls: {} } : {}),
  })
  return _connection
}

// Convenience export used by workers — resolves lazily on first access
export const connection = new Proxy({} as Redis, {
  get(_, prop) {
    return (getConnection() as any)[prop]
  },
})

// Agent 3: export const scraperQueue = new Queue("job-scraper", { connection: getConnection() })
// Agent 4: export const profileQueue = new Queue("profile-extract", { connection: getConnection() })
// Agent 6: export const generationQueue = new Queue("ai-generation", { connection: getConnection() })
// Agent 6: export const followUpQueue = new Queue("follow-up", { connection: getConnection() })
