import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { nanoid } from 'nanoid';
import path from 'path';

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

export const isR2Configured = Boolean(
  accountId && accessKeyId && secretAccessKey && process.env.R2_BUCKET_NAME
);

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: accessKeyId || '',
    secretAccessKey: secretAccessKey || '',
  },
});

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '';
export const R2_PUBLIC_URL = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '').replace(/\/$/, '');

/**
 * Generate a secure, pre-signed upload URL for direct browser-to-R2 upload
 */
export async function getPresignedUploadUrl(originalFilename: string, contentType: string) {
  if (!isR2Configured) {
    throw new Error('Cloudflare R2 is not fully configured in environment variables.');
  }

  const ext = path.extname(originalFilename) || '';
  const safeName = originalFilename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(ext, '');
  const key = `uploads/${Date.now()}-${nanoid(6)}-${safeName.slice(0, 30)}${ext}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType || 'application/octet-stream',
  });

  // Valid for 1 hour (allows ample time for large phone videos on mobile networks)
  const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
  const publicUrl = `${R2_PUBLIC_URL}/${key}`;

  return { uploadUrl, publicUrl, key };
}
