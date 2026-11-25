'use client';

import { useEffect, useState } from 'react';
import { catalogByCategory } from '@/lib/dg/permission-catalog';
import { isRoleOnlyPermission } from '@/lib/auth/access-policy';

type GroupOption = { id: string; name: string; active: boolean };

export function UserGroupPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (groupIds: string[]) => void;
}) {
  const [groups, setGroups] = useState<GroupOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/admin/access-groups', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((json: { items?: GroupOption[] }) => {
        if (!cancelled) setGroups((json.items ?? []).filter((group) => group.active));
      })
      .catch(() => {
        if (!cancelled) setGroups([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="user-group-picker" role="group" aria-label="Groupes">
      {groups.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucun groupe actif.</p>
      ) : (
        groups.map((group) => (
          <label key={group.id}>
            <input
              type="checkbox"
              checked={value.includes(group.id)}
              onChange={(event) => {
                onChange(
                  event.target.checked ? [...value, group.id] : value.filter((id) => id !== group.id)
                );
              }}
            />
            {group.name}
          </label>
        ))
      )}
    </div>
  );
}

export function UserRestrictionPicker({
  value,
  onChange,
  lockRoleOnly,
}: {
  value: string[];
  onChange: (permissionIds: string[]) => void;
  lockRoleOnly: boolean;
}) {
  const categories = catalogByCategory();
  return (
    <div className="user-restriction-picker">
      <p>Une case cochée retire ce droit pour ce compte, même s’il vient du rôle ou d’un groupe.</p>
      {categories.map((category) => (
        <div key={category.id}>
          <p>{category.label}</p>
          <div>
            {category.permissions.map((permission) => {
              const locked = lockRoleOnly && isRoleOnlyPermission(permission.id);
              return (
                <label key={permission.id} className={locked ? 'is-locked' : undefined}>
                  <input
                    type="checkbox"
                    disabled={locked}
                    checked={value.includes(permission.id)}
                    onChange={(event) => {
                      onChange(
                        event.target.checked
                          ? [...value, permission.id]
                          : value.filter((id) => id !== permission.id)
                      );
                    }}
                  />
                  {permission.label}
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
