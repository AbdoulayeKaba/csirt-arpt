import type { OrganizationDeactivationStatus } from '@prisma/client';
import { bumpUserSessionVersion } from '@/lib/auth/user-session-version';
import { prisma } from '@/lib/prisma';
import { writeAuditSafe } from '@/lib/services/audit';
import { sendCorrespondentDeactivationRequestEmail } from '@/lib/services/organization-deactivation-email';
import {
  ORG_DEACTIVATION_WINDOW_MS,
  resolveDeactivationActor,
} from '@/lib/services/organization-deactivation';

export const CORRESPONDENT_DEACTIVATION_FORBIDDEN =
  'Seul un administrateur ou un super administrateur peut désactiver un correspondant.';

export type CorrespondentDeactivationView = {
  id: string;
  userId: string;
  correspondentEmail: string;
  correspondentName: string;
  organizationName: string;
  status: OrganizationDeactivationStatus;
  requestedAt: string;
  expiresAt: string;
  requestedByName: string;
  requestedByEmail: string;
  decidedAt: string | null;
  decidedByName: string | null;
};

type ActorUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
};

type RequestRow = {
  id: string;
  userId: string;
  status: OrganizationDeactivationStatus;
  requestedByName: string;
  requestedByEmail: string;
  expiresAt: Date;
  decidedByName: string | null;
  decidedAt: Date | null;
  createdAt: Date;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    organization: { name: string } | null;
  };
};

const userInclude = {
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      organization: { select: { name: true } },
    },
  },
} as const;

function personName(user: { firstName: string; lastName: string; email: string }) {
  const name = `${user.firstName} ${user.lastName}`.replace(/\s+/g, ' ').trim();
  return name || user.email;
}

function toView(row: RequestRow): CorrespondentDeactivationView {
  return {
    id: row.id,
    userId: row.userId,
    correspondentEmail: row.user.email,
    correspondentName: personName(row.user),
    organizationName: row.user.organization?.name || '—',
    status: row.status,
    requestedAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    requestedByName: row.requestedByName,
    requestedByEmail: row.requestedByEmail,
    decidedAt: row.decidedAt?.toISOString() ?? null,
    decidedByName: row.decidedByName,
  };
}

async function expireStaleRequests() {
  const stale = await prisma.correspondentDeactivationRequest.findMany({
    where: { status: 'PENDING', expiresAt: { lt: new Date() } },
    select: { id: true, userId: true, requestedById: true, requestedByName: true, createdAt: true },
  });
  if (stale.length === 0) return;

  await prisma.correspondentDeactivationRequest.updateMany({
    where: { id: { in: stale.map((row) => row.id) } },
    data: { status: 'EXPIRED' },
  });

  await Promise.all(
    stale.map((row) =>
      row.requestedById
        ? writeAuditSafe(row.requestedById, 'admin.correspondent.deactivation.expired', row.userId, {
            requestId: row.id,
            requestedByName: row.requestedByName,
            requestedAt: row.createdAt.toISOString(),
          })
        : Promise.resolve()
    )
  );
}

async function loadActor(userId: string): Promise<ActorUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, active: true, archived: true },
  });
  if (!user || !user.active || user.archived) return null;
  return user;
}

async function superAdminRecipients(exceptUserId?: string) {
  const users = await prisma.user.findMany({
    where: { active: true, archived: false },
    select: { id: true, email: true, role: true },
  });
  const superRoles = new Set<string>();
  for (const role of new Set(users.map((user) => user.role))) {
    if ((await resolveDeactivationActor(role)) === 'super') superRoles.add(role);
  }
  return users.filter(
    (user) => superRoles.has(user.role) && user.email.includes('@') && user.id !== exceptUserId
  );
}

