import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { hashPassword } from '@/lib/auth/password';
import { validatePasswordForPlatform } from '@/lib/services/password-validation';
import { prisma } from '@/lib/prisma';
import { writeAuditSafe } from '@/lib/services/audit';
import { sendCorrespondentInvitationEmail } from '@/lib/services/correspondent-invitation-email';
import type { UserInvitationStatus } from '@prisma/client';

const TOKEN_BYTES = 32;

export function invitationExpiryHours(): number {
  const raw = Number(process.env.INVITATION_EXPIRY_HOURS ?? '72');
  if (!Number.isFinite(raw) || raw < 1) return 72;
  return Math.min(Math.floor(raw), 24 * 30);
}

export function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function generateInvitationToken(): { token: string; tokenHash: string } {
  const token = randomBytes(TOKEN_BYTES).toString('base64url');
  return { token, tokenHash: hashInvitationToken(token) };
}

function hashesEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

async function deactivateOrganizationIfLapsed(organizationId: string) {
  const [pending, activeUsers] = await Promise.all([
    prisma.userInvitation.count({
      where: { organizationId, status: 'PENDING', expiresAt: { gt: new Date() } },
    }),
    prisma.user.count({
      where: { organizationId, active: true, archived: false },
    }),
  ]);
  if (pending > 0 || activeUsers > 0) return;
  await prisma.organization.updateMany({
    where: { id: organizationId, active: true },
    data: { active: false },
  });
}

export async function expireDueInvitations(organizationId?: string) {
  const due = await prisma.userInvitation.findMany({
    where: {
      status: 'PENDING',
      expiresAt: { lte: new Date() },
      ...(organizationId ? { organizationId } : {}),
    },
    select: { id: true, organizationId: true },
  });
  if (due.length === 0) return;
  await prisma.userInvitation.updateMany({
    where: { id: { in: due.map((row) => row.id) } },
    data: { status: 'EXPIRED' },
  });
  const orgIds = [...new Set(due.map((row) => row.organizationId))];
  await Promise.all(orgIds.map((id) => deactivateOrganizationIfLapsed(id)));
}

async function markExpiredIfNeeded(invitation: {
  id: string;
  status: UserInvitationStatus;
  expiresAt: Date;
}): Promise<UserInvitationStatus> {
  if (invitation.status === 'PENDING' && invitation.expiresAt.getTime() <= Date.now()) {
    await prisma.userInvitation.update({
      where: { id: invitation.id },
      data: { status: 'EXPIRED' },
    });
    const row = await prisma.userInvitation.findUnique({
      where: { id: invitation.id },
      select: { organizationId: true },
    });
    if (row) await deactivateOrganizationIfLapsed(row.organizationId);
    return 'EXPIRED';
  }
  return invitation.status;
}

export type CreateInvitationResult =
  | {
      ok: true;
      invitation: {
        id: string;
        email: string;
        organizationId: string;
        status: UserInvitationStatus;
        expiresAt: string;
      };
      emailSent: boolean;
      /** Token brut — uniquement pour tests / construction du lien e-mail. Ne jamais persister ni logger. */
      activationToken: string;
    }
  | {
      ok: false;
      error:
        | 'ORG_NOT_FOUND'
        | 'ORG_INACTIVE'
        | 'EMAIL_EXISTS'
        | 'PENDING_EXISTS'
        | 'VALIDATION_ERROR'
        | 'EMAIL_FAILED';
    };

export async function createCorrespondentInvitation(
  input: { organizationId: string; email: string },
  actorId: string
): Promise<CreateInvitationResult> {
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return { ok: false, error: 'VALIDATION_ERROR' };
  }

  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
  });
  if (!org) return { ok: false, error: 'ORG_NOT_FOUND' };
  if (!org.active) return { ok: false, error: 'ORG_INACTIVE' };

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, archived: true },
  });
  if (existingUser && !existingUser.archived) {
    return { ok: false, error: 'EMAIL_EXISTS' };
  }

  const pending = await prisma.userInvitation.findFirst({
    where: {
      email,
      organizationId: org.id,
      status: 'PENDING',
      expiresAt: { gt: new Date() },
    },
  });
  if (pending) return { ok: false, error: 'PENDING_EXISTS' };

  const { token, tokenHash } = generateInvitationToken();
  const expiresAt = new Date(Date.now() + invitationExpiryHours() * 60 * 60 * 1000);
  const now = new Date();

  const invitation = await prisma.userInvitation.create({
    data: {
      email,
      organizationId: org.id,
      tokenHash,
      status: 'PENDING',
      invitedById: actorId,
      expiresAt,
      lastSentAt: now,
    },
  });

  const emailResult = await sendCorrespondentInvitationEmail({
    to: email,
    organizationName: org.name,
    activationToken: token,
    expiresAt,
    expiryHours: invitationExpiryHours(),
  });

  await writeAuditSafe(actorId, 'admin.invitation.create', invitation.id, {
    organizationId: org.id,
    email,
    emailSent: emailResult.ok,
  });

  return {
    ok: true,
    invitation: {
      id: invitation.id,
      email: invitation.email,
      organizationId: invitation.organizationId,
      status: invitation.status,
      expiresAt: invitation.expiresAt.toISOString(),
    },
    emailSent: emailResult.ok,
    activationToken: token,
  };
}

