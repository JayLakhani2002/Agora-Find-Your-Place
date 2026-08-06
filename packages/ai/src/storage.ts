import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

function getS3Client() {
  const region = process.env.S3_REGION
  const endpoint = process.env.S3_ENDPOINT
  const accessKeyId = process.env.S3_ACCESS_KEY
  const secretAccessKey = process.env.S3_SECRET_KEY
  if (!region || !endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "S3 environment variables (S3_REGION, S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY) are not set",
    )
  }
  return new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  })
}

function getBucket() {
  const bucket = process.env.S3_BUCKET
  if (!bucket) throw new Error("S3_BUCKET is not set")
  return bucket
}

/**
 * Server-side encryption at rest, applied to every write path in this file.
 *
 * The bucket holds uploaded CVs and generated application documents — the highest-value
 * personal data we store outside Postgres. `AES256` is SSE-S3 (provider-managed keys),
 * which Scaleway Object Storage supports via the same header as AWS.
 *
 * What this does and does not buy: it protects against physical-media and
 * storage-layer compromise at the provider, not against a leaked S3 credential — a valid
 * key still reads plaintext through the API. Keeping the bucket private and the
 * credential least-privilege remains the load-bearing control.
 */
const SSE = "AES256" as const

export async function presignUpload(key: string, contentType: string, expiresIn = 300) {
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType,
    ServerSideEncryption: SSE,
  })
  return getSignedUrl(getS3Client(), command, { expiresIn })
}

export async function presignDownload(key: string, expiresIn = 300) {
  const command = new GetObjectCommand({ Bucket: getBucket(), Key: key })
  return getSignedUrl(getS3Client(), command, { expiresIn })
}

export async function deleteObject(key: string) {
  await getS3Client().send(new DeleteObjectCommand({ Bucket: getBucket(), Key: key }))
}

export async function uploadBuffer(key: string, body: Buffer, contentType: string) {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
      ServerSideEncryption: SSE,
    }),
  )
}

/** Download an object's bytes (e.g. an uploaded CV for the extraction worker). */
export async function getObjectBuffer(key: string): Promise<Buffer> {
  const res = await getS3Client().send(new GetObjectCommand({ Bucket: getBucket(), Key: key }))
  const bytes = await res.Body?.transformToByteArray()
  if (!bytes) throw new Error(`getObjectBuffer: empty body for key ${key}`)
  return Buffer.from(bytes)
}
