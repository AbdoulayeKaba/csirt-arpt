import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Sonde de vie : le processus répond, sans interroger MySQL. */
export function GET() {
  return NextResponse.json({ ok: true });
}
