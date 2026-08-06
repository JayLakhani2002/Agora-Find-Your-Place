import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto"
import { DecryptCommand, GenerateDataKeyCommand, KMSClient } from "@aws-sdk/client-kms"

/**
 * Application-level field encryption for the most sensitive columns, using KMS envelope
 * encryption.
 *
 * ## What this protects against, and what it does not
 *
 * It protects against a **stolen database dump or snapshot**: the ciphertext is useless
 * without a KMS `Decrypt` call, which is separately authenticated and separately audited in
 * CloudTrail.
 *
 * It does **not** protect against a compromised application — the running app must be able
 * to decrypt, so anything that can run our code can read the data. That is why the
 * least-privilege database roles came first: they cover a broader class of attack. Anyone
 * reading this should not mistake it for a substitute.
 *
 * ## Why envelope encryption rather than calling KMS directly
 *
 * KMS `Encrypt` caps its payload at 4 KB. A résumé's JSON exceeds that routinely. So KMS
 * mints a 256-bit data key, we encrypt the payload locally with AES-256-GCM, and we store
 * the KMS-encrypted data key next to the ciphertext. Only the small key blob ever travels
 * to KMS.
 *
 * ## Why GCM
 *
 * AES-GCM is authenticated: tampering with the ciphertext fails the tag check at decrypt
 * time instead of silently yielding different plaintext. For a column an attacker with
 * write access could try to modify, unauthenticated modes like CBC are the wrong choice.
 *
 * ## Envelope format
 *
 *   v1.<base64 encrypted data key>.<base64 iv>.<base64 auth tag>.<base64 ciphertext>
 *
 * The version prefix exists so a future key rotation or algorithm change can be detected
 * and handled rather than guessed at. Everything needed to decrypt except the KMS key
 * itself is self-contained, so a row can be decrypted without consulting any other table.
 */

const VERSION = "v1"
const ALGORITHM = "aes-256-gcm"
/** 96 bits — the size GCM is specified for; longer nonces are hashed and gain nothing. */
const IV_BYTES = 12
const KEY_SPEC = "AES_256"

let _kms: KMSClient | undefined

function getKms(): KMSClient {
  if (_kms) return _kms
  // Same EU region as Bedrock. Residency applies to the key material too.
  const region = process.env.AWS_KMS_REGION ?? process.env.AWS_BEDROCK_REGION
  if (!region) throw new Error("AWS_KMS_REGION (or AWS_BEDROCK_REGION) is not set")
  _kms = new KMSClient({ region })
  return _kms
}

function getKeyId(): string {
  const keyId = process.env.AWS_KMS_KEY_ID
  if (!keyId) throw new Error("AWS_KMS_KEY_ID is not set")
  return keyId
}

/** Whether field encryption is switched on. Off by default — see docs/Security/FIELD-ENCRYPTION.md. */
export function fieldEncryptionEnabled(): boolean {
  return process.env.FIELD_ENCRYPTION_ENABLED === "true"
}

/**
 * Decrypted data keys, cached by their encrypted blob.
 *
 * Without this, listing N résumés costs N KMS `Decrypt` round-trips on the request path.
 * The cache is per-process and in-memory only, so it dies with the process and is never
 * written anywhere.
 *
 * ponytail: unbounded-by-time Map with a hard entry cap. If résumé volume per process ever
 * makes 256 entries thrash, switch to an LRU with a TTL — but measure first.
 */
const dataKeyCache = new Map<string, Buffer>()
const DATA_KEY_CACHE_MAX = 256

function cacheDataKey(blob: string, key: Buffer): void {
  if (dataKeyCache.size >= DATA_KEY_CACHE_MAX) {
    // Evict oldest insertion. Map preserves insertion order.
    const oldest = dataKeyCache.keys().next().value
    if (oldest !== undefined) dataKeyCache.delete(oldest)
  }
  dataKeyCache.set(blob, key)
}

/** Encrypt a JSON-serialisable value. Returns the envelope string to store in the column. */
export async function encryptField(value: unknown): Promise<string> {
  const { Plaintext, CiphertextBlob } = await getKms().send(
    new GenerateDataKeyCommand({ KeyId: getKeyId(), KeySpec: KEY_SPEC }),
  )
  if (!Plaintext || !CiphertextBlob) {
    throw new Error("KMS GenerateDataKey returned no key material")
  }

  const dataKey = Buffer.from(Plaintext)
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, dataKey, iv)
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()

  // Zero the plaintext key as soon as it is finished with. Node may still hold copies in
  // GC-unreachable buffers, so this is hygiene rather than a guarantee — but it shortens
  // the window in which a heap dump yields a usable key.
  dataKey.fill(0)

  return [
    VERSION,
    Buffer.from(CiphertextBlob).toString("base64"),
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(".")
}

/** True if `stored` looks like one of our envelopes rather than legacy plaintext JSON. */
export function isEncryptedField(stored: unknown): stored is string {
  return typeof stored === "string" && stored.startsWith(`${VERSION}.`)
}

/**
 * Decrypt an envelope produced by `encryptField`.
 *
 * During the migration window a column holds a mix of envelopes and legacy plaintext JSON,
 * so callers should route through `decryptFieldOrPassThrough`.
 */
export async function decryptField<T = unknown>(envelope: string): Promise<T> {
  const parts = envelope.split(".")
  if (parts.length !== 5 || parts[0] !== VERSION) {
    throw new Error("decryptField: unrecognised envelope format")
  }
  const [, keyBlobB64, ivB64, tagB64, ciphertextB64] = parts as [
    string,
    string,
    string,
    string,
    string,
  ]

  let dataKey = dataKeyCache.get(keyBlobB64)
  if (!dataKey) {
    const { Plaintext } = await getKms().send(
      new DecryptCommand({
        CiphertextBlob: Buffer.from(keyBlobB64, "base64"),
        // Naming the key explicitly stops a forged blob from steering us at a key the
        // attacker controls — KMS rejects the call if the blob was made under another key.
        KeyId: getKeyId(),
      }),
    )
    if (!Plaintext) throw new Error("KMS Decrypt returned no key material")
    dataKey = Buffer.from(Plaintext)
    cacheDataKey(keyBlobB64, dataKey)
  }

  const decipher = createDecipheriv(ALGORITHM, dataKey, Buffer.from(ivB64, "base64"))
  decipher.setAuthTag(Buffer.from(tagB64, "base64"))
  // .final() throws if the auth tag does not verify — i.e. if the row was tampered with.
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64")),
    decipher.final(),
  ])
  return JSON.parse(plaintext.toString("utf8")) as T
}

/**
 * Read path for the migration window: decrypt envelopes, pass legacy plaintext through
 * untouched. Once the backfill is complete and verified this can be replaced by
 * `decryptField` directly.
 */
export async function decryptFieldOrPassThrough<T = unknown>(stored: T | string): Promise<T> {
  if (!isEncryptedField(stored)) return stored as T
  return decryptField<T>(stored)
}

/**
 * Constant-time equality for any future secret comparison in this module.
 * Exported so nobody reaches for `===` on a MAC or token elsewhere.
 */
export function secretEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8")
  const bufB = Buffer.from(b, "utf8")
  // timingSafeEqual throws on length mismatch, which would itself leak length via the
  // exception. Compare lengths first and return a constant-time result either way.
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/** Test hook. Never call on the request path. */
export function __clearDataKeyCache(): void {
  dataKeyCache.clear()
}
