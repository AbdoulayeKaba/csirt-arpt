import { prisma } from '@/lib/prisma';
import { writeAuditSafe } from '@/lib/services/audit';
import { expireDueInvitations } from '@/lib/services/user-invitations';
import { getReferentialItemById, listReferentialItems } from '@/lib/services/referentials-admin';

function slugify(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
  return base || 'organisation';
}

async function uniqueSlug(name: string, excludeId?: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let i = 2;
  for (;;) {
    const existing = await prisma.organization.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${base}-${i}`.slice(0, 120);
    i += 1;
  }
}

export type OrganizationListItem = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  notes: string | null;
  emailDomains: string | null;
  createdAt: string;
  updatedAt: string;
  usersCount: number;
  pendingInvitationsCount: number;
};

export async function listOrganizations(): Promise<OrganizationListItem[]> {
  await expireDueInvitations();
  const rows = await prisma.organization.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          users: true,
          invitations: { where: { status: 'PENDING' } },
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    active: row.active,
    notes: row.notes,
    emailDomains: row.emailDomains,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    usersCount: row._count.users,
    pendingInvitationsCount: row._count.invitations,
  }));
}

export async function getOrganizationDetail(id: string) {
  await expireDueInvitations(id);
  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      users: {
        where: { archived: false },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          active: true,
          createdAt: true,
          lastLoginAt: true,
        },
      },
      invitations: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          status: true,
          expiresAt: true,
          acceptedAt: true,
          lastSentAt: true,
          createdAt: true,
          invitedBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      },
    },
  });

  if (!org) return null;

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    active: org.active,
    notes: org.notes,
    emailDomains: org.emailDomains,
    createdAt: org.createdAt.toISOString(),
    updatedAt: org.updatedAt.toISOString(),
    users: org.users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    })),
    invitations: org.invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      status: inv.status,
      expiresAt: inv.expiresAt.toISOString(),
      acceptedAt: inv.acceptedAt?.toISOString() ?? null,
      lastSentAt: inv.lastSentAt?.toISOString() ?? null,
      createdAt: inv.createdAt.toISOString(),
      invitedBy: inv.invitedBy,
    })),
  };
}

export async function listOrganizationCatalog() {
  const items = await listReferentialItems('organisations', { archived: false });
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    value: item.value ?? '',
  }));
}

export async function createOrganization(
  input: { name?: string; catalogId?: string; notes?: string; active?: boolean },
  actorId: string
) {
  let name = input.name?.trim() ?? '';
  if (input.catalogId) {
    const item = await getReferentialItemById(input.catalogId);
    if (!item || item.archived || item.categoryId !== 'organisations') {
      return { ok: false as const, error: 'NOT_IN_CATALOG' as const };
    }
    name = item.name.trim();
  }
  if (!name) return { ok: false as const, error: 'VALIDATION_ERROR' as const };
  if (input.catalogId) {
    const taken = await prisma.organization.findFirst({ where: { name }, select: { id: true } });
    if (taken) return { ok: false as const, error: 'ALREADY_EXISTS' as const };
  }

  const slug = await uniqueSlug(name);
  const org = await prisma.organization.create({
    data: {
      name,
      slug,
      notes: input.notes?.trim() || null,
      active: input.active ?? true,
    },
  });

  await writeAuditSafe(actorId, 'admin.organization.create', org.id, {
    name: org.name,
    slug: org.slug,
  });

  return { ok: true as const, organization: org };
}

export async function updateOrganization(
  id: string,
  patch: Partial<{ name: string; notes: string | null; active: boolean }>,
  actorId: string
) {
  const current = await prisma.organization.findUnique({ where: { id } });
  if (!current) return { ok: false as const, error: 'NOT_FOUND' as const };

  const data: { name?: string; slug?: string; notes?: string | null; active?: boolean } = {};
  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (!name) return { ok: false as const, error: 'VALIDATION_ERROR' as const };
    data.name = name;
    if (name !== current.name) {
      data.slug = await uniqueSlug(name, id);
    }
  }
  if (patch.notes !== undefined) {
    data.notes = patch.notes?.trim() || null;
  }
  if (patch.active !== undefined) {
    data.active = patch.active;
  }

  const org = await prisma.organization.update({ where: { id }, data });
  await writeAuditSafe(actorId, 'admin.organization.update', org.id, {
    patch: data,
  });

  return { ok: true as const, organization: org };
}
