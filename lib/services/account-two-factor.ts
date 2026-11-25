import { prisma } from '@/lib/prisma';
import { isMockDataEnabled } from '@/lib/mock/config';
import {
  mockFindUserByEmail,
  mockFindUserById,
  mockGetTwoFactor,
  mockSetTwoFactor,
} from '@/lib/mock/users-store';
import { verifyPassword } from '@/lib/auth/password';
import {
  buildOtpauthUri,
  generateTotpSecret,
  verifyTotpCode,
} from '@/lib/auth/totp';
import { qrCodeDataUrl } from '@/lib/auth/qrcode-svg';
import { getPlatformSettings } from '@/lib/services/platform-settings';
import { writeAuditSafe } from '@/lib/services/audit';

export type AccountTwoFactorStatus = {
  enabled: boolean;
  setupPending: boolean;
};

type TwoFactorRow = {
  id: string;
  email: string;
  password_hash: string | null;
  archived: boolean | number;
  active: boolean | number;
  two_factor_enabled: boolean | number;
  two_factor_secret: string | null;
};

async function issuerName(): Promise<string> {
  try {
    const settings = await getPlatformSettings();
    return settings.organizationName?.trim() || 'ARPT Agenda';
  } catch {
    return 'ARPT Agenda';
  }
}

async function loadTwoFactorRowById(userId: string): Promise<TwoFactorRow | null> {
  const rows = await prisma.$queryRawUnsafe<TwoFactorRow[]>(
    `SELECT id, email, password_hash, archived, active,
            two_factor_enabled, two_factor_secret
     FROM users WHERE id = ? LIMIT 1`,
    userId
  );
  return rows[0] ?? null;
}

async function loadTwoFactorRowByEmail(email: string): Promise<TwoFactorRow | null> {
  const rows = await prisma.$queryRawUnsafe<TwoFactorRow[]>(
    `SELECT id, email, password_hash, archived, active,
            two_factor_enabled, two_factor_secret
     FROM users WHERE email = ? LIMIT 1`,
    email
  );
  return rows[0] ?? null;
}

function isTruthy(v: boolean | number | null | undefined) {
  return v === true || v === 1;
}

export async function getAccountTwoFactorStatus(
  userId: string
): Promise<AccountTwoFactorStatus | null> {
  if (isMockDataEnabled()) {
    const mock = mockFindUserById(userId);
    if (!mock) return null;
    const tf = mockGetTwoFactor(userId);
    return {
      enabled: tf.enabled,
      setupPending: Boolean(tf.secret && !tf.enabled),
    };
  }

  const user = await loadTwoFactorRowById(userId);
  if (!user || isTruthy(user.archived)) return null;
  const enabled = isTruthy(user.two_factor_enabled);
  return {
    enabled,
    setupPending: Boolean(user.two_factor_secret && !enabled),
  };
}

export async function startAccountTwoFactorSetup(userId: string) {
  const secret = generateTotpSecret();
  const issuer = await issuerName();

  if (isMockDataEnabled()) {
    const mock = mockFindUserById(userId);
    if (!mock) return { ok: false as const, error: 'NOT_FOUND' as const };
    mockSetTwoFactor(userId, { enabled: false, secret });
    const otpauthUrl = buildOtpauthUri({
      secret,
      accountName: mock.email,
      issuer,
    });
    return {
      ok: true as const,
      secret,
      otpauthUrl,
      qrDataUrl: qrCodeDataUrl(otpauthUrl),
    };
  }

  const user = await loadTwoFactorRowById(userId);
  if (!user || isTruthy(user.archived)) return { ok: false as const, error: 'NOT_FOUND' as const };
  if (isTruthy(user.two_factor_enabled)) {
    return { ok: false as const, error: 'ALREADY_ENABLED' as const };
  }

  await prisma.$executeRawUnsafe(
    `UPDATE users SET two_factor_secret = ?, two_factor_enabled = false WHERE id = ?`,
    secret,
    userId
  );

  const otpauthUrl = buildOtpauthUri({
    secret,
    accountName: user.email,
    issuer,
  });

  return {
    ok: true as const,
    secret,
    otpauthUrl,
    qrDataUrl: qrCodeDataUrl(otpauthUrl),
  };
}

