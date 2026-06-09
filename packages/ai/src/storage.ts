import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

function getS3Client() {
  const region = process.env.S3_REGION
  const endpoint = process.env.S3_ENDPOINT
  const accessKeyId = process.env.S3_ACCESS_KEY
  const secretAccessKey = process.env.S3_SECRET_KEY
  if (!region || !endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("S3 environment variables (S3_REGION, S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY) are not set")
  }
  return new S3Client({ region, endpoint, credentials: { accessKeyId, secretAccessKey }, forcePathStyle: true })
}

function getBucket() {
  const bucket = process.env.S3_BUCKET
  if (!bucket) throw new Error("S3_BUCKET is not set")
  return bucket
}

export async function presignUpload(key: string, contentType: string, expiresIn = 300) {
  const command = new PutObjectCommand({ Bucket: getBucket(), Key: key, ContentType: contentType })
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
  await getS3Client().send(new PutObjectCommand({ Bucket: getBucket(), Key: key, Body: body, ContentType: contentType }))
}
