import {
  SITE_ACTION_PERMISSION_IDS,
  SITE_MENU_PERMISSION_IDS,
  PERMISSION_CATALOG,
  SETTINGS_ACTION_PERMISSION_IDS,
  USER_ACTION_PERMISSION_IDS,
} from '@/lib/dg/permission-catalog';

/** Menus → actions associées (désactivées en cascade si le menu est coupé). */
export const MENU_DEPENDENT_ACTIONS: Record<string, readonly string[]> = {
  'menu.admin.users': USER_ACTION_PERMISSION_IDS,
  'menu.admin.settings': SETTINGS_ACTION_PERMISSION_IDS,
  'menu.admin.referentiels': ['action.referentiel.edit'],
  ...Object.fromEntries(SITE_MENU_PERMISSION_IDS.map((id) => [id, SITE_ACTION_PERMISSION_IDS])),
};

const ACTION_PARENT_MENUS = new Map<string, string[]>();

for (const [menuId, actionIds] of Object.entries(MENU_DEPENDENT_ACTIONS)) {
  for (const actionId of actionIds) {
    const parents = ACTION_PARENT_MENUS.get(actionId) ?? [];
    if (!parents.includes(menuId)) parents.push(menuId);
    ACTION_PARENT_MENUS.set(actionId, parents);
  }
}

export function parentMenusForAction(actionId: string): string[] {
  return ACTION_PARENT_MENUS.get(actionId) ?? [];
}

export function isActionGatedByMenu(actionId: string, permMap: Record<string, boolean>): boolean {
  const parents = parentMenusForAction(actionId);
  if (parents.length === 0) return false;
  return parents.some((menuId) => permMap[menuId] === true);
}

/** Force les actions à false si aucun menu parent n’est actif. */
export function enforceMenuActionDependencies(
  permMap: Record<string, boolean>
): Record<string, boolean> {
  const next = { ...permMap };
  for (const perm of PERMISSION_CATALOG) {
    if (!perm.id.startsWith('action.')) continue;
    const parents = parentMenusForAction(perm.id);
    if (parents.length === 0) continue;
    if (!parents.some((menuId) => next[menuId] === true)) {
      next[perm.id] = false;
    }
  }
  return next;
}

/** Mises à jour lors du basculement d’un menu (désactivation en cascade). */
export function buildMenuPermissionUpdates(
  permMap: Record<string, boolean>,
  menuId: string,
  enabled: boolean
): Record<string, boolean> {
  const updates: Record<string, boolean> = { [menuId]: enabled };
  const deps = MENU_DEPENDENT_ACTIONS[menuId];
  if (!deps) return updates;

  if (enabled) {
    // Réactiver les actions liées quand on réouvre le menu.
    for (const actionId of deps) {
      updates[actionId] = true;
    }
    return updates;
  }

  for (const actionId of deps) {
    const parents = parentMenusForAction(actionId);
    const anotherParentStillOn = parents.some(
      (parentId) => parentId !== menuId && permMap[parentId] === true
    );
    if (!anotherParentStillOn) {
      updates[actionId] = false;
    }
  }
  return updates;
}

export function mergePermissionUpdates(
  permMap: Record<string, boolean>,
  updates: Record<string, boolean>
): Record<string, boolean> {
  return enforceMenuActionDependencies({ ...permMap, ...updates });
}
