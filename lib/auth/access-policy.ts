import { PERMISSION_CATALOG } from '@/lib/dg/permission-catalog';

/**
 * Permissions qu’un groupe ne peut pas accorder.
 * Elles restent décidées par le rôle, pour empêcher une élévation
 * (administration, sécurité, suppression, audit).
 */
export const ROLE_ONLY_PERMISSION_IDS = [
  'menu.admin.users',
  'menu.admin.organizations',
  'menu.admin.roles',
  'menu.admin.referentiels',
  'menu.admin.settings',
  'menu.admin.audit',
  'action.users.view',
  'action.users.create',
  'action.users.edit',
  'action.users.toggle_active',
  'action.users.archive',
  'action.users.restore',
  'action.users.delete',
  'action.users.import',
  'action.organizations.view',
  'action.organizations.create',
  'action.organizations.edit',
  'action.organizations.toggle_active',
  'action.invitations.create',
  'action.invitations.resend',
  'action.invitations.cancel',
  'action.settings.general',
  'action.settings.notifications',
  'action.settings.security',
  'action.settings.integrations',
  'action.referentiel.edit',
  'action.incidents.delete',
] as const;

const ROLE_ONLY = new Set<string>(ROLE_ONLY_PERMISSION_IDS);
const CATALOG_IDS = new Set(PERMISSION_CATALOG.map((item) => item.id));

/** Un groupe peut ajouter ces droits opérationnels, en plus du rôle. */
export function isGroupGrantablePermission(permissionId: string): boolean {
  return CATALOG_IDS.has(permissionId) && !ROLE_ONLY.has(permissionId);
}

export function isRoleOnlyPermission(permissionId: string): boolean {
  return ROLE_ONLY.has(permissionId);
}

export function sanitizeGroupPermissionIds(permissionIds: string[]): {
  granted: string[];
  rejected: string[];
} {
  const granted: string[] = [];
  const rejected: string[] = [];
  for (const id of permissionIds) {
    if (isGroupGrantablePermission(id)) granted.push(id);
    else if (id.trim()) rejected.push(id);
  }
  return { granted: [...new Set(granted)], rejected: [...new Set(rejected)] };
}
