# Field encryption — `resumes.content`

**Decision:** Jay, 2026-08-06 — "`resumes.content` only, AWS KMS".
**Status:** built, tested, **switched off**. Nothing is encrypted until you enable it.

## Scope, and why it is this narrow

`resumes.content` holds the most directly identifying data in the product: real name, email
address, phone number, employment history. It is the one column where a database dump alone
is enough to build a targeting list.

`visa_type` and `enrollment_status` were considered and **deliberately excluded**.
`visa_type` drives the SQL legal-eligibility filter (`matching.ts`); encrypting it would
move that filter out of the database and into application code. That filter is load-bearing
for compliance, and rewriting it is a materially riskier change than the encryption is
worth. Revisit if the threat model changes.

## What this actually protects against

**It protects against a stolen database dump or snapshot.** The ciphertext is useless
without a KMS `Decrypt` call, which is separately authenticated and separately logged in
CloudTrail.

**It does not protect against a compromised application.** The running app must be able to
decrypt, so anything that can execute our code can read the data. This is why the
least-privilege database roles (`docs/Security/RLS-ROLLOUT.md`) came first — they cover a
broader class of attack. Do not treat this as a substitute for that work.

## Design

Envelope encryption. KMS mints a 256-bit data key; the payload is encrypted locally with
**AES-256-GCM**; the KMS-encrypted data key is stored alongside the ciphertext.

- **Why envelope, not direct KMS?** `kms:Encrypt` caps payloads at 4 KB. Résumé JSON
  exceeds that routinely.
- **Why GCM?** It is authenticated. A tampered row fails the tag check at decrypt time
  instead of silently yielding different plaintext.
- **Why no schema migration?** The envelope is a JSON *string*, and a JSON string is valid
  `jsonb`. The existing column stores both shapes, so there is no dual-column window and no
  flag day.

Envelope format:

```
v1.<b64 encrypted data key>.<b64 iv>.<b64 auth tag>.<b64 ciphertext>
```

Code: `packages/ai/src/crypto/field-encryption.ts`.
Tests: `packages/ai/tests/field-encryption.test.ts` (round-trip, tamper detection, no
plaintext in output, non-deterministic ciphertext, cache behaviour, legacy pass-through).

## Rollout

### 1. Create the KMS key

In **eu-central-1**, same account as Bedrock — residency applies to key material too.

```sh
aws kms create-key \
  --region eu-central-1 \
  --description "Agora Jobs — resumes.content field encryption" \
  --key-usage ENCRYPT_DECRYPT \
  --key-spec SYMMETRIC_DEFAULT

aws kms create-alias \
  --region eu-central-1 \
  --alias-name alias/agora-field-encryption \
  --target-key-id <key-id>
```

**Enable automatic annual rotation.** Rotation is transparent here: old data keys stay
decryptable under previous key material, and the `v1.` prefix leaves room to detect a
future format change.

### 2. Grant the app

The application role needs exactly two actions on exactly this key:

```json
{
  "Sid": "AgoraFieldEncryption",
  "Effect": "Allow",
  "Action": ["kms:GenerateDataKey", "kms:Decrypt"],
  "Resource": "arn:aws:kms:eu-central-1:328559741463:key/<key-id>"
}
```

Not `kms:*`, and not `Resource: "*"`. `kms:Encrypt` is not needed — envelope encryption
never calls it.

### 3. Set the environment

```
AWS_KMS_REGION=eu-central-1
AWS_KMS_KEY_ID=arn:aws:kms:eu-central-1:328559741463:key/<key-id>
FIELD_ENCRYPTION_ENABLED=true
```

`AWS_KMS_REGION` falls back to `AWS_BEDROCK_REGION` if unset.

### 4. Turn it on for new writes, and watch

With the flag on, every résumé save writes an envelope. Existing rows stay plaintext and are
still read correctly — `decryptFieldOrPassThrough` handles the mixed column, which is what
makes a gradual rollout possible.

Give it a day. Confirm résumé create/edit/read all work and that CloudTrail shows
`GenerateDataKey` and `Decrypt` calls.

### 5. Backfill existing rows

```sh
# Always dry-run first.
FIELD_ENCRYPTION_ENABLED=true pnpm --filter @agora/workers exec tsx \
  scripts/backfill-resume-encryption.ts --dry-run

FIELD_ENCRYPTION_ENABLED=true pnpm --filter @agora/workers exec tsx \
  scripts/backfill-resume-encryption.ts
```

Safe to interrupt and re-run — already-encrypted rows are skipped.

### 6. Verify

```sql
-- Should be 0 once the backfill completes.
SELECT count(*) FROM resumes WHERE jsonb_typeof(content) <> 'string';

-- Spot-check: this must return no rows, i.e. no readable name in the column.
SELECT id FROM resumes WHERE content::text ILIKE '%@%' LIMIT 5;
```

## Rollback

Setting `FIELD_ENCRYPTION_ENABLED=false` stops *new* encryption but **does not decrypt
existing rows** — and it must not, or a config slip would silently expose data. The read
path deliberately ignores the flag and always attempts decryption, so already-encrypted rows
keep working with the flag off.

**Therefore: never delete or disable the KMS key.** Doing so makes every encrypted résumé
permanently unrecoverable. If you truly need to revert to plaintext, write the inverse of
the backfill script and run it *while the key still exists*.

Add the key to whatever runbook covers "things that must never be deleted", alongside the
database.

## Operational notes

- **Cost.** One `GenerateDataKey` per résumé save, one `Decrypt` per résumé read on a cold
  cache. KMS is ~$0.03 per 10k requests; at this product's volume it rounds to nothing.
- **Latency.** A per-process cache keyed on the encrypted data-key blob means repeat reads
  of the same résumé cost zero KMS calls. Cap is 256 entries, in memory only.
- **`kms:Decrypt` is called with an explicit `KeyId`.** Without it, a forged blob could
  steer decryption at a key the attacker controls; naming the key makes KMS reject it.
- **Backups.** Encrypted rows in a Neon backup are only restorable while the KMS key lives.
  This is the intended property, and also the footgun — see Rollback.
