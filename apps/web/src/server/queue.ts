import { Queue } from "bullmq"
import { Redis } from "ioredis"

// Producer-side queue access for the web app. Lazy singletons — never construct at
// module scope (Agent 1 safety rule). The worker (apps/workers) consumes these.
let _connection: Redis | undefined
function getConnection(): Redis {
  if (_connection) return _connection
  const url = process.env.REDIS_URL
  if (!url) throw new Error("REDIS_URL is not set")
  _connection = new Redis(url, {
    maxRetriesPerRequest: null,
    ...(url.startsWith("rediss://") ? { tls: {} } : {}),
  })
  return _connection
}

let _profileQueue: Queue | undefined
export function getProfileQueue(): Queue {
  if (!_profileQueue) _profileQueue = new Queue("profile-extract", { connection: getConnection() })
  return _profileQueue
}

// Agent 6 — generation + follow-up producers (consumed by apps/workers)
let _generationQueue: Queue | undefined
export function getGenerationQueue(): Queue {
  if (!_generationQueue)
    _generationQueue = new Queue("ai-generation", { connection: getConnection() })
  return _generationQueue
}

let _followUpQueue: Queue | undefined
export function getFollowUpQueue(): Queue {
  if (!_followUpQueue) _followUpQueue = new Queue("follow-up", { connection: getConnection() })
  return _followUpQueue
}

/** Shared Redis for small caches (role questions). Same lazy connection. */
export function getQueueRedis(): Redis {
  return getConnection()
}
