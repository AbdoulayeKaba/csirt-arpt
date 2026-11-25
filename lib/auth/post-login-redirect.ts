import type { RoleId } from '@/lib/dg/role-ids';
import { isDgRole } from '@/lib/dg/role-ids';
import { homePathForPermissions } from '@/lib/dg/role-access';
import { getRolePermissionMap } from '@/lib/services/role-permissions-admin';

/** Redirection après connexion selon le rôle. */
export function homePathForRole(role: RoleId): string {
  if (role === 'CORRESPONDANT') return '/signalement';
  return '/dashboard';
}

export async function homePathForRoleId(role: RoleId): Promise<string> {
  if (role === 'CORRESPONDANT') return '/signalement';
  if (isDgRole(role)) return homePathForRole(role);
  const permissions = await getRolePermissionMap(role);
  return homePathForPermissions(permissions);
}
