import { PERMISSION_CATALOG, isVisiblePermissionId } from '@/lib/dg/permission-catalog';
import { permissionsForRole } from '@/lib/dg/role-permissions';
import { isDgRole, type RoleId } from '@/lib/dg/role-ids';

export function rolePermissionLabels(
  map: Record<string, boolean> | undefined,
  roleId: RoleId
): string[] {
  if (map) {
    const labels = PERMISSION_CATALOG.filter((p) => map[p.id] && isVisiblePermissionId(p.id)).map((p) => p.label);
    if (labels.length > 0) return labels;
  }
  return isDgRole(roleId) ? permissionsForRole(roleId) : [];
}
