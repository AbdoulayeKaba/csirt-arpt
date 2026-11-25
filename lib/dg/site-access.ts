import { userHasPermission } from '@/lib/auth/permission-guard'
import {
  SITE_ACTION_PERMISSION_IDS,
  SITE_MENU_PERMISSION_IDS,
} from '@/lib/dg/permission-catalog'
import type { DgRole } from '@/lib/dg/rbac'
import type { RoleId } from '@/lib/dg/role-ids'

/** Édition CMS site : action fine OU au moins un menu Site public. */
export async function canEditSiteContent(role: RoleId | DgRole): Promise<boolean> {
  for (const id of SITE_ACTION_PERMISSION_IDS) {
    if (await userHasPermission(role, id)) return true
  }
  for (const id of SITE_MENU_PERMISSION_IDS) {
    if (await userHasPermission(role, id)) return true
  }
  return userHasPermission(role, 'site.manage')
}

/** Côté client (matrice permissions déjà résolue). */
export function canEditSiteContentFromMap(permissions: Record<string, boolean> | undefined): boolean {
  if (!permissions) return false
  if (permissions['action.site.edit'] === true) return true
  if (permissions['site.manage'] === true) return true
  return SITE_MENU_PERMISSION_IDS.some((id) => permissions[id] === true)
}
