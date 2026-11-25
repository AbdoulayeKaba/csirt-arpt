import { NextResponse } from 'next/server';
import { requireApiPermission, userHasPermission } from '@/lib/auth/permission-guard';
import { resendCorrespondentInvitation } from '@/lib/services/user-invitations';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const auth = await requireApiPermission('admin.invitations.manage');
  if (auth.error) return auth.error;
  if (!(await userHasPermission(auth.session!.role, 'action.invitations.resend'))) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const { id } = await ctx.params;
  try {
    const result = await resendCorrespondentInvitation(id, auth.session!.userId);
    if (!result.ok) {
      const status =
        result.error === 'NOT_FOUND'
          ? 404
          : result.error === 'EMAIL_EXISTS'
            ? 409
            : 422;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({
      ok: true,
      expiresAt: result.expiresAt,
      emailSent: result.emailSent,
    });
  } catch (e) {
    console.error('[POST /api/admin/invitations/:id/resend]', e);
    return NextResponse.json({ error: 'RESEND_FAILED' }, { status: 500 });
  }
}