async function applyDeactivation(input: {
  userId: string;
  actor: ActorUser;
  existingRequestId?: string;
}) {
  const now = new Date();
  const name = personName(input.actor);
  const row = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: input.userId },
      data: { active: false },
    });
    if (input.existingRequestId) {
      return tx.correspondentDeactivationRequest.update({
        where: { id: input.existingRequestId },
        data: {
          status: 'APPROVED',
          decidedById: input.actor.id,
          decidedByName: name,
          decidedAt: now,
        },
        include: userInclude,
      });
    }
    return tx.correspondentDeactivationRequest.create({
      data: {
        userId: input.userId,
        status: 'APPROVED',
        requestedById: input.actor.id,
        requestedByName: name,
        requestedByEmail: input.actor.email,
        expiresAt: now,
        decidedById: input.actor.id,
        decidedByName: name,
        decidedAt: now,
      },
      include: userInclude,
    });
  });

  await bumpUserSessionVersion(input.userId);
  await writeAuditSafe(input.actor.id, 'admin.correspondent.deactivation.approved', input.userId, {
    requestId: row.id,
    requestedByName: row.requestedByName,
    requestedByEmail: row.requestedByEmail,
    requestedAt: row.createdAt.toISOString(),
    decidedByName: row.decidedByName,
    decidedAt: row.decidedAt?.toISOString() ?? now.toISOString(),
  });

  return toView(row);
}

export async function correspondentDeactivationContext(userIds: string[]) {
  await expireStaleRequests();
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return new Map<string, { pending: CorrespondentDeactivationView | null; trace: CorrespondentDeactivationView | null }>();

  const rows = await prisma.correspondentDeactivationRequest.findMany({
    where: { userId: { in: unique }, status: { in: ['PENDING', 'APPROVED', 'REJECTED'] } },
    orderBy: { createdAt: 'desc' },
    include: userInclude,
  });

  const context = new Map<string, { pending: CorrespondentDeactivationView | null; trace: CorrespondentDeactivationView | null }>();
  for (const id of unique) context.set(id, { pending: null, trace: null });
  for (const row of rows) {
    const slot = context.get(row.userId);
    if (!slot) continue;
    const view = toView(row);
    if (row.status === 'PENDING' && !slot.pending) slot.pending = view;
    if ((row.status === 'APPROVED' || row.status === 'REJECTED') && !slot.trace) slot.trace = view;
  }
  return context;
}

export async function listCorrespondentDeactivations(roleId: string) {
  await expireStaleRequests();
  const actor = await resolveDeactivationActor(roleId);
  if (!actor) {
    return { actor, requests: [] as CorrespondentDeactivationView[], decisions: [] as CorrespondentDeactivationView[] };
  }

  const [pending, decisions] = await Promise.all([
    actor === 'super'
      ? prisma.correspondentDeactivationRequest.findMany({
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'asc' },
          include: userInclude,
        })
      : Promise.resolve([]),
    prisma.correspondentDeactivationRequest.findMany({
      where: { status: { in: ['APPROVED', 'REJECTED'] } },
      orderBy: { decidedAt: 'desc' },
      take: 200,
      include: userInclude,
    }),
  ]);

  return {
    actor,
    requests: pending.map(toView),
    decisions: decisions.map(toView),
  };
}

export async function requestCorrespondentDeactivation(userId: string, actorUserId: string) {
  await expireStaleRequests();
  const actor = await loadActor(actorUserId);
  if (!actor) return { ok: false as const, error: CORRESPONDENT_DEACTIVATION_FORBIDDEN };
  const kind = await resolveDeactivationActor(actor.role);
  if (!kind) return { ok: false as const, error: CORRESPONDENT_DEACTIVATION_FORBIDDEN };

  const correspondent = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      active: true,
      archived: true,
      organization: { select: { name: true } },
    },
  });
  if (!correspondent || correspondent.archived) return { ok: false as const, error: 'Correspondant introuvable.' };
  if (correspondent.role.toUpperCase() !== 'CORRESPONDANT') {
    return { ok: false as const, error: 'Ce compte n’est pas un correspondant.' };
  }
  if (!correspondent.active) return { ok: false as const, error: 'Ce correspondant est déjà inactif.' };

  const pending = await prisma.correspondentDeactivationRequest.findFirst({
    where: { userId, status: 'PENDING' },
    include: userInclude,
  });

  if (kind === 'super') {
    const request = await applyDeactivation({
      userId,
      actor,
      existingRequestId: pending?.id,
    });
    return { ok: true as const, immediate: true, notified: 0, request };
  }

  if (pending) {
    return { ok: true as const, immediate: false, notified: 0, request: toView(pending), alreadyPending: true };
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + ORG_DEACTIVATION_WINDOW_MS);
  const created = await prisma.correspondentDeactivationRequest.create({
    data: {
      userId,
      status: 'PENDING',
      requestedById: actor.id,
      requestedByName: personName(actor),
      requestedByEmail: actor.email,
      expiresAt,
    },
    include: userInclude,
  });

  await writeAuditSafe(actor.id, 'admin.correspondent.deactivation.requested', userId, {
    requestId: created.id,
    requestedByName: created.requestedByName,
    requestedByEmail: created.requestedByEmail,
    requestedAt: created.createdAt.toISOString(),
    expiresAt: created.expiresAt.toISOString(),
  });

  const recipients = await superAdminRecipients(actor.id);
  const deliveries = await Promise.all(
    recipients.map((recipient) =>
      sendCorrespondentDeactivationRequestEmail({
        to: recipient.email,
        correspondentName: personName(correspondent),
        correspondentEmail: correspondent.email,
        organizationName: correspondent.organization?.name || '—',
        requestedByName: created.requestedByName,
        requestedAt: created.createdAt,
        expiresAt: created.expiresAt,
      }).catch((err) => {
        console.warn('[correspondent-deactivation] email failed', err);
        return false;
      })
    )
  );

  return {
    ok: true as const,
    immediate: false,
    notified: deliveries.filter(Boolean).length,
    request: toView(created),
    alreadyPending: false,
  };
}

