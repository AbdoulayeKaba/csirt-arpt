import { readFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { getObject, objectStoreEnabled } from '@/lib/storage/object-store';
import { mimeForSiteFilename } from '@/lib/site/uploads';

export const dynamic = 'force-dynamic';

const SAFE_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,180}$/;

export async function GET(_req: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  if (!SAFE_NAME.test(filename)) {
    return NextResponse.json({ error: 'BAD_NAME' }, { status: 400 });
  }

  let buffer: Buffer | null = null;
  if (objectStoreEnabled()) {
    buffer = await getObject(`uploads/site/${filename}`);
  }
  if (!buffer) {
    try {
      buffer = await readFile(path.join(process.cwd(), 'public', 'uploads', 'site', filename));
    } catch {
      buffer = null;
    }
  }
  if (!buffer) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': mimeForSiteFilename(filename),
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}
