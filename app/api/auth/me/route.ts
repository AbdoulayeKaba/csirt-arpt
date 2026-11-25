import { NextResponse } from 'next/server';
import { getServerSessionContext } from '@/lib/auth/session-server';
import { getLayoutPlatformBranding } from '@/lib/services/platform-settings-cache';

export async function GET() {
  const [ctx, branding] = await Promise.all([
    getServerSessionContext(),
    getLayoutPlatformBranding(),
  ]);
  if (!ctx) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  return NextResponse.json({
    employeeId: ctx.employeeId,
    appRole: ctx.appRole,
    roleId: ctx.roleId,
    roleLabel: ctx.roleLabel,
    permissions: ctx.permissions,
    dgRole: ctx.dgRole,
    user: ctx.user,
    branding,
  });
}
