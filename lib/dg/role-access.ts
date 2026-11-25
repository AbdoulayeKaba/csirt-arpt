import type { DgRole } from '@/lib/dg/rbac';
import { hasAnyAdminMenuPermission } from '@/lib/dg/permission-catalog';
import { isDgRole, type RoleId } from '@/lib/dg/role-ids';

export function hasAnyPermission(
  permissionMap: Record<string, boolean>,
  permissionIds: string[]
): boolean {
  return permissionIds.some((id) => Boolean(permissionMap[id]));
}

/** Rôle métier effectif pour les helpers RBAC (rôles personnalisés inclus). */
export function resolveEffectiveDgRole(
  roleId: RoleId,
  permissionMap: Record<string, boolean>
): DgRole {
  if (isDgRole(roleId)) return roleId;
  if (hasAnyAdminMenuPermission(permissionMap) || permissionMap['admin.platform']) {
    return 'ASSISTANT';
  }
  return 'EXTERNAL';
}

/** Page d'accueil après connexion selon les permissions effectives. */
export function homePathForPermissions(_permissionMap: Record<string, boolean>): string {
  return '/dashboard';
}