export async function resendCorrespondentInvitation(
  invitationId: string,
  actorId: string
): Promise<
  | { ok: true; expiresAt: string; emailSent: boolean; activationToken: string }
  | {
      ok: false;
      error:
        | 'NOT_FOUND'
        | 'NOT_PENDING'
        | 'ORG_INACTIVE'
        | 'EMAIL_EXISTS'
        | 'EMAIL_FAILED';
    }
> {
  const invitation = await prisma.userInvitation.findUnique({
    where: { id: invitationId },
    include: { organization: true },
  });
  if (!invitation) return { ok: false, error: 'NOT_FOUND' };

  const status = await markExpiredIfNeeded(invitation);
  if (status !== 'PENDING') return { ok: false, error: 'NOT_PENDING' };
  if (!invitation.organization.active) return { ok: false, error: 'ORG_INACTIVE' };

  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.email },
    select: { id: true, archived: true },
  });
  if (existingUser && !existingUser.archived) {
    return { ok: false, error: 'EMAIL_EXISTS' };
  }

  const { token, tokenHash } = generateInvitationToken();
  const expiresAt = new Date(Date.now() + invitationExpiryHours() * 60 * 60 * 1000);
  const now = new Date();

  await prisma.userInvitation.update({
    where: { id: invitation.id },
    data: {
      tokenHash,
      expiresAt,
      lastSentAt: now,
      status: 'PENDING',
    },
  });

  const emailResult = await sendCorrespondentInvitationEmail({
    to: invitation.email,
    organizationName: invitation.organization.name,
    activationToken: token,
    expiresAt,
    expiryHours: invitationExpiryHours(),
  });

  await writeAuditSafe(actorId, 'admin.invitation.resend', invitation.id, {
    organizationId: invitation.organizationId,
    email: invitation.email,
    emailSent: emailResult.ok,
  });

  return {
    ok: true,
    expiresAt: expiresAt.toISOString(),
    emailSent: emailResult.ok,
    activationToken: token,
  };
}

export async function cancelCorrespondentInvitation(
  invitationId: string,
  actorId: string
): Promise<{ ok: true } | { ok: false; error: 'NOT_FOUND' | 'NOT_PENDING' }> {
  const invitation = await prisma.userInvitation.findUnique({
    where: { id: invitationId },
  });
  if (!invitation) return { ok: false, error: 'NOT_FOUND' };

  const status = await markExpiredIfNeeded(invitation);
  if (status !== 'PENDING') return { ok: false, error: 'NOT_PENDING' };

  // Rotation du hash pour invalider immédiatement tout lien encore en circulation.
  const { tokenHash } = generateInvitationToken();
  await prisma.userInvitation.update({
    where: { id: invitation.id },
    data: { status: 'CANCELLED', tokenHash },
  });

  await writeAuditSafe(actorId, 'admin.invitation.cancel', invitation.id, {
    organizationId: invitation.organizationId,
    email: invitation.email,
  });

  return { ok: true };
}

export type InvitationPreview =
  | {
      ok: true;
      email: string;
      organizationName: string;
      expiresAt: string;
      expiryHours: number;
    }
  | {
      ok: false;
      error: 'INVALID_TOKEN' | 'EXPIRED' | 'CANCELLED' | 'ACCEPTED' | 'ORG_INACTIVE';
    };

export async function previewInvitationByToken(rawToken: string): Promise<InvitationPreview> {
  const token = rawToken.trim();
  if (!token || token.length < 16) return { ok: false, error: 'INVALID_TOKEN' };

  const tokenHash = hashInvitationToken(token);
  const invitation = await prisma.userInvitation.findUnique({
    where: { tokenHash },
    include: { organization: true },
  });
  if (!invitation || !hashesEqual(invitation.tokenHash, tokenHash)) {
    return { ok: false, error: 'INVALID_TOKEN' };
  }

  if (invitation.status === 'CANCELLED') return { ok: false, error: 'CANCELLED' };
  if (invitation.status === 'ACCEPTED') return { ok: false, error: 'ACCEPTED' };

  const status = await markExpiredIfNeeded(invitation);
  if (status === 'EXPIRED') return { ok: false, error: 'EXPIRED' };
  if (status !== 'PENDING') return { ok: false, error: 'INVALID_TOKEN' };
  if (!invitation.organization.active) return { ok: false, error: 'ORG_INACTIVE' };

  return {
    ok: true,
    email: invitation.email,
    organizationName: invitation.organization.name,
    expiresAt: invitation.expiresAt.toISOString(),
    expiryHours: invitationExpiryHours(),
  };
}