export async function decideCorrespondentDeactivation(
  requestId: string,
  actorUserId: string,
  input: { decision: 'approve' | 'reject' }
) {
  await expireStaleRequests();

  const actor = await loadActor(actorUserId);
  if (!actor || (await resolveDeactivationActor(actor.role)) !== 'super') {
    return { ok: false as const, error: 'Seul le super administrateur peut décider de cette désactivation.' };
  }

  const request = await prisma.correspondentDeactivationRequest.findUnique({
    where: { id: requestId },
    include: userInclude,
  });
  if (!request) return { ok: false as const, error: 'Demande introuvable.' };
  if (request.status === 'EXPIRED' || request.expiresAt.getTime() <= Date.now()) {
    if (request.status === 'PENDING') {
      await prisma.correspondentDeactivationRequest.update({
        where: { id: request.id },
        data: { status: 'EXPIRED' },
      });
    }
    return { ok: false as const, error: 'Le délai de 3 jours est dépassé. Le correspondant reste actif.' };
  }
  if (request.status !== 'PENDING') {
    return { ok: false as const, error: 'Cette demande n’est plus en attente.' };
  }

  if (input.decision === 'reject') {
    const now = new Date();
    const rejected = await prisma.correspondentDeactivationRequest.update({
      where: { id: request.id },
      data: {
        status: 'REJECTED',
        decidedById: actor.id,
        decidedByName: personName(actor),
        decidedAt: now,
      },
      include: userInclude,
    });
    await writeAuditSafe(actor.id, 'admin.correspondent.deactivation.rejected', request.userId, {
      requestId: rejected.id,
      requestedByName: rejected.requestedByName,
      requestedAt: rejected.createdAt.toISOString(),
      decidedByName: rejected.decidedByName,
      decidedAt: now.toISOString(),
    });
    return { ok: true as const, request: toView(rejected) };
  }

  const approved = await applyDeactivation({
    userId: request.userId,
    actor,
    existingRequestId: request.id,
  });
  return { ok: true as const, request: approved };
}

export async function reactivateCorrespondent(userId: string, actorUserId: string) {
  const actor = await loadActor(actorUserId);
  if (!actor) return { ok: false as const, error: CORRESPONDENT_DEACTIVATION_FORBIDDEN };
  const kind = await resolveDeactivationActor(actor.role);
  if (!kind) return { ok: false as const, error: CORRESPONDENT_DEACTIVATION_FORBIDDEN };

  const correspondent = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, active: true, archived: true },
  });
  if (!correspondent || correspondent.archived || correspondent.role.toUpperCase() !== 'CORRESPONDANT') {
    return { ok: false as const, error: 'Correspondant introuvable.' };
  }

  const now = new Date();
  const name = personName(actor);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { active: true } }),
    prisma.correspondentDeactivationRequest.updateMany({
      where: { userId, status: 'PENDING' },
      data: { status: 'CANCELLED', decidedById: actor.id, decidedByName: name, decidedAt: now },
    }),
  ]);

  await writeAuditSafe(actor.id, 'admin.correspondent.reactivated', userId, {
    decidedByName: name,
    decidedAt: now.toISOString(),
  });

  return { ok: true as const, immediate: true as const, userId, active: true };
}
