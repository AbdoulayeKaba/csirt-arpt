import { NextResponse } from 'next/server';
import type { DgSessionContext } from '@/lib/auth/session-server';
import { getDgSession } from '@/lib/auth/session-server';
import type { DgRole } from '@/lib/dg/rbac';
import { isDgRole } from '@/lib/dg/role-ids';
import { getEffectivePermissionMap } from '@/lib/auth/effective-permissions';
import { roleHasPermission } from '@/lib/services/role-permissions-admin';
import type { RoleId } from '@/lib/dg/role-ids';

export async function userHasPermission(
  role: RoleId | DgRole,
  permissionId: string,
  userId?: string
): Promise<boolean> {
  if (!userId) return roleHasPermission(role, permissionId);
  try {
    const map = await getEffectivePermissionMap(userId, role);
    if (permissionId in map) return map[permissionId] === true;
  } catch (error) {
    console.error('[userHasPermission] repli sur le rôle', error);
  }
  return roleHasPermission(role, permissionId);
}

export async function requireApiPermission(
  permissionId: string,
  allowedRoles?: DgRole[],
  req?: Request
): Promise<
  | { session: DgSessionContext; error: null }
  | { session: null; error: NextResponse }
> {
  const session = await getDgSession(req);
  if (!session) {
    return {
      session: null,
      error: NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          message: 'Session expirée ou non reconnue. Reconnectez-vous puis réessayez.',
        },
        { status: 401 }
      ),
    };
  }
  // Rôles système : garde-fou optionnel. Les rôles personnalisés passent par la matrice de permissions.
  if (
    allowedRoles?.length &&
    isDgRole(session.role) &&
    !allowedRoles.includes(session.role)
  ) {
    return { session: null, error: NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }) };
  }
  const ok = await userHasPermission(session.role, permissionId, session.userId);
  if (!ok) {
    return { session: null, error: NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }) };
  }
  return { session, error: null };
}
