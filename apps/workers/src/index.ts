import { connection } from "./queues"

async function main() {
  console.log("Agora workers starting…")

  await connection.ping()
  console.log("Redis connected")

  // Agent 3: register scraper worker here
  // Agent 4: register profile-extract worker here
  // Agent 6: register ai-generation worker here
  // Agent 6: register follow-up worker here

  console.log("Workers ready. Waiting for jobs…")
}

async function shutdown() {
  console.log("Shutting down workers…")
  await connection.quit()
  process.exit(0)
}

process.on("SIGTERM", shutdown)
process.on("SIGINT", shutdown)

main().catch((err) => {
  console.error("Worker startup failed:", err)
  process.exit(1)
})
