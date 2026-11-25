import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isMockDataEnabled } from '@/lib/mock/config';

export async function GET() {
  if (isMockDataEnabled()) {
    return NextResponse.json({ ok: true });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[GET /api/health/db]', e);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
