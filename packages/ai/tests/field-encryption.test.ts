import { createHash, randomBytes } from "node:crypto"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  __clearDataKeyCache,
  decryptField,
  decryptFieldOrPassThrough,
  encryptField,
  fieldEncryptionEnabled,
  isEncryptedField,
  secretEquals,
} from "../src/crypto/field-encryption"

/**
 * Crypto with no tests is decoration. These cover the properties the résumé column depends
 * on: a round-trip is lossless, a tampered row fails loudly instead of yielding different
 * plaintext, plaintext never appears in the stored value, and the migration-window
 * pass-through does not mangle legacy rows.
 *
 * KMS is faked deterministically — the data key is derived from the "blob" — so the real
 * AES-GCM path runs while the test needs no AWS credentials and no network.
 */

const KEY_ID = "arn:aws:kms:eu-central-1:328559741463:key/test"

/** Fake KMS: GenerateDataKey mints a random blob; Decrypt derives the key back from it. */
function keyFromBlob(blob: Buffer): Buffer {
  return createHash("sha256").update(blob).digest()
}

const send = vi.fn(async (command: { __type: string; input: Record<string, unknown> }) => {
  if (command.__type === "GenerateDataKey") {
    const blob = randomBytes(32)
    return { Plaintext: new Uint8Array(keyFromBlob(blob)), CiphertextBlob: new Uint8Array(blob) }
  }
  if (command.__type === "Decrypt") {
    const blob = Buffer.from(command.input.CiphertextBlob as Uint8Array)
    return { Plaintext: new Uint8Array(keyFromBlob(blob)) }
  }
  throw new Error(`unexpected command ${command.__type}`)
})

vi.mock("@aws-sdk/client-kms", () => ({
  KMSClient: class {
    send = send
  },
  GenerateDataKeyCommand: class {
    __type = "GenerateDataKey"
    constructor(public input: Record<string, unknown>) {}
  },
  DecryptCommand: class {
    __type = "Decrypt"
    constructor(public input: Record<string, unknown>) {}
  },
}))

beforeEach(() => {
  process.env.AWS_KMS_KEY_ID = KEY_ID
  process.env.AWS_KMS_REGION = "eu-central-1"
  send.mockClear()
  __clearDataKeyCache()
})

const RESUME = {
  basics: { name: "Aditi Rao", email: "aditi@example.com", phone: "+49 151 2345678" },
  sections: [{ title: "Berufserfahrung", items: ["Werkstudentin bei Beispiel GmbH"] }],
}

describe("encryptField / decryptField", () => {
  it("round-trips a résumé payload losslessly", async () => {
    const envelope = await encryptField(RESUME)
    await expect(decryptField(envelope)).resolves.toEqual(RESUME)
  })

  it("never leaves plaintext in the stored value", async () => {
    const envelope = await encryptField(RESUME)
    // The whole point of the column change: a database dump must not contain these.
    expect(envelope).not.toContain("Aditi")
    expect(envelope).not.toContain("aditi@example.com")
    expect(envelope).not.toContain("+49 151")
    expect(envelope).not.toContain("Beispiel")
  })

  it("produces a different ciphertext each time for identical input", async () => {
    const a = await encryptField(RESUME)
    const b = await encryptField(RESUME)
    // Deterministic ciphertext would let anyone with dump access tell which users share a
    // value, without decrypting anything.
    expect(a).not.toEqual(b)
  })

  it("rejects a tampered ciphertext instead of returning wrong plaintext", async () => {
    const envelope = await encryptField(RESUME)
    const parts = envelope.split(".")
    const body = Buffer.from(parts[4] as string, "base64")
    body[0] = (body[0] as number) ^ 0xff
    parts[4] = body.toString("base64")
    // This is why GCM and not CBC: the auth tag makes modification detectable.
    await expect(decryptField(parts.join("."))).rejects.toThrow()
  })

  it("rejects a swapped auth tag", async () => {
    const a = (await encryptField(RESUME)).split(".")
    const b = (await encryptField({ other: "payload" })).split(".")
    a[3] = b[3] as string
    await expect(decryptField(a.join("."))).rejects.toThrow()
  })

  it("rejects an unrecognised envelope format", async () => {
    await expect(decryptField("v2.a.b.c.d")).rejects.toThrow(/unrecognised envelope/)
    await expect(decryptField("not-an-envelope")).rejects.toThrow(/unrecognised envelope/)
  })

  it("caches the data key so repeated reads do not re-hit KMS", async () => {
    const envelope = await encryptField(RESUME)
    send.mockClear()
    await decryptField(envelope)
    await decryptField(envelope)
    await decryptField(envelope)
    // One Decrypt for the first read; the rest come from the in-process cache.
    expect(send).toHaveBeenCalledTimes(1)
  })
})

describe("isEncryptedField / decryptFieldOrPassThrough", () => {
  it("recognises envelopes and ignores legacy plaintext", async () => {
    expect(isEncryptedField(await encryptField(RESUME))).toBe(true)
    expect(isEncryptedField(RESUME)).toBe(false)
    expect(isEncryptedField(null)).toBe(false)
    expect(isEncryptedField("v1")).toBe(false)
  })

  it("passes legacy rows through untouched during the migration window", async () => {
    // A mixed column is the expected state mid-backfill; this must not throw or mangle.
    await expect(decryptFieldOrPassThrough(RESUME)).resolves.toEqual(RESUME)
    expect(send).not.toHaveBeenCalled()
  })

  it("decrypts envelopes through the same entry point", async () => {
    const envelope = await encryptField(RESUME)
    await expect(decryptFieldOrPassThrough(envelope)).resolves.toEqual(RESUME)
  })
})

describe("fieldEncryptionEnabled", () => {
  it("is off unless explicitly switched on", () => {
    process.env.FIELD_ENCRYPTION_ENABLED = undefined as unknown as string
    expect(fieldEncryptionEnabled()).toBe(false)
    process.env.FIELD_ENCRYPTION_ENABLED = "1"
    expect(fieldEncryptionEnabled()).toBe(false)
    process.env.FIELD_ENCRYPTION_ENABLED = "true"
    expect(fieldEncryptionEnabled()).toBe(true)
  })
})

describe("secretEquals", () => {
  it("compares equal and unequal values correctly", () => {
    expect(secretEquals("abc", "abc")).toBe(true)
    expect(secretEquals("abc", "abd")).toBe(false)
    // Length mismatch must return false, not throw — timingSafeEqual raises on it.
    expect(secretEquals("abc", "abcd")).toBe(false)
    expect(secretEquals("", "")).toBe(true)
  })
})
