import { NextResponse } from 'next/server';
import { getDgSession } from '@/lib/auth/session-server';
import { listPendingDeactivations } from '@/lib/services/organization-deactivation';

export async function GET() {
  const session = await getDgSession();
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const result = await listPendingDeactivations(session.role);
    return NextResponse.json(result);
  } catch (e) {
    console.error('[GET /api/admin/organizations/deactivation-requests]', e);
    return NextResponse.json({ error: 'LOAD_FAILED' }, { status: 500 });
  }
}
