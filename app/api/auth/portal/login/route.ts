import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  CREDENTIALS_LOGIN_ERROR_LABELS,
  verifyCredentialsLogin,
} from '@/lib/auth/credentials-login';
import { applyPortalCookie, signPortalToken } from '@/lib/auth/portal-session';
import { bumpUserSessionVersion } from '@/lib/auth/user-session-version';
import { getPlatformSettings } from '@/lib/services/platform-settings';

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totpCode: z.string().trim().min(6).max(8).optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'VALIDATION_ERROR' }, { status: 422 });
  }

  try {
    const result = await verifyCredentialsLogin(
      parsed.data.email,
      parsed.data.password,
      parsed.data.totpCode,
      { consumeSecondFactor: true, bumpSession: false }
    );
    if (!result.ok) {
      if (result.error === 'TWO_FACTOR_PENDING') {
        return NextResponse.json({
          ok: false,
          requiresMfa: true,
          mfaChannel: result.channel ?? 'email',
          expiresInSeconds: result.expiresInSeconds ?? null,
          error: result.error,
          message: CREDENTIALS_LOGIN_ERROR_LABELS[result.error],
        });
      }
      const status =
        result.error === 'RATE_LIMITED'
          ? 429
          : result.error === 'INVALID_CREDENTIALS' ||
              result.error === 'INVALID_TWO_FACTOR' ||
              result.error === 'OTP_LOCKED'
            ? 401
            : result.error === 'ACCOUNT_INACTIVE' ||
                result.error === 'ACCOUNT_ARCHIVED' ||
                result.error === 'PASSWORD_EXPIRED'
              ? 403
              : 400;
      return NextResponse.json(
        {
          ok: false,
          error: result.error,
          message: CREDENTIALS_LOGIN_ERROR_LABELS[result.error],
        },
        { status, headers: status === 429 ? { 'Retry-After': '900' } : undefined }
      );
    }

    if (result.user.role !== 'CORRESPONDANT') {
      return NextResponse.json(
        {
          ok: false,
          error: 'NOT_CORRESPONDENT',
          message: 'Ce compte n’est pas un compte déclarant. Utilisez la connexion de l’équipe CSIRT.',
        },
        { status: 403 }
      );
    }

    const settings = await getPlatformSettings();
    const sessionVersion = settings.sessionSinglePerUser
      ? await bumpUserSessionVersion(result.user.id)
      : undefined;
    const token = await signPortalToken({
      sub: result.user.id,
      email: result.user.email,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      department: result.user.department,
      sessionVersion,
      exp: result.user.sessionExp,
    });
    const response = NextResponse.json({ ok: true });
    applyPortalCookie(response, token, result.user.sessionExp);
    return response;
  } catch (error) {
    console.error('[POST /api/auth/portal/login]', error);
    return NextResponse.json(
      { ok: false, error: 'DB_UNAVAILABLE', message: 'Connexion impossible pour le moment.' },
      { status: 503 }
    );
  }
}
