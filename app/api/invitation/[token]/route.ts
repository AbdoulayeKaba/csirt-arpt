import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  acceptCorrespondentInvitation,
  previewInvitationByToken,
} from '@/lib/services/user-invitations';

type Ctx = { params: Promise<{ token: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { token } = await ctx.params;
    const preview = await previewInvitationByToken(decodeURIComponent(token));
    if (!preview.ok) {
      const status = preview.error === 'INVALID_TOKEN' ? 404 : 410;
      return NextResponse.json({ error: preview.error }, { status });
    }
    return NextResponse.json({
      email: preview.email,
      organizationName: preview.organizationName,
      expiresAt: preview.expiresAt,
      expiryHours: preview.expiryHours,
    });
  } catch (e) {
    console.error('[GET /api/invitation/:token]', e);
    return NextResponse.json({ error: 'LOAD_FAILED' }, { status: 500 });
  }
}

const acceptSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(128),
  passwordConfirm: z.string().min(1).max(128),
});

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { token } = await ctx.params;
    const json = await req.json().catch(() => null);
    const parsed = acceptSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 422 });
    }
    if (parsed.data.password !== parsed.data.passwordConfirm) {
      return NextResponse.json({ error: 'PASSWORD_MISMATCH' }, { status: 422 });
    }

    const result = await acceptCorrespondentInvitation({
      token: decodeURIComponent(token),
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      password: parsed.data.password,
    });

    if (!result.ok) {
      const status =
        result.error === 'INVALID_TOKEN'
          ? 404
          : result.error === 'EMAIL_EXISTS'
            ? 409
            : result.error.startsWith('PASSWORD_')
              ? 422
              : result.error === 'VALIDATION_ERROR' || result.error === 'PASSWORD_MISMATCH'
                ? 422
                : 410;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({
      ok: true,
      user: {
        email: result.user.email,
        role: result.user.role,
        organizationId: result.user.organizationId,
      },
    });
  } catch (e) {
    console.error('[POST /api/invitation/:token]', e);
    return NextResponse.json({ error: 'ACCEPT_FAILED' }, { status: 500 });
  }
}
