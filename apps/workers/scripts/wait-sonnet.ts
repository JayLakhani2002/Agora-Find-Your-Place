import "../src/env"
import { invokeClaude } from "@agora/ai"
async function main() {
  for (let i = 1; i <= 20; i++) { // ~20 * 120s ≈ 40 min
    try {
      const r = await invokeClaude({ model: "sonnet", maxTokens: 16, system: "Reply: ok", prompt: "hi" })
      console.log(`SONNET READY on attempt ${i} -> ${JSON.stringify(r).slice(0,30)}`)
      process.exit(0)
    } catch (e) {
      console.log(`attempt ${i}: still blocked (${(e as Error).message.slice(0,45)})`)
      await new Promise((r) => setTimeout(r, 120000))
    }
  }
  console.log("TIMEOUT: Sonnet still blocked after ~40 min")
  process.exit(1)
}
main()
