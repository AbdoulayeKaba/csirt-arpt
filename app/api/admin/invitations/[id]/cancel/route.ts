import { NextResponse } from 'next/server';
import { requireApiPermission, userHasPermission } from '@/lib/auth/permission-guard';
import { cancelCorrespondentInvitation } from '@/lib/services/user-invitations';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const auth = await requireApiPermission('admin.invitations.manage');
  if (auth.error) return auth.error;
  if (!(await userHasPermission(auth.session!.role, 'action.invitations.cancel'))) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const { id } = await ctx.params;
  try {
    const result = await cancelCorrespondentInvitation(id, auth.session!.userId);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === 'NOT_FOUND' ? 404 : 422 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[POST /api/admin/invitations/:id/cancel]', e);
    return NextResponse.json({ error: 'CANCEL_FAILED' }, { status: 500 });
  }
}
