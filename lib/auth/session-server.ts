import { cache } from 'react';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { parseRoleId, isDgRole, type RoleId } from '@/lib/dg/role-ids';
import { resolveEffectiveDgRole } from '@/lib/dg/role-access';
import { DEFAULT_ROLE_PERMISSIONS } from '@/lib/dg/permission-catalog';
import { DG_ROLE_META } from '@/lib/dg/role-meta';
import { isAuthDisabled } from '@/lib/auth/open-access';
import { isMockDataEnabled } from '@/lib/mock/config';
import { getDefaultGuestUser, mockFindUserById } from '@/lib/mock/users-store';
import { getEffectivePermissionMap } from '@/lib/auth/effective-permissions';
import { PORTAL_COOKIE, verifyPortalToken } from '@/lib/auth/portal-session';
import { getUserSessionVersion } from '@/lib/auth/user-session-version';
import { getRoleLabel } from '@/lib/services/role-permissions-admin';
import { getPlatformSettings } from '@/lib/services/platform-settings';
import { cookies } from 'next/headers';

function authSecret() {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
}

async function sessionFromJwt(req?: Request) {
  if (!req) return null;
  const token = await getToken({
    req: req as NextRequest,
    secret: authSecret(),
  });
  if (!token?.sub || (token as { invalid?: boolean }).invalid) return null;

  return {
    user: {
      id: token.sub,
      email: (token.email as string | undefined) ?? '',
      role: (token.role as RoleId | undefined) ?? 'MANAGER',
      firstName: (token.firstName as string | undefined) ?? '',
      lastName: (token.lastName as string | undefined) ?? '',
      department: (token.department as string | undefined) ?? '',
    },
  };
}

function dgSessionFromUserLike(user: {
  id: string;
  role: RoleId;
  email: string;
  firstName: string;
  lastName: string;
  department?: string | null;
  avatarUrl?: string | null;
}): DgSessionContext {
  return {
    userId: user.id,
    role: user.role,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    department: user.department ?? '',
    avatarUrl: user.avatarUrl ?? null,
  };
}

export type DgSessionContext = {
  userId: string;
  role: RoleId;
  email: string;
  firstName: string;
  lastName: string;
  department: string;
  avatarUrl?: string | null;
};

async function guestDgSession(): Promise<DgSessionContext> {
  if (!isMockDataEnabled()) {
    const assistant = await prisma.user.findFirst({
      where: { role: 'ASSISTANT' },
      orderBy: { email: 'asc' },
    });
    if (assistant) {
      return {
        userId: assistant.id,
        role: parseRoleId(assistant.role) ?? 'ASSISTANT',
        email: assistant.email,
        firstName: assistant.firstName,
        lastName: assistant.lastName,
        department: assistant.department ?? '',
        avatarUrl: assistant.avatarUrl ?? null,
      };
    }
  }

  const guest = getDefaultGuestUser();
  return {
    userId: guest.id,
    role: guest.role,
    email: guest.email,
    firstName: guest.firstName,
    lastName: guest.lastName,
    department: guest.department,
    avatarUrl: guest.avatarUrl ?? null,
  };
}

export async function getDgSession(req?: Request): Promise<DgSessionContext | null> {
  if (req) return loadDgSession(req)
  return getDgSessionCached()
}

/**
 * Session NextAuth réelle uniquement — sans repli « guest » (DISABLE_AUTH / mock).
 * Utilisé pour le signalement correspondant.
 */
export async function getAuthenticatedDgSession(req?: Request): Promise<DgSessionContext | null> {
  return loadDgSession(req, { allowGuest: false });
}

/** Session déclarant (cookie portail), sans reprendre la session équipe. */
export async function getCorrespondentSession(req?: Request): Promise<DgSessionContext | null> {
  const portal = await readPortalSession();
  if (portal) return portal;
  const legacy = await loadDgSession(req, { allowGuest: false, includeCorrespondent: true });
  return legacy?.role === 'CORRESPONDANT' ? legacy : null;
}

