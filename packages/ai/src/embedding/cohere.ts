import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime"

// Lazy singleton — never construct the client at module scope (Agent 1 safety rule).
let _client: BedrockRuntimeClient | undefined

function getBedrockClient(): BedrockRuntimeClient {
  if (_client) return _client
  // EU residency is mandatory — Cohere embed-multilingual-v3 lives in eu-central-1.
  const region = process.env.AWS_REGION ?? "eu-central-1"
  _client = new BedrockRuntimeClient({ region })
  return _client
}

function getModelId(): string {
  const id = process.env.COHERE_EMBED_MODEL_ID
  if (!id) throw new Error("COHERE_EMBED_MODEL_ID is not set")
  return id
}

// Cohere's Bedrock endpoint caps a single call at 96 texts.
export const COHERE_BATCH_LIMIT = 96

/**
 * Embed a batch of job descriptions. `input_type: "search_document"` (jobs are the
 * documents being indexed; profiles use "search_query"). Returns 1024-dim vectors
 * matching Agent 2's vector(1024) column. Caller must keep batches ≤ COHERE_BATCH_LIMIT.
 */
export async function embedJobsBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  if (texts.length > COHERE_BATCH_LIMIT) {
    throw new Error(
      `embedJobsBatch: ${texts.length} texts exceeds Cohere limit of ${COHERE_BATCH_LIMIT}`,
    )
  }

  const res = await getBedrockClient().send(
    new InvokeModelCommand({
      modelId: getModelId(),
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({ texts, input_type: "search_document" }),
    }),
  )

  const parsed = JSON.parse(new TextDecoder().decode(res.body))
  // Cohere v3 on Bedrock may return either `embeddings: number[][]` or
  // `embeddings: { float: number[][] }` depending on embedding_types — handle both.
  const embeddings = Array.isArray(parsed.embeddings) ? parsed.embeddings : parsed.embeddings?.float
  if (!Array.isArray(embeddings)) {
    throw new Error("embedJobsBatch: unexpected Bedrock response shape (no embeddings array)")
  }
  return embeddings as number[][]
}
