import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiPermission, userHasPermission } from '@/lib/auth/permission-guard';
import { createCorrespondentInvitation } from '@/lib/services/user-invitations';

const createSchema = z.object({
  organizationId: z.string().min(1),
  email: z.string().email().max(191),
});

export async function POST(req: Request) {
  const auth = await requireApiPermission('admin.invitations.manage');
  if (auth.error) return auth.error;
  if (!(await userHasPermission(auth.session!.role, 'action.invitations.create'))) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 422 });
  }

  try {
    const result = await createCorrespondentInvitation(parsed.data, auth.session!.userId);
    if (!result.ok) {
      const status =
        result.error === 'ORG_NOT_FOUND'
          ? 404
          : result.error === 'EMAIL_EXISTS' || result.error === 'PENDING_EXISTS'
            ? 409
            : result.error === 'ORG_INACTIVE'
              ? 422
              : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    // Jamais le token brut dans la réponse API.
    return NextResponse.json(
      {
        invitation: result.invitation,
        emailSent: result.emailSent,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error('[POST /api/admin/invitations]', e);
    return NextResponse.json({ error: 'CREATE_FAILED' }, { status: 500 });
  }
}