async function readPortalSession(): Promise<DgSessionContext | null> {
  const jar = await cookies();
  const raw = jar.get(PORTAL_COOKIE)?.value;
  if (!raw) return null;
  const payload = await verifyPortalToken(raw);
  if (!payload) return null;
  if (typeof payload.sessionVersion === 'number') {
    const settings = await getPlatformSettings();
    if (settings.sessionSinglePerUser) {
      const current = await getUserSessionVersion(payload.sub);
      if (current !== payload.sessionVersion) return null;
    }
  }
  return {
    userId: payload.sub,
    role: 'CORRESPONDANT',
    email: payload.email,
    firstName: payload.firstName,
    lastName: payload.lastName,
    department: payload.department,
  };
}

const getDgSessionCached = cache(() => loadDgSession())

async function loadDgSession(
  req?: Request,
  options?: { allowGuest?: boolean; includeCorrespondent?: boolean }
): Promise<DgSessionContext | null> {
  const allowGuest = options?.allowGuest !== false;
  const publish = (session: DgSessionContext | null) => {
    if (!options?.includeCorrespondent && session?.role === 'CORRESPONDANT') return null;
    return session;
  };
  let session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    session = (await sessionFromJwt(req)) ?? session;
  }
  if (!session?.user?.id) {
    return allowGuest && isAuthDisabled() ? guestDgSession() : null;
  }

  if (isMockDataEnabled()) {
    const mock = mockFindUserById(session.user.id);
    if (mock) {
      return publish(dgSessionFromUserLike(mock));
    }
    return publish(dgSessionFromUserLike({
      id: session.user.id,
      role: parseRoleId(String(session.user.role)) ?? 'MANAGER',
      email: session.user.email ?? '',
      firstName: session.user.firstName ?? '',
      lastName: session.user.lastName ?? '',
      department: session.user.department ?? '',
      avatarUrl: null,
    }));
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return publish(dgSessionFromUserLike({
      id: session.user.id,
      role: parseRoleId(String(session.user.role)) ?? 'MANAGER',
      email: session.user.email ?? '',
      firstName: session.user.firstName ?? '',
      lastName: session.user.lastName ?? '',
      department: session.user.department ?? '',
      avatarUrl: null,
    }));
  }

  return publish(dgSessionFromUserLike(user));
}

function fallbackRoleLabel(roleId: RoleId): string {
  if (isDgRole(roleId)) return DG_ROLE_META[roleId].label;
  return roleId;
}

function fallbackRolePermissions(roleId: RoleId): Record<string, boolean> {
  if (isDgRole(roleId)) return { ...DEFAULT_ROLE_PERMISSIONS[roleId] };
  return {};
}

/** Compatibilité layout existant (AppProvider). */
export const getServerSessionContext = cache(async () => {
  try {
    const dg = await getDgSession();
    if (!dg) return null;

    let permissions = fallbackRolePermissions(dg.role);
    let roleLabel = fallbackRoleLabel(dg.role);
    try {
      [permissions, roleLabel] = await Promise.all([
        getEffectivePermissionMap(dg.userId, dg.role),
        getRoleLabel(dg.role),
      ]);
    } catch {
      // Repli si la base des permissions est indisponible (évite un layout SSR en échec).
    }

    const effectiveDgRole = resolveEffectiveDgRole(dg.role, permissions);

    return {
      payload: { sub: dg.userId, appRole: 'employee' as const },
      appRole: 'employee' as const,
      employeeId: dg.userId,
      user: {
        id: dg.userId,
        email: dg.email,
        firstName: dg.firstName,
        lastName: dg.lastName,
        role: 'analyste' as const,
        avatar: dg.avatarUrl ?? undefined,
        permissions: [],
        perimeter: { countries: [], themes: [] },
        // Chaîne ISO : seules les props sérialisables peuvent passer au AppProvider (client).
        createdAt: new Date().toISOString(),
      },
      roleId: dg.role,
      roleLabel,
      permissions,
      dgRole: effectiveDgRole,
    };
  } catch {
    return null;
  }
});
