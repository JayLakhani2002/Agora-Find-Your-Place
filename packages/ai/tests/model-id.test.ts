import { afterEach, describe, expect, it } from "vitest"
import { invokeClaude } from "../src/bedrock/claude"

// Regression guard for the two-month silent outage (see docs/scope/AUDIT-2026-08-06.md
// §3.1). A bare `anthropic.*` model id is accepted by config but rejected by Bedrock at
// invoke time, so the failure only ever appeared as a 500 on a real user's generation.
// resolveModelId now rejects it up front; these tests keep that guard honest.

const ORIGINAL = process.env.CLAUDE_HAIKU_MODEL_ID

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.CLAUDE_HAIKU_MODEL_ID
  else process.env.CLAUDE_HAIKU_MODEL_ID = ORIGINAL
})

describe("resolveModelId (via invokeClaude)", () => {
  it("rejects a bare foundation-model id before making a network call", async () => {
    process.env.CLAUDE_HAIKU_MODEL_ID = "anthropic.claude-haiku-4-5-20251001-v1:0"

    await expect(
      invokeClaude({ prompt: "hi", model: "haiku" }),
    ).rejects.toThrow(/bare foundation-model id/)
  })

  it("names the corrected id in the error so the fix is obvious", async () => {
    process.env.CLAUDE_HAIKU_MODEL_ID = "anthropic.claude-haiku-4-5-20251001-v1:0"

    await expect(invokeClaude({ prompt: "hi", model: "haiku" })).rejects.toThrow(
      /eu\.anthropic\.claude-haiku-4-5-20251001-v1:0/,
    )
  })

  it("still fails clearly when the variable is unset", async () => {
    delete process.env.CLAUDE_HAIKU_MODEL_ID

    await expect(invokeClaude({ prompt: "hi", model: "haiku" })).rejects.toThrow(
      /CLAUDE_HAIKU_MODEL_ID is not set/,
    )
  })

  it("accepts a regional inference-profile id (fails later, at the network boundary)", async () => {
    process.env.CLAUDE_HAIKU_MODEL_ID = "eu.anthropic.claude-haiku-4-5-20251001-v1:0"

    // A valid id must not trip the guard. It will still reject — no creds/access in
    // CI — but the message must not be ours.
    await expect(invokeClaude({ prompt: "hi", model: "haiku" })).rejects.not.toThrow(
      /bare foundation-model id|is not set/,
    )
  })
})
