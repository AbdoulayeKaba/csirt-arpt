import { loginAttemptAllowed, noteFailedLogin } from '@/lib/auth/login-rate-limit';
import { DUMMY_PASSWORD_HASH, verifyPassword } from '@/lib/auth/password';
import { isPasswordExpired } from '@/lib/auth/password-policy';
import { sessionExpiresAt } from '@/lib/auth/session-policy';
import { bumpUserSessionVersion } from '@/lib/auth/user-session-version';
import { recordUserLastLogin } from '@/lib/auth/record-user-last-login';
import type { RoleId } from '@/lib/dg/role-ids';
import { parseRoleId } from '@/lib/dg/role-ids';
import { isMockDataEnabled } from '@/lib/mock/config';
import { mockAuthenticate } from '@/lib/mock/users-store';
import { getPlatformSettings } from '@/lib/services/platform-settings';
import { prisma } from '@/lib/prisma';

export type CredentialsLoginError =
  | 'INVALID_CREDENTIALS'
  | 'PASSWORD_EXPIRED'
  | 'TWO_FACTOR_REQUIRED'
  | 'TWO_FACTOR_PENDING'
  | 'INVALID_TWO_FACTOR'
  | 'OTP_EMAIL_FAILED'
  | 'OTP_LOCKED'
  | 'ACCOUNT_INACTIVE'
  | 'ACCOUNT_ARCHIVED'
  | 'RATE_LIMITED';

export type CredentialsLoginSuccess = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: RoleId;
  department: string;
  sessionVersion?: number;
  sessionExp: number;
};

export async function verifyCredentialsLogin(
  email: string,
  password: string,
  totpCode?: string,
  options?: { consumeSecondFactor?: boolean; bumpSession?: boolean }
): Promise<
  | { ok: true; user: CredentialsLoginSuccess }
  | { ok: false; error: CredentialsLoginError; channel?: 'email' | 'app'; expiresInSeconds?: number }
> {
  const normalized = email.trim().toLowerCase();
  const normalizedPassword = password.trim();
  if (!normalized || !normalizedPassword) {
    return { ok: false, error: 'INVALID_CREDENTIALS' };
  }

  if (!loginAttemptAllowed(normalized)) {
    return { ok: false, error: 'RATE_LIMITED' };
  }

  const settings = await getPlatformSettings();

  if (settings.twoFactorRequired) {
    return { ok: false, error: 'TWO_FACTOR_REQUIRED' };
  }

  if (isMockDataEnabled()) {
    const mock = mockAuthenticate(normalized, normalizedPassword);
    if (!mock) {
      noteFailedLogin(normalized);
      return { ok: false, error: 'INVALID_CREDENTIALS' };
    }

    const { mockGetTwoFactor } = await import('@/lib/mock/users-store');
    const tf = mockGetTwoFactor(mock.id);
    if (tf.enabled) {
      const { enforceCorrespondentEmailSecondFactor } = await import(
        '@/lib/services/correspondent-email-otp'
      );
      const otp = await enforceCorrespondentEmailSecondFactor({
        userId: mock.id,
        email: mock.email,
        firstName: mock.firstName,
        code: totpCode,
        consume: options?.consumeSecondFactor === true,
      });
      if (!otp.ok) {
        return { ok: false, error: otp.error, channel: 'email', expiresInSeconds: otp.expiresInSeconds };
      }
    }

    let sessionVersion: number | undefined;
    if (options?.bumpSession !== false && settings.sessionSinglePerUser) {
      sessionVersion = await bumpUserSessionVersion(mock.id);
    }

    return {
      ok: true,
      user: {
        id: mock.id,
        email: mock.email,
        firstName: mock.firstName,
        lastName: mock.lastName,
        role: mock.role,
        department: mock.department,
        sessionVersion,
        sessionExp: sessionExpiresAt(settings),
      },
    };
  }

  const user = await prisma.user.findUnique({ where: { email: normalized } });
  const valid = await verifyPassword(normalizedPassword, user?.passwordHash || DUMMY_PASSWORD_HASH);
  if (!user?.passwordHash || !valid) {
    noteFailedLogin(normalized);
    return { ok: false, error: 'INVALID_CREDENTIALS' };
  }
  if (user.archived) return { ok: false, error: 'ACCOUNT_ARCHIVED' };
  if (!user.active) return { ok: false, error: 'ACCOUNT_INACTIVE' };

  if (isPasswordExpired(user.passwordChangedAt, settings.passwordExpirationDays)) {
    return { ok: false, error: 'PASSWORD_EXPIRED' };
  }

  if (user.twoFactorEnabled) {
    const { enforceCorrespondentEmailSecondFactor } = await import(
      '@/lib/services/correspondent-email-otp'
    );
    const otp = await enforceCorrespondentEmailSecondFactor({
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      code: totpCode,
      consume: options?.consumeSecondFactor === true,
    });
    if (!otp.ok) {
      return { ok: false, error: otp.error, channel: 'email', expiresInSeconds: otp.expiresInSeconds };
    }
  }

  let sessionVersion: number | undefined;
  if (options?.bumpSession !== false && settings.sessionSinglePerUser) {
    sessionVersion = await bumpUserSessionVersion(user.id);
  }

  await recordUserLastLogin(user.id);

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: parseRoleId(user.role) ?? 'MANAGER',
      department: user.department ?? '',
      sessionVersion,
      sessionExp: sessionExpiresAt(settings),
    },
  };
}

export const CREDENTIALS_LOGIN_ERROR_LABELS: Record<CredentialsLoginError, string> = {
  INVALID_CREDENTIALS: 'Identifiants incorrects.',
  RATE_LIMITED: 'Trop de tentatives. Réessayez dans quelques minutes.',
  PASSWORD_EXPIRED:
    'Mot de passe expiré. Contactez l’administratrice pour définir un nouveau mot de passe.',
  TWO_FACTOR_REQUIRED:
    'L’authentification à deux facteurs est obligatoire. Utilisez la connexion Microsoft.',
  TWO_FACTOR_PENDING: 'Un code à 6 chiffres a été envoyé à votre adresse e-mail.',
  INVALID_TWO_FACTOR: 'Code de vérification incorrect ou expiré.',
  OTP_EMAIL_FAILED: 'Le code n’a pas pu être envoyé à votre adresse e-mail. Réessayez.',
  OTP_LOCKED: 'Trop de tentatives. Demandez un nouveau code.',
  ACCOUNT_INACTIVE:
    'Ce compte est désactivé. Contactez l’administratrice pour le réactiver.',
  ACCOUNT_ARCHIVED:
    'Ce compte est archivé. Contactez l’administratrice pour le restaurer.',
};
