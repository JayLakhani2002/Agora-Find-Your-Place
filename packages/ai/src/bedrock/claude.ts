import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime"

// Lazy singleton — never construct the client at module scope (Agent 1 safety rule).
let _client: BedrockRuntimeClient | undefined

function getBedrockClient(): BedrockRuntimeClient {
  if (_client) return _client
  const region = process.env.AWS_BEDROCK_REGION ?? process.env.AWS_REGION ?? "eu-central-1"
  _client = new BedrockRuntimeClient({ region })
  return _client
}

export type ClaudeModel = "sonnet" | "haiku"

function resolveModelId(model: ClaudeModel): string {
  const env = model === "sonnet" ? "CLAUDE_SONNET_MODEL_ID" : "CLAUDE_HAIKU_MODEL_ID"
  const id = process.env[env]
  if (!id) throw new Error(`${env} is not set`)
  // Claude 4.5-class models are inference-profile-only on Bedrock: a bare
  // `anthropic.*` id fails at invoke time with "on-demand throughput isn't
  // supported". That surfaces as a runtime 500 on the user's first generation
  // rather than at boot, which is how this went unnoticed for two months.
  // Fail here instead, where the message can name the fix.
  if (id.startsWith("anthropic.")) {
    throw new Error(
      `${env}="${id}" is a bare foundation-model id. Bedrock requires a regional inference profile for this model family — prefix it with the region, e.g. "eu.${id}".`,
    )
  }
  return id
}

export interface InvokeClaudeOpts {
  system?: string
  prompt: string
  model?: ClaudeModel
  maxTokens?: number
  temperature?: number
}

/**
 * Invoke Claude via Bedrock (EU region) using the Anthropic Messages API.
 * Returns the raw text of the first content block. Shared infra — Agent 6 builds
 * generation/prompts on top of this; Agent 4 uses it for CV extraction.
 */
export async function invokeClaude(opts: InvokeClaudeOpts): Promise<string> {
  const { system, prompt, model = "sonnet", maxTokens = 1024, temperature = 0 } = opts
  const body = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: maxTokens,
    temperature,
    ...(system ? { system } : {}),
    messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
  }

  const res = await getBedrockClient().send(
    new InvokeModelCommand({
      modelId: resolveModelId(model),
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(body),
    }),
  )

  const parsed = JSON.parse(new TextDecoder().decode(res.body))
  const text = parsed?.content?.[0]?.text
  if (typeof text !== "string") {
    throw new Error("invokeClaude: unexpected Bedrock response shape (no content text)")
  }
  return text
}

/**
 * Invoke Claude and parse the response as JSON. Strips ```json fences if present.
 * Throws if the model returns unparseable output.
 */
export async function invokeClaudeJSON<T = unknown>(opts: InvokeClaudeOpts): Promise<T> {
  const raw = await invokeClaude(opts)
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()
  try {
    return JSON.parse(cleaned) as T
  } catch {
    throw new Error(`invokeClaudeJSON: response was not valid JSON: ${cleaned.slice(0, 200)}`)
  }
}
