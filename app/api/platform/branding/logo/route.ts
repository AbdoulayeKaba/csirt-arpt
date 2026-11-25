import { NextResponse } from 'next/server';
import { readInstitutionLogo } from '@/lib/storage/platform-branding';

export async function GET() {
  const file = await readInstitutionLogo();
  if (!file) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  const headers: Record<string, string> = {
    'Content-Type': file.mimeType,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
  };
  if (file.mimeType === 'image/svg+xml') {
    headers['Content-Security-Policy'] = "default-src 'none'; style-src 'unsafe-inline'; sandbox";
  }

  return new NextResponse(file.buffer, { headers });
}
