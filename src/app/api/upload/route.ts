import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import { isR2Configured, r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '@/lib/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Clean up filename and append unique id
    const ext = path.extname(file.name) || '';
    const safeName = file.name
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(ext, '');
    const filename = `${Date.now()}-${nanoid(6)}-${safeName.slice(0, 30)}${ext}`;

    // If Cloudflare R2 is configured, upload to R2
    if (isR2Configured) {
      const key = `uploads/${filename}`;
      await r2Client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: key,
          Body: buffer,
          ContentType: file.type || 'application/octet-stream',
        })
      );

      const url = `${R2_PUBLIC_URL}/${key}`;
      return NextResponse.json({ url, filename, key });
    }

    // Local development fallback
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, filename);

    await writeFile(filePath, buffer);

    const url = `/uploads/${filename}`;
    return NextResponse.json({ url, filename });
  } catch (err) {
    console.error('File upload error:', err);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
