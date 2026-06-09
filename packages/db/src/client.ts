import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import * as schema from "./schema"

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>

// Lazy singleton — not initialised at import time (Agent 1 safety rule)
let _db: DrizzleDb | undefined

export function getDb(): DrizzleDb {
  if (_db) return _db
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL is not set")
  _db = drizzle(neon(url), { schema })
  return _db
}

// Re-exported for convenience — callers that call getDb() in their context factory
// get full type inference without module-level side effects
export type DB = DrizzleDb
