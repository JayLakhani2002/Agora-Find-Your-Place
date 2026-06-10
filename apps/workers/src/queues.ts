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

// Agent 3 — scrape + embed pipeline
let _scraperQueue: Queue | undefined
export function getScraperQueue(): Queue {
  if (!_scraperQueue) _scraperQueue = new Queue("job-scraper", { connection: getConnection() })
  return _scraperQueue
}

let _embeddingQueue: Queue | undefined
export function getEmbeddingQueue(): Queue {
  if (!_embeddingQueue)
    _embeddingQueue = new Queue("job-embedding", { connection: getConnection() })
  return _embeddingQueue
}

// Agent 4 — CV → profile extraction
let _profileQueue: Queue | undefined
export function getProfileQueue(): Queue {
  if (!_profileQueue) _profileQueue = new Queue("profile-extract", { connection: getConnection() })
  return _profileQueue
}

// Agent 6: export const generationQueue = new Queue("ai-generation", { connection: getConnection() })
// Agent 6: export const followUpQueue = new Queue("follow-up", { connection: getConnection() })
