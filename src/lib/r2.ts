import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME as string;
export const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");

export function isR2Configured() {
  return Boolean(accountId && accessKeyId && secretAccessKey && R2_BUCKET_NAME && R2_PUBLIC_URL);
}

// Cloudflare R2 is S3-compatible, so we talk to it with the standard AWS S3 SDK
// pointed at the account-specific R2 endpoint.
export const r2Client = new S3Client({
  region: "auto",
  endpoint: accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined,
  credentials: {
    accessKeyId: accessKeyId as string,
    secretAccessKey: secretAccessKey as string,
  },
});

/**
 * Uploads a buffer to the configured R2 bucket and returns the public URL.
 * @param buffer   File contents
 * @param key      Object key/path within the bucket, e.g. "kyc/<userId>/selfie_123.jpg"
 * @param mimeType Content-Type of the file
 */
export async function uploadBufferToR2(
  buffer: Buffer,
  key: string,
  mimeType: string
): Promise<string> {
  if (!isR2Configured()) {
    throw new Error(
      "Cloudflare R2 is not configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME and R2_PUBLIC_URL."
    );
  }

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  return `${R2_PUBLIC_URL}/${key}`;
}

/**
 * Deletes an object from the R2 bucket given its key (not its full URL).
 */
export async function deleteFromR2(key: string): Promise<void> {
  if (!isR2Configured()) return;

  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })
  );
}

/**
 * Given a full public R2 URL, extracts the object key (everything after the
 * bucket's public URL prefix) so it can be used with deleteFromR2.
 */
export function keyFromR2Url(url: string): string | null {
  if (!url || !url.startsWith(R2_PUBLIC_URL)) return null;
  return url.slice(R2_PUBLIC_URL.length + 1);
}

/** Builds a safe, unique object key for a file, preserving its extension. */
export function buildObjectKey(folder: string, label: string, originalName?: string) {
  const timestamp = Date.now();
  const ext = originalName?.includes(".") ? originalName.split(".").pop() : undefined;
  const safeLabel = label.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${folder}/${safeLabel}_${timestamp}${ext ? `.${ext}` : ""}`;
}