export async function confirmAccountTwoFactor(userId: string, code: string) {
  if (isMockDataEnabled()) {
    const tf = mockGetTwoFactor(userId);
    if (!tf.secret) return { ok: false as const, error: 'SETUP_REQUIRED' as const };
    if (!verifyTotpCode(tf.secret, code)) {
      return { ok: false as const, error: 'INVALID_CODE' as const };
    }
    mockSetTwoFactor(userId, { enabled: true, secret: tf.secret });
    return { ok: true as const };
  }

  const user = await loadTwoFactorRowById(userId);
  if (!user || isTruthy(user.archived)) return { ok: false as const, error: 'NOT_FOUND' as const };
  if (!user.two_factor_secret) return { ok: false as const, error: 'SETUP_REQUIRED' as const };
  if (!verifyTotpCode(user.two_factor_secret, code)) {
    return { ok: false as const, error: 'INVALID_CODE' as const };
  }

  await prisma.$executeRawUnsafe(
    `UPDATE users SET two_factor_enabled = true WHERE id = ?`,
    userId
  );
  return { ok: true as const };
}

export async function cancelAccountTwoFactorSetup(userId: string) {
  if (isMockDataEnabled()) {
    const tf = mockGetTwoFactor(userId);
    if (tf.enabled) return { ok: true as const };
    mockSetTwoFactor(userId, { enabled: false, secret: null });
    return { ok: true as const };
  }

  const user = await loadTwoFactorRowById(userId);
  if (!user || isTruthy(user.archived)) return { ok: false as const, error: 'NOT_FOUND' as const };
  if (isTruthy(user.two_factor_enabled)) return { ok: true as const };

  await prisma.$executeRawUnsafe(
    `UPDATE users SET two_factor_secret = NULL, two_factor_enabled = false WHERE id = ?`,
    userId
  );
  return { ok: true as const };
}

export async function disableAccountTwoFactor(
  userId: string,
  opts: { code?: string; password?: string }
) {
  if (isMockDataEnabled()) {
    const mock = mockFindUserById(userId);
    if (!mock) return { ok: false as const, error: 'NOT_FOUND' as const };
    const tf = mockGetTwoFactor(userId);
    if (!tf.enabled && !tf.secret) return { ok: true as const };

    const codeOk = opts.code && tf.secret ? verifyTotpCode(tf.secret, opts.code) : false;
    const passwordOk = opts.password ? opts.password === mock.password : false;
    if (!codeOk && !passwordOk) {
      return { ok: false as const, error: 'INVALID_CREDENTIALS' as const };
    }
    mockSetTwoFactor(userId, { enabled: false, secret: null });
    return { ok: true as const };
  }

  const user = await loadTwoFactorRowById(userId);
  if (!user || isTruthy(user.archived)) return { ok: false as const, error: 'NOT_FOUND' as const };
  if (!isTruthy(user.two_factor_enabled) && !user.two_factor_secret) return { ok: true as const };

  let authorized = false;
  if (opts.code && user.two_factor_secret) {
    authorized = verifyTotpCode(user.two_factor_secret, opts.code);
  }
  if (!authorized && opts.password && user.password_hash) {
    authorized = await verifyPassword(opts.password, user.password_hash);
  }
  if (!authorized) return { ok: false as const, error: 'INVALID_CREDENTIALS' as const };

  await prisma.$executeRawUnsafe(
    `UPDATE users SET two_factor_enabled = false, two_factor_secret = NULL WHERE id = ?`,
    userId
  );
  return { ok: true as const };
}

async function correspondentTarget(userId: string) {
  if (isMockDataEnabled()) {
    const mock = mockFindUserById(userId);
    if (!mock || mock.archived) return { ok: false as const, error: 'NOT_FOUND' as const };
    return { ok: true as const, email: mock.email, role: mock.role };
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, role: true, archived: true },
  });
  if (!user || user.archived) return { ok: false as const, error: 'NOT_FOUND' as const };
  return { ok: true as const, email: user.email, role: user.role };
}

export async function userIsCorrespondent(userId: string): Promise<boolean> {
  const target = await correspondentTarget(userId);
  return target.ok && target.role.toUpperCase() === 'CORRESPONDANT';
}

export async function adminSetupCorrespondentTwoFactor(userId: string, actorId: string) {
  const target = await correspondentTarget(userId);
  if (!target.ok) return target;
  const started = await startAccountTwoFactorSetup(userId);
  if (!started.ok) return started;
  await writeAuditSafe(actorId, 'admin.correspondent.two_factor.setup', userId, {
    email: target.email,
  });
  return started;
}

