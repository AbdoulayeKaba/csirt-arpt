'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Search, Shield } from 'lucide-react';
import { CategoryIcon } from '@/components/admin/category-icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { isRoleOnlyPermission } from '@/lib/auth/access-policy';
import { catalogByCategory } from '@/lib/dg/permission-catalog';
import { cn } from '@/lib/utils';

type Member = { id: string; firstName: string; lastName: string; email: string };
type AccessGroup = {
  id: string;
  name: string;
  description: string;
  active: boolean;
  roleId: string | null;
  permissionIds: string[];
  members: Member[];
};
type RoleOption = { id: string; label: string; permissionIds: string[] };
type StaffUser = { id: string; firstName: string; lastName: string; email: string; role: string; archived?: boolean };

type Props = {
  createToken?: number;
};

const EMPTY = {
  name: '',
  description: '',
  active: true,
  roleId: '',
  permissionIds: [] as string[],
  userIds: [] as string[],
};

export function AccessGroupsPanel({ createToken = 0 }: Props) {
  const [groups, setGroups] = useState<AccessGroup[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'fiche' | 'users' | 'rights'>('fiche');

  const catalog = useMemo(() => catalogByCategory(), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [groupsRes, usersRes] = await Promise.all([
        fetch('/api/admin/access-groups', { cache: 'no-store' }),
        fetch('/api/admin/users', { cache: 'no-store' }),
      ]);
      const groupsJson = groupsRes.ok ? await groupsRes.json() : { items: [] };
      const usersJson = usersRes.ok ? await usersRes.json() : { items: [] };
      setGroups((groupsJson.items ?? []) as AccessGroup[]);
      setRoles(
        ((groupsJson.roles ?? []) as RoleOption[]).filter((role) => role.id !== 'CORRESPONDANT')
      );
      setStaff(
        ((usersJson.items ?? []) as StaffUser[]).filter(
          (user) => user.role !== 'CORRESPONDANT' && !user.archived
        )
      );
      if (!groupsRes.ok) {
        toast({ variant: 'destructive', title: 'Groupes indisponibles' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Groupes indisponibles' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((group) =>
      `${group.name} ${group.description}`.toLowerCase().includes(q)
    );
  }, [groups, search]);

  const applyGroup = useCallback((group: AccessGroup) => {
    setSelectedId(group.id);
    setForm({
      name: group.name,
      description: group.description,
      active: group.active,
      roleId: group.roleId && group.roleId !== 'CORRESPONDANT' ? group.roleId : '',
      permissionIds: group.permissionIds,
      userIds: group.members.map((member) => member.id),
    });
  }, []);

  const startCreate = useCallback(() => {
    setSelectedId('new');
    setForm(EMPTY);
    setMemberSearch('');
    setView('fiche');
  }, []);

  useEffect(() => {
    if (createToken < 1) return;
    startCreate();
  }, [createToken, startCreate]);

  useEffect(() => {
    if (selectedId === 'new') return;
    if (filtered.length === 0) {
      if (selectedId && !groups.some((group) => group.id === selectedId)) setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((group) => group.id === selectedId)) {
      applyGroup(filtered[0]);
    }
  }, [applyGroup, filtered, groups, selectedId]);

  const toggleId = (list: string[], id: string) =>
    list.includes(id) ? list.filter((item) => item !== id) : [...list, id];

  const save = async () => {
    if (form.name.trim().length < 2) {
      toast({ variant: 'destructive', title: 'Indiquez un nom de groupe' });
      return;
    }
    setSaving(true);
    try {
      const editing = selectedId && selectedId !== 'new';
      const res = await fetch(editing ? `/api/admin/access-groups/${selectedId}` : '/api/admin/access-groups', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          active: form.active,
          roleId: form.roleId || null,
          permissionIds: form.permissionIds.filter((id) => !isRoleOnlyPermission(id)),
          userIds: form.userIds,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Enregistrement impossible',
          description:
            res.status === 403
              ? 'Votre compte ne peut pas modifier les groupes.'
              : 'Vérifiez le nom du groupe, puis réessayez.',
        });
        return;
      }
      if (Array.isArray(json.rejected) && json.rejected.length > 0) {
        toast({
          title: editing ? 'Groupe mis à jour' : 'Groupe créé',
          description: 'Les droits d’administration restent réservés au rôle.',
        });
      } else {
        toast({ title: editing ? 'Groupe mis à jour' : 'Groupe créé' });
      }
      const savedId = typeof json.group?.id === 'string' ? json.group.id : selectedId;
      await load();
      if (savedId && savedId !== 'new') setSelectedId(savedId);
    } finally {
      setSaving(false);
    }
  };

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === form.roleId) ?? null,
    [form.roleId, roles]
  );
  const rolePermissionIds = useMemo(
    () => new Set(selectedRole?.permissionIds ?? []),
    [selectedRole]
  );

  const visibleStaff = useMemo(() => {
    if (!form.roleId) return [];
    const q = memberSearch.trim().toLowerCase();
    return staff.filter((user) => {
      if (user.role !== form.roleId) return false;
      if (!q) return true;
      return `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase().includes(q);
    });
  }, [form.roleId, memberSearch, staff]);

  return (
    <div className="admin-roles-layout access-groups">
      <aside className="admin-roles-sidebar admin-table-shell flex flex-col">
        <div className="admin-roles-sidebar-toolbar">
          <p className="text-xs font-semibold text-[var(--admin-foreground)]">Groupes d’accès</p>
        </div>
        <div className="admin-roles-sidebar-search">
          <Search className="admin-roles-sidebar-search-icon" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un groupe…"
            className="admin-roles-sidebar-search-input"
            aria-label="Rechercher un groupe"
          />
        </div>
        <div className="admin-roles-sidebar-list">
          {loading ? (
            <p className="admin-roles-sidebar-empty">
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            </p>
          ) : filtered.length === 0 ? (
            <p className="admin-roles-sidebar-empty">Aucun groupe. Créez-en un pour ajouter des droits opérationnels.</p>
          ) : (
            <ul className="access-groups-index">
              {filtered.map((group) => {
                const roleLabel =
                  roles.find((role) => role.id === group.roleId)?.label || 'Sans rôle';
                return (
                  <li key={group.id}>
                    <button
                      type="button"
                      onClick={() => applyGroup(group)}
                      className={selectedId === group.id ? 'is-current' : undefined}
                      aria-current={selectedId === group.id ? 'true' : undefined}
                    >
                      <span>{group.name}</span>
                      <small>
                        {roleLabel}
                        {' · '}
                        {group.members.length} membre{group.members.length > 1 ? 's' : ''}
                        {group.active ? '' : ' · inactif'}
                      </small>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {selectedId ? (
        <div className={cn('admin-roles-panel admin-table-shell relative flex flex-col', saving && 'admin-panel-saving')}>
          <div className="access-groups-tabs" role="tablist" aria-label="Détail du groupe">
            <button type="button" role="tab" aria-selected={view === 'fiche'} onClick={() => setView('fiche')}>
              Fiche
            </button>
            <button type="button" role="tab" aria-selected={view === 'users'} onClick={() => setView('users')}>
              Utilisateurs
              <b>{visibleStaff.length}</b>
            </button>
            <button type="button" role="tab" aria-selected={view === 'rights'} onClick={() => setView('rights')}>
              Droits
            </button>
          </div>
          <div className="admin-roles-panel-body flex-1 overflow-y-auto">
            {view === 'fiche' ? (
              <div className="access-groups-fiche">
                <div className="access-groups-fiche-grid">
                  <label>
                    <span>Nom</span>
                    <Input
                      id="group-name"
                      className="access-groups-field"
                      value={form.name}
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Rôle</span>
                    <select
                      className="access-groups-role"
                      value={form.roleId}
                      onChange={(event) => setForm((current) => ({ ...current, roleId: event.target.value }))}
                      aria-label="Rôle du groupe"
                    >
                      <option value="">Choisir un rôle</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  <span>Description</span>
                  <textarea
                    id="group-description"
                    className="access-groups-field"
                    rows={2}
                    maxLength={500}
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  />
                </label>
              </div>
            ) : null}

            {view === 'users' ? (
              <div className="access-groups-members">
                <Input
                  value={memberSearch}
                  className="h-8 rounded-md px-2 text-xs"
                  onChange={(event) => setMemberSearch(event.target.value)}
                  placeholder={
                    selectedRole ? `Rechercher dans ${selectedRole.label}…` : 'Choisissez d’abord un rôle dans Fiche'
                  }
                  aria-label="Rechercher un membre"
                />
                <div className="access-groups-members-list">
                  {visibleStaff.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {form.roleId
                        ? 'Aucun utilisateur n’a ce rôle.'
                        : 'Choisissez un rôle pour afficher ses utilisateurs.'}
                    </p>
                  ) : (
                    visibleStaff.map((user) => (
                      <label key={user.id} className="access-groups-member">
                        <input
                          type="checkbox"
                          checked={form.userIds.includes(user.id)}
                          onChange={() =>
                            setForm((current) => ({ ...current, userIds: toggleId(current.userIds, user.id) }))
                          }
                        />
                        <span>
                          <strong>
                            {user.firstName} {user.lastName}
                          </strong>
                          <small>{user.email}</small>
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            ) : null}

            {view === 'rights' ? (
              <table className="access-groups-table">
                <thead>
                  <tr>
                    <th>Droit</th>
                    <th>Décision</th>
                  </tr>
                </thead>
                <tbody>
                  {catalog.map((section) => (
                    <Fragment key={section.id}>
                      <tr className="access-groups-table-group">
                        <th colSpan={2} scope="colgroup">
                          <CategoryIcon icon={section.icon} className="text-[var(--admin-primary)]" />
                          {section.label}
                        </th>
                      </tr>
                      {section.permissions.map((permission) => {
                        const fromRole = rolePermissionIds.has(permission.id);
                        const reserved = !fromRole && isRoleOnlyPermission(permission.id);
                        const added = !fromRole && !reserved && form.permissionIds.includes(permission.id);
                        return (
                          <tr key={permission.id}>
                            <td>{permission.label}</td>
                            <td>
                              {fromRole ? (
                                'Inclus dans le rôle'
                              ) : reserved ? (
                                'Réservé au rôle'
                              ) : (
                                <Switch
                                  checked={added}
                                  disabled={saving}
                                  onCheckedChange={() =>
                                    setForm((current) => ({
                                      ...current,
                                      permissionIds: toggleId(current.permissionIds, permission.id),
                                    }))
                                  }
                                  className="admin-perm-switch"
                                  aria-label={permission.label}
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            ) : null}
          </div>
          <div className="access-groups-foot">
            <label className="access-groups-active">
              <span>{form.active ? 'Groupe actif' : 'Groupe inactif'}</span>
              <Switch
                checked={form.active}
                onCheckedChange={(active) => setForm((current) => ({ ...current, active }))}
                className="admin-perm-switch"
              />
            </label>
            <button type="button" className="access-groups-save" disabled={saving} onClick={() => void save()}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      ) : (
        <div className="admin-roles-panel admin-table-shell flex items-center justify-center p-12 text-sm text-muted-foreground">
          <div className="max-w-sm text-center">
            <Shield className="mx-auto mb-2 h-5 w-5" aria-hidden />
            <p>Créez un groupe pour accorder des droits opérationnels en plus du rôle.</p>
            <Button type="button" className="mt-3" onClick={startCreate}>
              Nouveau groupe
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
