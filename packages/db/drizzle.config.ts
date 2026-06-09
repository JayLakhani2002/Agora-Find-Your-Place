import { config } from "dotenv"
import { resolve } from "path"
import type { Config } from "drizzle-kit"

// Load .env.local from repo root (drizzle-kit does not auto-load it)
config({ path: resolve(__dirname, "../../.env.local") })

const url = process.env.DATABASE_URL
if (!url) throw new Error("DATABASE_URL is not set — check .env.local")

export default {
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
} satisfies Config
