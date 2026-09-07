import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { uploadBufferToR2, buildObjectKey, isR2Configured } from '@/lib/r2';

// Generic authenticated upload endpoint, backed by Cloudflare R2 — same
// pipeline as Ludeva's /api/upload-kyc-doc. Used for Junior Account
// documents today; any other feature that needs a real hosted file
// (rather than a raw URL text field) can reuse this as-is.
//
// Accepts multipart/form-data:
//   file   — required
//   label  — short slug used in the stored filename, e.g. "birth_certificate"
//   folder — optional subfolder under which files are grouped, e.g.
//            "junior-accounts" (defaults to "documents")
export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isR2Configured()) {
      console.error('[UPLOAD] Cloudflare R2 is not configured — check R2_* env vars.');
      return NextResponse.json({ error: 'File storage is not configured' }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const label = (formData.get('label') as string) || 'file';
    const folder = (formData.get('folder') as string) || 'documents';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const MAX_BYTES = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File must be smaller than 5MB' }, { status: 400 });
    }

    const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
    if (file.type && !ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'File must be a JPG, PNG, WebP, or PDF' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const key = buildObjectKey(`${folder}/${user.id}`, label, file.name);
    const url = await uploadBufferToR2(buffer, key, file.type || 'application/octet-stream');

    return NextResponse.json({ url });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
