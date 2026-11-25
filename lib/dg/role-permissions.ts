import type { DgRole } from '@/lib/dg/rbac';
import { DEFAULT_ROLE_PERMISSIONS, PERMISSION_CATALOG, isVisiblePermissionId } from '@/lib/dg/permission-catalog';

/** Libellés des permissions actives (formulaire création utilisateur, fiche rôle). */
export function permissionsForRole(role: DgRole): string[] {
  const map = DEFAULT_ROLE_PERMISSIONS[role] ?? {};
  return PERMISSION_CATALOG.filter((p) => map[p.id] && isVisiblePermissionId(p.id)).map((p) => p.label);
}

export { PERMISSION_CATALOG, catalogByCategory } from '@/lib/dg/permission-catalog';
