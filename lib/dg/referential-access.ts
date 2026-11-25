import { userHasPermission } from '@/lib/auth/permission-guard'
import type { DgRole } from '@/lib/dg/rbac'
import type { RoleId } from '@/lib/dg/role-ids'

/** Lecture / écriture référentiels : menu admin ou action fine, y compris les ajouts de groupe. */
export async function canManageReferentials(role: RoleId | DgRole, userId?: string): Promise<boolean> {
  if (await userHasPermission(role, 'action.referentiel.edit', userId)) return true
  return userHasPermission(role, 'menu.admin.referentiels', userId)
}
