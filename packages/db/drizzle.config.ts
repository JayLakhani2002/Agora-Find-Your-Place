import { config } from "dotenv"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"
import type { Config } from "drizzle-kit"

// Works in both CJS (__dirname) and ESM (import.meta.url)
const dir = typeof __dirname !== "undefined"
  ? __dirname
  : dirname(fileURLToPath(import.meta.url))

config({ path: resolve(dir, "../../.env.local") })

const url = process.env.DATABASE_URL
if (!url) throw new Error("DATABASE_URL is not set — check .env.local")

export default {
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
} satisfies Config