export type AcceptInvitationResult =
  | {
      ok: true;
      user: { id: string; email: string; organizationId: string; role: 'CORRESPONDANT' };
    }
  | {
      ok: false;
      error:
        | 'INVALID_TOKEN'
        | 'EXPIRED'
        | 'CANCELLED'
        | 'ACCEPTED'
        | 'ORG_INACTIVE'
        | 'EMAIL_EXISTS'
        | 'VALIDATION_ERROR'
        | string;
    };

export async function acceptCorrespondentInvitation(input: {
  token: string;
  firstName: string;
  lastName: string;
  password: string;
}): Promise<AcceptInvitationResult> {
  const token = input.token.trim();
  if (!token || token.length < 16) return { ok: false, error: 'INVALID_TOKEN' };

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName || !lastName) return { ok: false, error: 'VALIDATION_ERROR' };

  const passwordCheck = await validatePasswordForPlatform(input.password);
  if (!passwordCheck.ok) return { ok: false, error: passwordCheck.error };

  const tokenHash = hashInvitationToken(token);
  const invitation = await prisma.userInvitation.findUnique({
    where: { tokenHash },
    include: { organization: true },
  });
  if (!invitation || !hashesEqual(invitation.tokenHash, tokenHash)) {
    return { ok: false, error: 'INVALID_TOKEN' };
  }

  if (invitation.status === 'CANCELLED') return { ok: false, error: 'CANCELLED' };
  if (invitation.status === 'ACCEPTED') return { ok: false, error: 'ACCEPTED' };

  const status = await markExpiredIfNeeded(invitation);
  if (status === 'EXPIRED') return { ok: false, error: 'EXPIRED' };
  if (status !== 'PENDING') return { ok: false, error: 'INVALID_TOKEN' };
  if (!invitation.organization.active) return { ok: false, error: 'ORG_INACTIVE' };

  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.email },
    select: { id: true, archived: true },
  });
  if (existingUser && !existingUser.archived) {
    return { ok: false, error: 'EMAIL_EXISTS' };
  }

  const passwordHash = await hashPassword(input.password);
  const now = new Date();

  const user = await prisma.$transaction(async (tx) => {
    // Re-vérifie le statut dans la transaction (course critique).
    const fresh = await tx.userInvitation.findUnique({ where: { id: invitation.id } });
    if (!fresh || fresh.status !== 'PENDING' || fresh.tokenHash !== tokenHash) {
      throw new Error('INVITATION_RACE');
    }
    if (fresh.expiresAt.getTime() <= Date.now()) {
      await tx.userInvitation.update({
        where: { id: fresh.id },
        data: { status: 'EXPIRED' },
      });
      throw new Error('EXPIRED');
    }

    const created = existingUser?.archived
      ? await tx.user.update({
          where: { id: existingUser.id },
          data: {
            email: invitation.email,
            firstName,
            lastName,
            passwordHash,
            passwordChangedAt: now,
            role: 'CORRESPONDANT',
            organizationId: invitation.organizationId,
            active: true,
            archived: false,
            archivedAt: null,
          },
        })
      : await tx.user.create({
          data: {
            email: invitation.email,
            firstName,
            lastName,
            passwordHash,
            passwordChangedAt: now,
            role: 'CORRESPONDANT',
            organizationId: invitation.organizationId,
            active: true,
          },
        });

    // Invalide le token après acceptation.
    const burnt = generateInvitationToken();
    await tx.userInvitation.update({
      where: { id: invitation.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: now,
        tokenHash: burnt.tokenHash,
      },
    });

    return created;
  }).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : 'ACCEPT_FAILED';
    return message;
  });

  if (typeof user === 'string') {
    if (user === 'EXPIRED') return { ok: false, error: 'EXPIRED' };
    if (user === 'INVITATION_RACE') return { ok: false, error: 'ACCEPTED' };
    return { ok: false, error: 'VALIDATION_ERROR' };
  }

  await writeAuditSafe(user.id, 'auth.invitation.accept', invitation.id, {
    organizationId: invitation.organizationId,
    email: invitation.email,
  });

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      organizationId: invitation.organizationId,
      role: 'CORRESPONDANT',
    },
  };
}
