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