export async function adminConfirmCorrespondentTwoFactor(
  userId: string,
  code: string,
  actorId: string
) {
  const target = await correspondentTarget(userId);
  if (!target.ok) return target;
  const result = await confirmAccountTwoFactor(userId, code);
  if (!result.ok) return result;
  await writeAuditSafe(actorId, 'admin.correspondent.two_factor.enable', userId, {
    email: target.email,
  });
  return result;
}

export async function adminCancelCorrespondentTwoFactorSetup(userId: string) {
  const target = await correspondentTarget(userId);
  if (!target.ok) return target;
  return cancelAccountTwoFactorSetup(userId);
}

export async function adminEnableCorrespondentEmailTwoFactor(userId: string, actorId: string) {
  const target = await correspondentTarget(userId);
  if (!target.ok) return target;

  if (isMockDataEnabled()) {
    mockSetTwoFactor(userId, { enabled: true, secret: null });
  } else {
    await prisma.$executeRawUnsafe(
      `UPDATE users
       SET two_factor_enabled = true,
           two_factor_secret = NULL,
           email_otp_hash = NULL,
           email_otp_expires_at = NULL,
           email_otp_attempts = 0
       WHERE id = ?`,
      userId
    );
  }

  await writeAuditSafe(
    actorId,
    target.role.toUpperCase() === 'CORRESPONDANT'
      ? 'admin.correspondent.two_factor.enable'
      : 'admin.user.two_factor.enable',
    userId,
    { email: target.email, channel: 'email' }
  );
  return { ok: true as const };
}

export async function adminEnableEmailTwoFactorForUsers(userIds: string[], actorId: string) {
  const unique = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
  let updated = 0;
  for (const userId of unique) {
    const result = await adminEnableCorrespondentEmailTwoFactor(userId, actorId);
    if (result.ok) updated += 1;
  }
  return { ok: true as const, updated, requested: unique.length };
}

export async function adminDisableEmailTwoFactorForUsers(userIds: string[], actorId: string) {
  const unique = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
  let updated = 0;
  for (const userId of unique) {
    const result = await adminDisableCorrespondentTwoFactor(userId, actorId);
    if (result.ok) updated += 1;
  }
  return { ok: true as const, updated, requested: unique.length };
}

export async function adminDisableCorrespondentTwoFactor(userId: string, actorId: string) {
  const target = await correspondentTarget(userId);
  if (!target.ok) return target;

  if (isMockDataEnabled()) {
    mockSetTwoFactor(userId, { enabled: false, secret: null });
  } else {
    await prisma.$executeRawUnsafe(
      `UPDATE users
       SET two_factor_enabled = false,
           two_factor_secret = NULL,
           email_otp_hash = NULL,
           email_otp_expires_at = NULL,
           email_otp_attempts = 0
       WHERE id = ?`,
      userId
    );
  }

  await writeAuditSafe(
    actorId,
    target.role.toUpperCase() === 'CORRESPONDANT'
      ? 'admin.correspondent.two_factor.disable'
      : 'admin.user.two_factor.disable',
    userId,
    { email: target.email }
  );
  return { ok: true as const };
}

export async function userRequiresTwoFactor(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (isMockDataEnabled()) {
    const mock = mockFindUserByEmail(normalized);
    if (!mock) return false;
    return mockGetTwoFactor(mock.id).enabled;
  }
  const user = await loadTwoFactorRowByEmail(normalized);
  return Boolean(
    user && !isTruthy(user.archived) && isTruthy(user.active) && isTruthy(user.two_factor_enabled)
  );
}

export async function verifyUserTotp(email: string, code: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (isMockDataEnabled()) {
    const mock = mockFindUserByEmail(normalized);
    if (!mock) return false;
    const tf = mockGetTwoFactor(mock.id);
    if (!tf.enabled || !tf.secret) return false;
    return verifyTotpCode(tf.secret, code);
  }
  const user = await loadTwoFactorRowByEmail(normalized);
  if (
    !user ||
    !isTruthy(user.two_factor_enabled) ||
    !user.two_factor_secret ||
    isTruthy(user.archived) ||
    !isTruthy(user.active)
  ) {
    return false;
  }
  return verifyTotpCode(user.two_factor_secret, code);
}
