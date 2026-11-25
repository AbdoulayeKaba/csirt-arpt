import { NextResponse } from 'next/server';
import { z } from 'zod';
import { homePathForRoleId } from '@/lib/auth/post-login-redirect';
import {
  CREDENTIALS_LOGIN_ERROR_LABELS,
  verifyCredentialsLogin,
} from '@/lib/auth/credentials-login';
const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totpCode: z.string().trim().min(6).max(8).optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 422 });
  }

  try {
    const result = await verifyCredentialsLogin(
      parsed.data.email,
      parsed.data.password,
      parsed.data.totpCode,
      { bumpSession: false }
    );
    if (!result.ok) {
      if (result.error === 'TWO_FACTOR_PENDING') {
        return NextResponse.json({
          ok: false,
          requiresMfa: true,
          mfaChannel: result.channel ?? 'app',
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
        {
          status,
          headers: status === 429 ? { 'Retry-After': '900' } : undefined,
        }
      );
    }

    return NextResponse.json({
      ok: true,
      role: result.user.role,
      redirectTo: await homePathForRoleId(result.user.role),
    });
  } catch (e) {
    console.error('[POST /api/auth/credentials-check]', e);
    return NextResponse.json(
      {
        ok: false,
        error: 'DB_UNAVAILABLE',
        message:
          'Base de données inaccessible. Vérifiez que MySQL est démarré (localhost:3306).',
      },
      { status: 503 }
    );
  }
}
