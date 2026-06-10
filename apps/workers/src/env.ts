import { resolve } from "node:path"
import { config } from "dotenv"

// Workers run via tsx/node, which (unlike Next.js) do NOT auto-load .env.local.
// Load it from the repo root for local dev. In production (Railway) the file is
// absent and platform-injected env vars are used — dotenv never overrides existing
// process.env values, so deployed config always wins. Must be imported FIRST.
// Worker output is CommonJS, so __dirname is always available (no import.meta).
config({ path: resolve(__dirname, "../../../.env.local") })
