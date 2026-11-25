import { resolveEffectivePermissionMap } from '@/lib/dg/expand-menu-permissions';
import { enforceMenuActionDependencies } from '@/lib/dg/permission-menu-deps';
import type { RoleId } from '@/lib/dg/role-ids';
import { isRoleOnlyPermission } from '@/lib/auth/access-policy';
import { listGrantIdsForUser, listDeniedPermissionIds } from '@/lib/services/access-groups';
import { getRolePermissionMap } from '@/lib/services/role-permissions-admin';

/**
 * Permissions effectives :
 * rôle, puis ajouts opérationnels des groupes actifs, puis retraits individuels.
 * Un groupe ne peut pas réintroduire une permission réservée au rôle.
 * Le rôle super administrateur ne peut pas se retirer ses permissions critiques.
 */
export async function getEffectivePermissionMap(
  userId: string,
  role: RoleId
): Promise<Record<string, boolean>> {
  const roleCatalog = await getRolePermissionMap(role);
  const merged: Record<string, boolean> = { ...roleCatalog };
  const grants = await listGrantIdsForUser(userId);
  for (const id of grants) {
    if (!isRoleOnlyPermission(id)) merged[id] = true;
  }
  const withDeps = enforceMenuActionDependencies(merged);
  for (const id of Object.keys(withDeps)) {
    if (isRoleOnlyPermission(id) && roleCatalog[id] !== true) withDeps[id] = false;
  }
  const denies = await listDeniedPermissionIds(userId);
  for (const id of denies) {
    if (role === 'ASSISTANT' && isRoleOnlyPermission(id)) continue;
    withDeps[id] = false;
  }
  return resolveEffectivePermissionMap(withDeps);
}
