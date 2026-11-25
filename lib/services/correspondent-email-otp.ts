import { createHash, randomInt } from 'crypto';
import { prisma } from '@/lib/prisma';
import { CSIRT_BRAND } from '@/lib/csirt/brand';
import { escapeHtml, renderEmailShell } from '@/lib/csirt/email-template-utils';
import { isMockDataEnabled } from '@/lib/mock/config';
import { sendEmail } from '@/lib/services/email';

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 45 * 1000;
const MAX_ATTEMPTS = 5;

type OtpRow = {
  email_otp_hash: string | null;
  email_otp_expires_at: Date | string | null;
  email_otp_attempts: number | null;
};

type MemoryOtp = {
  hash: string;
  expiresAt: number;
  attempts: number;
};

const memoryOtps = new Map<string, MemoryOtp>();

export type EmailOtpError = 'INVALID_TWO_FACTOR' | 'OTP_EMAIL_FAILED' | 'OTP_LOCKED';

function hashOtp(userId: string, code: string) {
  return createHash('sha256').update(`${userId}:${code}`).digest('hex');
}

function normalizeCode(code: string) {
  return code.replace(/\s+/g, '');
}

function asDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function readOtp(userId: string): Promise<MemoryOtp | null> {
  if (isMockDataEnabled()) return memoryOtps.get(userId) ?? null;
  const rows = await prisma.$queryRawUnsafe<OtpRow[]>(
    `SELECT email_otp_hash, email_otp_expires_at, email_otp_attempts
     FROM users WHERE id = ? LIMIT 1`,
    userId
  );
  const row = rows[0];
  if (!row?.email_otp_hash) return null;
  const expires = asDate(row.email_otp_expires_at);
  if (!expires) return null;
  return {
    hash: row.email_otp_hash,
    expiresAt: expires.getTime(),
    attempts: Number(row.email_otp_attempts ?? 0),
  };
}

async function writeOtp(userId: string, value: MemoryOtp | null) {
  if (isMockDataEnabled()) {
    if (!value) memoryOtps.delete(userId);
    else memoryOtps.set(userId, value);
    return;
  }
  if (!value) {
    await prisma.$executeRawUnsafe(
      `UPDATE users
       SET email_otp_hash = NULL, email_otp_expires_at = NULL, email_otp_attempts = 0
       WHERE id = ?`,
      userId
    );
    return;
  }
  await prisma.$executeRawUnsafe(
    `UPDATE users
     SET email_otp_hash = ?, email_otp_expires_at = ?, email_otp_attempts = ?
     WHERE id = ?`,
    value.hash,
    new Date(value.expiresAt),
    value.attempts,
    userId
  );
}

function emailHtml(firstName: string, code: string) {
  const safeName = escapeHtml(firstName.trim() || 'correspondant');
  const body = `
    <tr>
      <td style="padding:28px 32px 8px;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#17803d;">
          ${escapeHtml(CSIRT_BRAND.name)}
        </p>
        <h1 style="margin:0;font-size:22px;line-height:1.3;color:#122018;">Code de connexion</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:12px 32px 0;">
        <p style="margin:0;font-size:15px;line-height:1.6;color:#334155;">
          Bonjour ${safeName}, saisissez ce code pour terminer votre connexion. Il expire dans 5 minutes.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:22px 32px 8px;" align="center">
        <span style="display:inline-block;padding:14px 22px;border-radius:12px;background:#f3fbf6;border:1px solid #d7eee3;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:28px;font-weight:800;letter-spacing:0.28em;color:#146b2b;">
          ${escapeHtml(code)}
        </span>
      </td>
    </tr>
    <tr>
      <td style="padding:8px 32px 28px;">
        <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
          Si vous n’êtes pas à l’origine de cette connexion, ignorez ce message. Ne communiquez ce code à personne.
        </p>
      </td>
    </tr>
  `;
  return renderEmailShell({
    title: 'Code de connexion',
    preheader: 'Votre code de vérification CSIRT-ARPT',
    body,
  });
}

export async function issueCorrespondentLoginOtp(input: {
  userId: string;
  email: string;
  firstName: string;
}): Promise<
  { ok: true; reused: boolean; expiresInSeconds: number } | { ok: false; error: 'OTP_EMAIL_FAILED' }
> {
  const current = await readOtp(input.userId);
  const now = Date.now();
  if (current && current.expiresAt > now) {
    const issuedAt = current.expiresAt - OTP_TTL_MS;
    if (now - issuedAt < RESEND_COOLDOWN_MS) {
      return {
        ok: true,
        reused: true,
        expiresInSeconds: Math.max(1, Math.ceil((current.expiresAt - now) / 1000)),
      };
    }
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const next: MemoryOtp = {
    hash: hashOtp(input.userId, code),
    expiresAt: now + OTP_TTL_MS,
    attempts: 0,
  };
  await writeOtp(input.userId, next);

  const sent = await sendEmail({
    to: input.email,
    subject: `${CSIRT_BRAND.name} — code de connexion`,
    html: emailHtml(input.firstName, code),
  });
  if (!sent) {
    await writeOtp(input.userId, current);
    return { ok: false, error: 'OTP_EMAIL_FAILED' };
  }
  return { ok: true, reused: false, expiresInSeconds: Math.round(OTP_TTL_MS / 1000) };
}

export async function enforceCorrespondentEmailSecondFactor(input: {
  userId: string;
  email: string;
  firstName: string;
  code?: string;
  consume: boolean;
}): Promise<
  { ok: true } | { ok: false; error: EmailOtpError | 'TWO_FACTOR_PENDING'; expiresInSeconds?: number }
> {
  const code = input.code?.trim() ?? '';
  if (!code) {
    const issued = await issueCorrespondentLoginOtp({
      userId: input.userId,
      email: input.email,
      firstName: input.firstName,
    });
    if (!issued.ok) return issued;
    return { ok: false, error: 'TWO_FACTOR_PENDING', expiresInSeconds: issued.expiresInSeconds };
  }
  return verifyCorrespondentLoginOtp(input.userId, code, { consume: input.consume });
}

export async function verifyCorrespondentLoginOtp(
  userId: string,
  code: string,
  options: { consume: boolean }
): Promise<{ ok: true } | { ok: false; error: EmailOtpError }> {
  const normalized = normalizeCode(code);
  if (!/^\d{6}$/.test(normalized)) {
    return { ok: false, error: 'INVALID_TWO_FACTOR' };
  }

  const current = await readOtp(userId);
  if (!current || current.expiresAt <= Date.now()) {
    return { ok: false, error: 'INVALID_TWO_FACTOR' };
  }
  if (current.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: 'OTP_LOCKED' };
  }
  if (current.hash !== hashOtp(userId, normalized)) {
    await writeOtp(userId, { ...current, attempts: current.attempts + 1 });
    return { ok: false, error: 'INVALID_TWO_FACTOR' };
  }
  if (options.consume) await writeOtp(userId, null);
  return { ok: true };
}
