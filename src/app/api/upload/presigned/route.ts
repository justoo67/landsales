import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isR2Configured, getPresignedUploadUrl } from '@/lib/r2';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isR2Configured) {
      return NextResponse.json(
        { directFallback: true, message: 'Cloudflare R2 is not configured, fallback to local storage.' },
        { status: 200 }
      );
    }

    const { filename, contentType } = await req.json();

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    const { uploadUrl, publicUrl, key } = await getPresignedUploadUrl(
      filename,
      contentType || 'application/octet-stream'
    );

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      key,
      directFallback: false,
    });
  } catch (err: unknown) {
    console.error('Presigned URL error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
