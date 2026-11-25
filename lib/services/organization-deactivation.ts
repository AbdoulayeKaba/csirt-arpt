import type { OrganizationDeactivationRequest, OrganizationDeactivationStatus } from '@prisma/client';
import type { RoleId } from '@/lib/dg/role-ids';
import { prisma } from '@/lib/prisma';
import { writeAuditSafe } from '@/lib/services/audit';
import { sendOrganizationDeactivationRequestEmail } from '@/lib/services/organization-deactivation-email';
import { getRoleLabel } from '@/lib/services/role-permissions-admin';

export const ORG_DEACTIVATION_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

export const DEACTIVATION_FORBIDDEN =
  'Seul un administrateur ou un super administrateur peut désactiver une organisation.';

export type DeactivationActorKind = 'admin' | 'super';

export type DeactivationView = {
  id: string;
  organizationId: string;
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

function normalizeRoleLabel(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function personName(user: { firstName: string; lastName: string; email: string }) {
  const name = `${user.firstName} ${user.lastName}`.replace(/\s+/g, ' ').trim();
  return name || user.email;
}

function toView(
  row: OrganizationDeactivationRequest & { organization: { id: string; name: string } }
): DeactivationView {
  return {
    id: row.id,
    organizationId: row.organization.id,
    organizationName: row.organization.name,
    status: row.status,
    requestedAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    requestedByName: row.requestedByName,
    requestedByEmail: row.requestedByEmail,
    decidedAt: row.decidedAt?.toISOString() ?? null,
    decidedByName: row.decidedByName,
  };
}

export async function resolveDeactivationActor(roleId: string): Promise<DeactivationActorKind | null> {
  const label = normalizeRoleLabel(await getRoleLabel(roleId as RoleId));
  if (label === 'super administrateur') return 'super';
  if (roleId === 'ASSISTANT' || label === 'administrateur') return 'admin';
  return null;
}

async function expireStaleRequests() {
  const stale = await prisma.organizationDeactivationRequest.findMany({
    where: { status: 'PENDING', expiresAt: { lt: new Date() } },
    select: { id: true, organizationId: true, requestedById: true, requestedByName: true, createdAt: true },
  });
  if (stale.length === 0) return;

  await prisma.organizationDeactivationRequest.updateMany({
    where: { id: { in: stale.map((row) => row.id) } },
    data: { status: 'EXPIRED' },
  });

  await Promise.all(
    stale.map((row) =>
      row.requestedById
        ? writeAuditSafe(row.requestedById, 'admin.organization.deactivation.expired', row.organizationId, {
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
  organizationId: string;
  actor: ActorUser;
  existingRequestId?: string;
}) {
  const now = new Date();
  const name = personName(input.actor);
  const row = await prisma.$transaction(async (tx) => {
    await tx.organization.update({
      where: { id: input.organizationId },
      data: { active: false },
    });
    if (input.existingRequestId) {
      return tx.organizationDeactivationRequest.update({
        where: { id: input.existingRequestId },
        data: {
          status: 'APPROVED',
          decidedById: input.actor.id,
          decidedByName: name,
          decidedAt: now,
        },
        include: { organization: { select: { id: true, name: true } } },
      });
    }
    return tx.organizationDeactivationRequest.create({
      data: {
        organizationId: input.organizationId,
        status: 'APPROVED',
        requestedById: input.actor.id,
        requestedByName: name,
        requestedByEmail: input.actor.email,
        expiresAt: now,
        decidedById: input.actor.id,
        decidedByName: name,
        decidedAt: now,
      },
      include: { organization: { select: { id: true, name: true } } },
    });
  });

  await writeAuditSafe(input.actor.id, 'admin.organization.deactivation.approved', input.organizationId, {
    requestId: row.id,
    requestedByName: row.requestedByName,
    requestedByEmail: row.requestedByEmail,
    requestedAt: row.createdAt.toISOString(),
    decidedByName: row.decidedByName,
    decidedAt: row.decidedAt?.toISOString() ?? now.toISOString(),
  });

  return toView(row);
}

export async function organizationDeactivationContext(organizationId: string, roleId: string) {
  await expireStaleRequests();
  const actor = await resolveDeactivationActor(roleId);
  const [pending, trace] = await Promise.all([
    prisma.organizationDeactivationRequest.findFirst({
      where: { organizationId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: { organization: { select: { id: true, name: true } } },
    }),
    prisma.organizationDeactivationRequest.findFirst({
      where: { organizationId, status: { in: ['APPROVED', 'REJECTED'] } },
      orderBy: { decidedAt: 'desc' },
      include: { organization: { select: { id: true, name: true } } },
    }),
  ]);
  return {
    deactivationActor: actor,
    pendingDeactivation: pending ? toView(pending) : null,
    deactivationTrace: trace ? toView(trace) : null,
  };
}

export async function listPendingDeactivations(roleId: string) {
  await expireStaleRequests();
  const actor = await resolveDeactivationActor(roleId);
  if (!actor) {
    return { actor, requests: [] as DeactivationView[], decisions: [] as DeactivationView[] };
  }

  const [pending, decisions] = await Promise.all([
    actor === 'super'
      ? prisma.organizationDeactivationRequest.findMany({
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'asc' },
          include: { organization: { select: { id: true, name: true } } },
        })
      : Promise.resolve([]),
    prisma.organizationDeactivationRequest.findMany({
      where: { status: { in: ['APPROVED', 'REJECTED'] } },
      orderBy: { decidedAt: 'desc' },
      take: 200,
      include: { organization: { select: { id: true, name: true } } },
    }),
  ]);

  return {
    actor,
    requests: pending.map(toView),
    decisions: decisions.map(toView),
  };
}

export async function requestOrganizationDeactivation(organizationId: string, actorUserId: string) {
  await expireStaleRequests();
  const actor = await loadActor(actorUserId);
  if (!actor) return { ok: false as const, error: DEACTIVATION_FORBIDDEN };
  const kind = await resolveDeactivationActor(actor.role);
  if (!kind) return { ok: false as const, error: DEACTIVATION_FORBIDDEN };

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, active: true },
  });
  if (!organization) return { ok: false as const, error: 'Organisation introuvable.' };
  if (!organization.active) return { ok: false as const, error: 'Cette organisation est déjà inactive.' };

  const pending = await prisma.organizationDeactivationRequest.findFirst({
    where: { organizationId, status: 'PENDING' },
    include: { organization: { select: { id: true, name: true } } },
  });

  if (kind === 'super') {
    const request = await applyDeactivation({
      organizationId,
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
  const created = await prisma.organizationDeactivationRequest.create({
    data: {
      organizationId,
      status: 'PENDING',
      requestedById: actor.id,
      requestedByName: personName(actor),
      requestedByEmail: actor.email,
      expiresAt,
    },
    include: { organization: { select: { id: true, name: true } } },
  });

  await writeAuditSafe(actor.id, 'admin.organization.deactivation.requested', organizationId, {
    requestId: created.id,
    requestedByName: created.requestedByName,
    requestedByEmail: created.requestedByEmail,
    requestedAt: created.createdAt.toISOString(),
    expiresAt: created.expiresAt.toISOString(),
  });

  const recipients = await superAdminRecipients(actor.id);
  const deliveries = await Promise.all(
    recipients.map((recipient) =>
      sendOrganizationDeactivationRequestEmail({
        to: recipient.email,
        organizationName: organization.name,
        requestedByName: created.requestedByName,
        requestedAt: created.createdAt,
        expiresAt: created.expiresAt,
      }).catch((err) => {
        console.warn('[organization-deactivation] email failed', err);
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

export async function decideOrganizationDeactivation(
  requestId: string,
  actorUserId: string,
  input: { decision: 'approve' | 'reject' }
) {
  await expireStaleRequests();

  const actor = await loadActor(actorUserId);
  if (!actor || (await resolveDeactivationActor(actor.role)) !== 'super') {
    return { ok: false as const, error: 'Seul le super administrateur peut décider de cette désactivation.' };
  }

  const request = await prisma.organizationDeactivationRequest.findUnique({
    where: { id: requestId },
    include: { organization: { select: { id: true, name: true, active: true } } },
  });
  if (!request) return { ok: false as const, error: 'Demande introuvable.' };
  if (request.status === 'EXPIRED' || request.expiresAt.getTime() <= Date.now()) {
    if (request.status === 'PENDING') {
      await prisma.organizationDeactivationRequest.update({
        where: { id: request.id },
        data: { status: 'EXPIRED' },
      });
    }
    return { ok: false as const, error: 'Le délai de 3 jours est dépassé. L’organisation reste active.' };
  }
  if (request.status !== 'PENDING') {
    return { ok: false as const, error: 'Cette demande n’est plus en attente.' };
  }

  if (input.decision === 'reject') {
    const now = new Date();
    const rejected = await prisma.organizationDeactivationRequest.update({
      where: { id: request.id },
      data: {
        status: 'REJECTED',
        decidedById: actor.id,
        decidedByName: personName(actor),
        decidedAt: now,
      },
      include: { organization: { select: { id: true, name: true } } },
    });
    await writeAuditSafe(actor.id, 'admin.organization.deactivation.rejected', request.organizationId, {
      requestId: rejected.id,
      requestedByName: rejected.requestedByName,
      requestedAt: rejected.createdAt.toISOString(),
      decidedByName: rejected.decidedByName,
      decidedAt: now.toISOString(),
    });
    return { ok: true as const, request: toView(rejected) };
  }

  const approved = await applyDeactivation({
    organizationId: request.organizationId,
    actor,
    existingRequestId: request.id,
  });
  return { ok: true as const, request: approved };
}

export async function reactivateOrganization(organizationId: string, actorUserId: string) {
  const actor = await loadActor(actorUserId);
  if (!actor) return { ok: false as const, error: DEACTIVATION_FORBIDDEN };
  const kind = await resolveDeactivationActor(actor.role);
  if (!kind) return { ok: false as const, error: DEACTIVATION_FORBIDDEN };

  const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!organization) return { ok: false as const, error: 'Organisation introuvable.' };

  const now = new Date();
  const name = personName(actor);
  await prisma.$transaction([
    prisma.organization.update({ where: { id: organizationId }, data: { active: true } }),
    prisma.organizationDeactivationRequest.updateMany({
      where: { organizationId, status: 'PENDING' },
      data: { status: 'CANCELLED', decidedById: actor.id, decidedByName: name, decidedAt: now },
    }),
  ]);

  await writeAuditSafe(actor.id, 'admin.organization.reactivated', organizationId, {
    decidedByName: name,
    decidedAt: now.toISOString(),
  });

  const updated = await prisma.organization.findUnique({ where: { id: organizationId } });
  return { ok: true as const, organization: updated! };
}
