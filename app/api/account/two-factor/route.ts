import { NextResponse } from 'next/server';
import { requireApiSession } from '@/lib/auth/api-auth';
import { getAccountTwoFactorStatus } from '@/lib/services/account-two-factor';

export async function GET() {
  const { session, error } = await requireApiSession();
  if (error) return error;

  const status = await getAccountTwoFactorStatus(session.userId);
  if (!status) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }
  return NextResponse.json(status);
}

export async function POST() {
  const { error } = await requireApiSession();
  if (error) return error;

  return NextResponse.json({ error: 'MANAGED_BY_ADMIN' }, { status: 403 });
}
