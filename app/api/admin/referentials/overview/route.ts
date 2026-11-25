import { NextResponse } from 'next/server';
import { requireApiSession } from '@/lib/auth/api-auth';
import { getReferentialsOverview } from '@/lib/services/referentials-admin';

export async function GET() {
  const { error } = await requireApiSession();
  if (error) return error;

  const overview = await getReferentialsOverview();
  return NextResponse.json(overview);
}
