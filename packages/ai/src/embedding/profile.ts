import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime"

// Lazy singleton — never construct the client at module scope (Agent 1 safety rule).
let _client: BedrockRuntimeClient | undefined

function getBedrockClient(): BedrockRuntimeClient {
  if (_client) return _client
  const region = process.env.AWS_BEDROCK_REGION ?? process.env.AWS_REGION ?? "eu-central-1"
  _client = new BedrockRuntimeClient({ region })
  return _client
}

function getModelId(): string {
  const id = process.env.COHERE_EMBED_MODEL_ID
  if (!id) throw new Error("COHERE_EMBED_MODEL_ID is not set")
  return id
}

/**
 * Embed a single user profile. `input_type: "search_query"` — the profile is the
 * QUERY that searches over job documents (jobs use "search_document"). Returns a
 * 1024-dim vector matching Agent 2's user_profiles.profile_embedding column.
 */
export async function embedProfile(text: string): Promise<number[]> {
  const res = await getBedrockClient().send(
    new InvokeModelCommand({
      modelId: getModelId(),
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({ texts: [text], input_type: "search_query" }),
    }),
  )

  const parsed = JSON.parse(new TextDecoder().decode(res.body))
  const embeddings = Array.isArray(parsed.embeddings) ? parsed.embeddings : parsed.embeddings?.float
  const vector = embeddings?.[0]
  if (!Array.isArray(vector)) {
    throw new Error("embedProfile: unexpected Bedrock response shape (no embedding vector)")
  }
  return vector as number[]
}
