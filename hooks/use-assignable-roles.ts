'use client';

import { useEffect, useState } from 'react';
import type { AssignableRoleOption } from '@/lib/services/assignable-roles';

let rolesMemory: AssignableRoleOption[] | null = null
let rolesInflight: Promise<AssignableRoleOption[]> | null = null

function loadAssignableRoles() {
  if (rolesMemory) return Promise.resolve(rolesMemory)
  if (!rolesInflight) {
    rolesInflight = fetch('/api/admin/roles/assignable')
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { roles?: AssignableRoleOption[] } | null) => {
        if (!j) throw new Error('roles')
        rolesMemory = j.roles ?? []
        return rolesMemory
      })
      .catch(() => [] as AssignableRoleOption[])
      .finally(() => {
        rolesInflight = null
      })
  }
  return rolesInflight
}

/** À appeler après création, suppression ou archivage d’un rôle. */
export function invalidateAssignableRoles() {
  rolesMemory = null;
}

/** Charge les rôles actifs assignables (système + personnalisés). */
export function useAssignableRoles(enabled: boolean) {
  const [roles, setRoles] = useState<AssignableRoleOption[]>(() => (enabled ? rolesMemory ?? [] : []));
  const [loading, setLoading] = useState(enabled && !rolesMemory);

  useEffect(() => {
    if (!enabled) {
      setRoles([]);
      setLoading(false);
      return;
    }
    if (rolesMemory) {
      setRoles(rolesMemory);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void loadAssignableRoles()
      .then((next) => {
        if (!cancelled) setRoles(next);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { roles, loading };
}
