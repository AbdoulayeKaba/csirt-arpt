'use client';

import { useCallback, useEffect, useMemo, useState, Fragment } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Building2, Plus, Search, ShieldCheck, Trash2, Users } from 'lucide-react';
import { AdminConfirmDialog } from '@/components/admin/admin-confirm-dialog';
import { AdminUserRowActions } from '@/components/admin/admin-user-row-actions';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import {
  AdminEmptyTrashButton,
  AdminTrashBanner,
  AdminTrashEmptyState,
  AdminTrashScopeTabs,
} from '@/components/admin/admin-trash-ui';
import { CreateUserDialog } from '@/components/admin/create-user-dialog';
import { EditUserDialog } from '@/components/admin/edit-user-dialog';
import { UserRowDetailPanel } from '@/components/admin/user-row-detail-panel';
import { UserAvatar } from '@/components/admin/user-avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useAssignableRoles } from '@/hooks/use-assignable-roles';
import { useApp } from '@/lib/app-context';
import { dgRoleLabel } from '@/lib/dg/role-labels';
import { isDgRole, type RoleId } from '@/lib/dg/role-ids';
import { cn } from '@/lib/utils';

type UserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: RoleId;
  department: string;
  groups?: { id: string; name: string; active: boolean }[];
  deniedPermissionIds?: string[];
  phone: string;
  organizationName?: string;
  active: boolean;
  archived: boolean;
  archivedAt?: string | null;
  createdAt?: string;
  lastLoginAt?: string | null;
  twoFactorEnabled?: boolean;
};

type TabKey = 'active' | 'trash';
type Audience = 'platform' | 'correspondents';

function isCorrespondentRole(role: string) {
  return role.trim().toUpperCase() === 'CORRESPONDANT';
}

function formatLastLogin(value?: string | null): string {
  if (!value) return 'Jamais';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Jamais';
  return format(d, 'dd/MM/yyyy HH:mm', { locale: fr });
}

function formatUserDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return format(d, 'dd/MM/yyyy HH:mm', { locale: fr });
}

type UsersPayload = {
  ok: boolean;
  status: number;
  items: UserRow[];
  error?: string;
};

let usersRequest: { at: number; promise: Promise<UsersPayload> } | null = null;

function fetchUsers(force = false): Promise<UsersPayload> {
  if (!force && usersRequest && Date.now() - usersRequest.at < 4000) {
    return usersRequest.promise;
  }
  const promise = fetch('/api/admin/users')
    .then(async (res) => {
      const body = (await res.json().catch(() => ({}))) as { items?: UserRow[]; error?: string };
      return {
        ok: res.ok,
        status: res.status,
        items: body.items ?? [],
        error: body.error,
      };
    });
  usersRequest = { at: Date.now(), promise };
  return promise;
}

export default function AdminUsersPage() {
  const { permissions, roleLabel } = useApp();
  const viewerIsSuper = roleLabel
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim() === 'super administrateur';
  const canCreate = permissions['action.users.create'] === true;
  const canEdit = permissions['action.users.edit'] === true;
  const canDelete = permissions['action.users.delete'] === true;
  const { roles: assignableRoles } = useAssignableRoles(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const labelForRole = (roleId: RoleId) =>
    assignableRoles.find((r) => r.id === roleId)?.label ??
    (isDgRole(roleId) ? dgRoleLabel(roleId) : roleId);
  const [audience, setAudience] = useState<Audience>('platform');
  const [tab, setTab] = useState<TabKey>('active');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    | { type: 'toggleActive'; user: UserRow; nextActive: boolean }
    | { type: 'archive'; user: UserRow }
    | { type: 'delete'; user: UserRow }
    | { type: 'emptyTrash' }
    | { type: 'enableTwoFactorAll' }
    | { type: 'disableTwoFactorAll' }
    | { type: 'enableTwoFactorUser'; user: UserRow }
    | { type: 'disableTwoFactorUser'; user: UserRow }
    | null
  >(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const j = await fetchUsers(force);
      if (j.ok) {
        const items = j.items;
        setUsers(
          items.map((u) => ({
            ...u,
            department: u.department ?? '',
            groups: u.groups ?? [],
            deniedPermissionIds: u.deniedPermissionIds ?? [],
            phone: u.phone ?? '',
            organizationName: u.organizationName ?? '',
          }))
        );
        return;
      }
      toast({
        variant: 'destructive',
        title: 'Chargement impossible',
        description:
          j.error === 'LOAD_FAILED'
            ? 'Erreur serveur. Redémarrez le serveur après `npx prisma generate`.'
            : j.error ?? `Erreur ${j.status}`,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    setExpandedUserId(null);
  }, [audience, tab, search, roleFilter]);

  const platformActive = useMemo(
    () => users.filter((u) => !u.archived && !isCorrespondentRole(u.role)),
    [users]
  );
  const correspondentActive = useMemo(
    () => users.filter((u) => !u.archived && isCorrespondentRole(u.role)),
    [users]
  );
  const platformTrash = useMemo(
    () => users.filter((u) => u.archived && !isCorrespondentRole(u.role)),
    [users]
  );
  const correspondentTrash = useMemo(
    () => users.filter((u) => u.archived && isCorrespondentRole(u.role)),
    [users]
  );
  const activeUsers = audience === 'platform' ? platformActive : correspondentActive;
  const trashUsers = audience === 'platform' ? platformTrash : correspondentTrash;

  const filtered = useMemo(() => {
    const pool = tab === 'active' ? activeUsers : trashUsers;
    const q = search.trim().toLowerCase();
    const rows = pool.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (!q) return true;
      const hay = `${u.firstName} ${u.lastName} ${u.email} ${u.phone} ${(u.groups ?? []).map((group) => group.name).join(' ')} ${u.organizationName ?? ''} ${u.role}`.toLowerCase();
      return hay.includes(q);
    });

    return rows.sort((a, b) => {
      const aKey =
        tab === 'trash'
          ? a.archivedAt ?? a.createdAt ?? ''
          : a.createdAt ?? '';
      const bKey =
        tab === 'trash'
          ? b.archivedAt ?? b.createdAt ?? ''
          : b.createdAt ?? '';
      return new Date(bKey).getTime() - new Date(aKey).getTime();
    });
  }, [activeUsers, trashUsers, tab, search, roleFilter]);

  const patchUser = async (
    u: UserRow,
    patch: { active?: boolean; archived?: boolean },
    successTitle: string
  ) => {
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({
        variant: 'destructive',
        title: 'Modification impossible',
        description:
          j.error === 'LAST_ADMIN'
            ? 'Il doit rester au moins un administrateur actif.'
            : j.error === 'USER_ARCHIVED'
              ? 'Restaurez d’abord le compte depuis la corbeille.'
              : j.error === 'NOT_FOUND'
                ? 'Utilisateur introuvable.'
                : j.error === 'UPDATE_FAILED'
                  ? 'Mise à jour impossible. Redémarrez le serveur après `npx prisma generate`.'
                  : String(j.error ?? 'Échec'),
      });
      return false;
    }
    if (j.immediate === false) {
      toast({
        title: j.alreadyPending ? 'Demande déjà en attente' : 'Demande envoyée au super administrateur',
        description: j.alreadyPending
          ? 'Elle reste en attente pendant 3 jours.'
          : j.notified
            ? 'Un e-mail a été envoyé. Sans autorisation sous 3 jours, le correspondant reste actif.'
            : 'La demande reste en attente 3 jours. Aucun e-mail de super administrateur n’a pu être envoyé.',
      });
    } else {
      toast({ title: successTitle });
    }
    await load(true);
    return true;
  };

  const patchUserActive = (u: UserRow, active: boolean) =>
    patchUser(u, { active }, active ? 'Compte activé' : 'Compte désactivé');

  const archiveUser = (u: UserRow) =>
    patchUser(u, { archived: true }, 'Compte déplacé dans la corbeille');

  const restoreUser = (u: UserRow) =>
    patchUser(
      u,
      { archived: false, active: true },
      'Compte restauré et réactivé'
    );

  const deleteUserPermanent = async (u: UserRow) => {
    const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({
        variant: 'destructive',
        title: 'Suppression impossible',
        description:
          j.error === 'LAST_ADMIN'
            ? 'Il doit rester au moins un administrateur dans le système.'
            : j.error === 'CANNOT_DELETE_SELF'
              ? 'Vous ne pouvez pas supprimer votre propre compte.'
              : j.error === 'USER_NOT_ARCHIVED'
              ? 'Mettez d’abord le compte dans la corbeille avant suppression définitive.'
              : String(j.error ?? 'Échec'),
      });
      return false;
    }
    toast({ title: 'Utilisateur supprimé définitivement' });
    await load(true);
    return true;
  };

  const emptyTrash = async () => {
    const res = await fetch('/api/admin/users/trash', { method: 'POST' });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({
        variant: 'destructive',
        title: 'Échec',
        description: String(j.error ?? 'Impossible de vider la corbeille.'),
      });
      return false;
    }
    toast({
      title: 'Corbeille vidée',
      description: `${j.purged ?? 0} compte(s) supprimé(s)${j.skipped ? `, ${j.skipped} ignoré(s).` : '.'}`,
    });
    await load(true);
    return true;
  };

  const runConfirmAction = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      let ok = false;
      if (confirmAction.type === 'emptyTrash') {
        ok = await emptyTrash();
      } else if (confirmAction.type === 'enableTwoFactorAll') {
        ok = await enableTwoFactorForAll();
      } else if (confirmAction.type === 'disableTwoFactorAll') {
        ok = await disableTwoFactorForAll();
      } else if (confirmAction.type === 'enableTwoFactorUser') {
        ok = await setUserTwoFactor(confirmAction.user, 'enable');
      } else if (confirmAction.type === 'disableTwoFactorUser') {
        ok = await setUserTwoFactor(confirmAction.user, 'disable');
      } else if (confirmAction.type === 'toggleActive') {
        ok = await patchUserActive(confirmAction.user, confirmAction.nextActive);
      } else if (confirmAction.type === 'archive') {
        ok = await archiveUser(confirmAction.user);
      } else {
        ok = await deleteUserPermanent(confirmAction.user);
      }
      if (ok) setConfirmAction(null);
    } finally {
      setActionLoading(false);
    }
  };

  const openEdit = (u: UserRow) => {
    setExpandedUserId(null);
    setEditUser(u);
  };

  const toggleDetail = (u: UserRow) => {
    setExpandedUserId((id) => (id === u.id ? null : u.id));
  };

  const requestToggleActive = (u: UserRow) => {
    const nextActive = !u.active;
    if (nextActive) {
      void patchUserActive(u, true);
      return;
    }
    setConfirmAction({ type: 'toggleActive', user: u, nextActive: false });
  };

  const requestArchive = (u: UserRow) => {
    setConfirmAction({ type: 'archive', user: u });
  };

  const pendingTwoFactor = activeUsers.filter((u) => !u.twoFactorEnabled);
  const enabledTwoFactor = activeUsers.filter((u) => u.twoFactorEnabled);
  const allTwoFactorOn = activeUsers.length > 0 && pendingTwoFactor.length === 0;

  const applyTwoFactorForAll = async (action: 'enable' | 'disable') => {
    const userIds = (action === 'enable' ? pendingTwoFactor : enabledTwoFactor).map((u) => u.id);
    if (userIds.length === 0) return true;
    const res = await fetch('/api/admin/users/two-factor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, userIds }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({
        variant: 'destructive',
        title: action === 'enable' ? 'Activation impossible' : 'Désactivation impossible',
        description: String(j.error ?? 'L’action n’a pas pu être appliquée.'),
      });
      return false;
    }
    toast({
      title: action === 'enable' ? 'Double authentification activée' : 'Double authentification désactivée',
      description:
        action === 'enable'
          ? `${j.updated ?? userIds.length} compte(s) recevront un code par e-mail à la connexion.`
          : `${j.updated ?? userIds.length} compte(s) se connectent de nouveau avec le mot de passe seul.`,
    });
    await load(true);
    return true;
  };

  const enableTwoFactorForAll = () => applyTwoFactorForAll('enable');
  const disableTwoFactorForAll = () => applyTwoFactorForAll('disable');

  const setUserTwoFactor = async (user: UserRow, action: 'enable' | 'disable') => {
    const res = await fetch(`/api/admin/users/${user.id}/two-factor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({
        variant: 'destructive',
        title: action === 'enable' ? 'Activation impossible' : 'Désactivation impossible',
        description: String(j.error ?? 'L’action n’a pas pu être appliquée.'),
      });
      return false;
    }
    toast({
      title: action === 'enable' ? 'Double authentification activée' : 'Double authentification désactivée',
      description:
        action === 'enable'
          ? `${user.email} recevra un code par e-mail à la connexion.`
          : `${user.email} se connecte de nouveau avec le mot de passe seul.`,
    });
    await load(true);
    return true;
  };

  return (
    <div className="admin-users-page space-y-2.5">
      <AdminPageHeader
        variant="flat"
        title="Gestion des utilisateurs"
        description="Gérez les comptes utilisateurs et leurs permissions."
        actions={
          canCreate ? (
            <button
              type="button"
              className="admin-appt-header-btn admin-appt-header-btn--primary"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-3 w-3" aria-hidden />
              Nouvel utilisateur
            </button>
          ) : undefined
        }
      />

      <div
        className={cn(
          'admin-users-toolbar',
          tab === 'trash' && 'admin-trash-toolbar',
          audience === 'correspondents' && 'is-correspondents'
        )}
      >
        {tab === 'trash' ? (
          <AdminTrashBanner
            count={trashUsers.length}
            emptyHint={
              audience === 'correspondents'
                ? 'Aucun correspondant — espace prêt pour les comptes archivés'
                : 'Aucun compte — espace prêt pour les utilisateurs archivés'
            }
            filledHint={`${trashUsers.length} compte${trashUsers.length > 1 ? 's' : ''} — restaurables avant suppression définitive`}
          />
        ) : null}
        <div className="admin-tabs admin-users-audience">
          <div className="admin-trash-scope-tabs" role="tablist" aria-label="Type de compte">
            <button
              type="button"
              role="tab"
              aria-selected={audience === 'platform'}
              data-active={audience === 'platform'}
              className="admin-trash-scope-tab"
              onClick={() => setAudience('platform')}
            >
              <Users className="h-3 w-3" aria-hidden />
              Utilisateurs
              <span className="admin-trash-scope-tab-count">{platformActive.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={audience === 'correspondents'}
              data-active={audience === 'correspondents'}
              className="admin-trash-scope-tab"
              onClick={() => {
                setAudience('correspondents');
                setRoleFilter('all');
              }}
            >
              <Building2 className="h-3 w-3" aria-hidden />
              Correspondants
              <span className="admin-trash-scope-tab-count">{correspondentActive.length}</span>
            </button>
          </div>
          <AdminTrashScopeTabs
            value={tab}
            onChange={setTab}
            activeCount={activeUsers.length}
            trashCount={trashUsers.length}
          />
        </div>

        <div className="admin-search-field">
          <span className="admin-search-field-icon" aria-hidden>
            <Search className="h-3.5 w-3.5" />
          </span>
          <input
            type="search"
            placeholder={tab === 'trash' ? 'Rechercher dans la corbeille…' : 'Rechercher...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-search-field-input"
            aria-label="Rechercher un utilisateur"
          />
        </div>

        {audience === 'platform' ? (
        <div className="admin-filter-wrap admin-users-toolbar-role">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="admin-filter-select admin-filter-select--role">
              <SelectValue placeholder="Tous les rôles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les rôles</SelectItem>
              {assignableRoles.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        ) : null}

        <div className="admin-users-toolbar-end">
          {tab === 'active' && canEdit ? (
            <button
              type="button"
              className={cn('admin-users-2fa-all-btn', allTwoFactorOn && 'is-off')}
              disabled={activeUsers.length === 0 || actionLoading}
              title={
                allTwoFactorOn
                  ? 'Désactiver le code e-mail pour tous les comptes actifs de cette liste'
                  : 'Activer le code e-mail pour tous les comptes actifs de cette liste'
              }
              onClick={() =>
                setConfirmAction({ type: allTwoFactorOn ? 'disableTwoFactorAll' : 'enableTwoFactorAll' })
              }
            >
              <ShieldCheck aria-hidden />
              {allTwoFactorOn ? 'Désactiver la 2FA pour tous' : 'Activer la 2FA pour tous'}
            </button>
          ) : null}
          {tab === 'trash' && trashUsers.length > 0 && canDelete ? (
            <AdminEmptyTrashButton
              onClick={() => setConfirmAction({ type: 'emptyTrash' })}
            />
          ) : null}
        </div>
      </div>

      {tab === 'trash' ? null : (
        <p className="admin-users-hint">
          {audience === 'correspondents'
            ? 'Comptes des organisations partenaires. La double authentification s’active et se désactive uniquement ici.'
            : 'La double authentification s’active et se désactive uniquement ici. Désactiver un compte bloque la connexion.'}
        </p>
      )}

      <div
        className={cn(
          'admin-table-shell admin-users-table-shell',
          tab === 'trash' && 'admin-trash-table-wrap'
        )}
      >
        <div className="overflow-x-auto">
          <table className="admin-users-table w-full border-collapse">
            <thead>
              <tr className="admin-table-head">
                <th className="w-10 text-center text-[11px] font-medium text-muted-foreground">N°</th>
                <th>Utilisateur</th>
                <th>Rôle</th>
                <th>{audience === 'correspondents' ? 'Organisation' : 'Groupe(s)'}</th>
                <th>Téléphone</th>
                <th>Date de création</th>
                <th>{tab === 'trash' ? 'Mise en corbeille' : 'Dernière connexion'}</th>
                <th>Statut</th>
                <th>2FA</th>
                <th className="admin-users-actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="admin-table-row">
                  <td colSpan={10} className="admin-users-table-empty">
                    Chargement des comptes…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr className="admin-table-row">
                  <td colSpan={10} className="admin-users-table-empty">
                    {tab === 'trash' && !search.trim() ? (
                      <AdminTrashEmptyState
                        description="Les comptes mis en corbeille apparaîtront ici. Vous pourrez les restaurer ou les supprimer définitivement."
                        onBackToActive={() => setTab('active')}
                      />
                    ) : tab === 'trash' ? (
                      audience === 'correspondents'
                        ? 'Aucun correspondant dans la corbeille.'
                        : 'Aucun compte dans la corbeille.'
                    ) : audience === 'correspondents' ? (
                      'Aucun correspondant trouvé.'
                    ) : (
                      'Aucun utilisateur trouvé.'
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((u, index) => {
                  const expanded = expandedUserId === u.id;
                  return (
                    <Fragment key={u.id}>
                      <tr
                        className={
                          expanded
                            ? 'admin-table-row admin-users-row--expanded'
                            : 'admin-table-row'
                        }
                      >
                        <td className="w-10 text-center text-[11px] tabular-nums text-muted-foreground">{index + 1}</td>
                        <td>
                          <div className="admin-users-cell-user">
                            <UserAvatar firstName={u.firstName} lastName={u.lastName} size="xs" />
                            <div className="min-w-0">
                              <p className="admin-users-cell-name">
                                {u.firstName} {u.lastName}
                              </p>
                              <p className="admin-users-cell-email">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="admin-role-pill">{labelForRole(u.role)}</span>
                        </td>
                        <td className="text-[var(--admin-foreground)]">
                          {audience === 'correspondents'
                            ? u.organizationName || '—'
                            : (u.groups ?? []).map((group) => group.name).join(', ') || '—'}
                        </td>
                        <td className="tabular-nums text-muted-foreground">{u.phone || '—'}</td>
                        <td className="tabular-nums text-muted-foreground">
                          {formatUserDate(u.createdAt)}
                        </td>
                        <td className="tabular-nums text-muted-foreground">
                          {tab === 'trash'
                            ? formatUserDate(u.archivedAt)
                            : formatLastLogin(u.lastLoginAt)}
                        </td>
                        <td>
                          {u.active ? (
                            <span className="admin-status-active">Actif</span>
                          ) : (
                            <span className="admin-status-inactive">Inactif</span>
                          )}
                        </td>
                        <td>
                          {u.twoFactorEnabled ? (
                            <span className="admin-status-active">Activée</span>
                          ) : (
                            <span className="admin-status-inactive">Désactivée</span>
                          )}
                        </td>
                        <td className="admin-users-actions-col">
                          <AdminUserRowActions
                            variant={tab}
                            isActive={u.active}
                            detailExpanded={expanded}
                            permissions={permissions}
                            onView={() => toggleDetail(u)}
                            onEdit={() => openEdit(u)}
                            onToggleActive={() => requestToggleActive(u)}
                            onMoveToTrash={() => requestArchive(u)}
                            onRestore={() => void restoreUser(u)}
                            onDeletePermanent={() =>
                              setConfirmAction({ type: 'delete', user: u })
                            }
                            twoFactorEnabled={Boolean(u.twoFactorEnabled)}
                            onManageTwoFactor={
                              tab === 'active'
                                ? () =>
                                    setConfirmAction({
                                      type: u.twoFactorEnabled ? 'disableTwoFactorUser' : 'enableTwoFactorUser',
                                      user: u,
                                    })
                                : undefined
                            }
                          />
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="admin-users-detail-row">
                          <td colSpan={10}>
                            <UserRowDetailPanel
                              role={u.role}
                              canEdit={canEdit}
                              onEdit={() => openEdit(u)}
                            />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <p className="workspace-module-footer admin-users-table-footer" suppressHydrationWarning>
          <strong>{filtered.length}</strong>
          {' '}
          {audience === 'correspondents' ? 'correspondant' : 'utilisateur'}
          {filtered.length > 1 ? 's' : ''}
          {filtered.length !== (tab === 'active' ? activeUsers.length : trashUsers.length)
            ? ` (sur ${tab === 'active' ? activeUsers.length : trashUsers.length})`
            : ''}
          {tab === 'trash'
            ? ' · Corbeille'
            : audience === 'correspondents'
              ? ' · Correspondants'
              : ' · Actifs'}
        </p>
      </div>

      {canCreate ? (
        <CreateUserDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={load}
          existingUsers={users.map((u) => ({ id: u.id, email: u.email }))}
        />
      ) : null}

      {canEdit ? (
        <EditUserDialog
          user={editUser}
          open={!!editUser}
          onOpenChange={(o) => !o && setEditUser(null)}
          onSaved={load}
          existingUsers={users.map((u) => ({ id: u.id, email: u.email }))}
        />
      ) : null}

      <AdminConfirmDialog
        open={!!confirmAction}
        onOpenChange={(o) => !o && setConfirmAction(null)}
        title={
          confirmAction?.type === 'enableTwoFactorAll'
            ? 'Activer la double authentification ?'
            : confirmAction?.type === 'disableTwoFactorAll'
              ? 'Désactiver la double authentification ?'
            : confirmAction?.type === 'enableTwoFactorUser'
              ? 'Activer la double authentification ?'
            : confirmAction?.type === 'disableTwoFactorUser'
              ? 'Désactiver la double authentification ?'
            : confirmAction?.type === 'emptyTrash'
            ? 'Vider la corbeille ?'
            : confirmAction?.type === 'delete'
              ? 'Supprimer définitivement ?'
              : confirmAction?.type === 'archive'
                ? 'Mettre dans la corbeille ?'
                : confirmAction?.type === 'toggleActive' && !confirmAction.nextActive && isCorrespondentRole(confirmAction.user.role) && !viewerIsSuper
                  ? 'Demander la désactivation ?'
                  : confirmAction?.type === 'toggleActive' && !confirmAction.nextActive
                  ? 'Désactiver le compte ?'
                  : 'Confirmer la modification ?'
        }
        message={
          confirmAction ? (
            confirmAction.type === 'enableTwoFactorAll' ? (
              <>
                Le code à 6 chiffres par e-mail sera exigé à la connexion pour{' '}
                <strong>
                  {pendingTwoFactor.length} compte{pendingTwoFactor.length > 1 ? 's' : ''}
                </strong>
                . Les comptes déjà protégés ne changent pas.
              </>
            ) : confirmAction.type === 'disableTwoFactorAll' ? (
              <>
                La double authentification sera retirée pour{' '}
                <strong>
                  {enabledTwoFactor.length} compte{enabledTwoFactor.length > 1 ? 's' : ''}
                </strong>
                . Ils se connecteront de nouveau avec le mot de passe seul.
              </>
            ) : confirmAction.type === 'enableTwoFactorUser' ? (
              <>
                <strong>{confirmAction.user.email}</strong> recevra un code à 6 chiffres par e-mail à chaque connexion.
              </>
            ) : confirmAction.type === 'disableTwoFactorUser' ? (
              <>
                <strong>{confirmAction.user.email}</strong> se connectera de nouveau avec le mot de passe seul.
              </>
            ) : confirmAction.type === 'emptyTrash' ? (
              <>
                Tous les comptes archivés seront supprimés définitivement de la base. Le dernier
                administrateur éventuel sera conservé. Cette action est irréversible.
              </>
            ) : confirmAction.type === 'delete' ? (
              <>
                Le compte <strong>{confirmAction.user.email}</strong> sera supprimé de la base.
                Cette action est irréversible.
              </>
            ) : confirmAction.type === 'archive' ? (
              <>
                Le compte <strong>{confirmAction.user.email}</strong> sera archivé et déplacé dans
                l’onglet Corbeille. L’utilisateur ne pourra plus se connecter.
              </>
            ) : confirmAction.type === 'toggleActive' && !confirmAction.nextActive && isCorrespondentRole(confirmAction.user.role) && !viewerIsSuper ? (
              <>
                La désactivation de <strong>{confirmAction.user.email}</strong> sera transmise au super
                administrateur. Le compte reste actif pendant 3 jours, sauf s’il autorise avant.
              </>
            ) : confirmAction.type === 'toggleActive' && !confirmAction.nextActive ? (
              <>
                Le compte <strong>{confirmAction.user.email}</strong> sera désactivé. L’utilisateur
                ne pourra plus se connecter, mais le compte restera visible dans ce tableau avec le
                statut Inactif.
              </>
            ) : null
          ) : null
        }
        confirmLabel={
          confirmAction?.type === 'enableTwoFactorAll'
            ? 'Activer pour tous'
            : confirmAction?.type === 'disableTwoFactorAll'
              ? 'Désactiver pour tous'
            : confirmAction?.type === 'enableTwoFactorUser'
              ? 'Activer'
            : confirmAction?.type === 'disableTwoFactorUser'
              ? 'Désactiver'
            : confirmAction?.type === 'emptyTrash'
            ? 'Vider la corbeille'
            : confirmAction?.type === 'delete'
              ? 'Supprimer définitivement'
              : confirmAction?.type === 'archive'
                ? 'Mettre en corbeille'
                : confirmAction?.type === 'toggleActive' && !confirmAction.nextActive && isCorrespondentRole(confirmAction.user.role) && !viewerIsSuper
                  ? 'Confirmer la demande'
                  : confirmAction?.type === 'toggleActive' && !confirmAction.nextActive
                  ? 'Désactiver'
                  : 'Confirmer'
        }
        intent={
          confirmAction?.type === 'enableTwoFactorAll' || confirmAction?.type === 'enableTwoFactorUser'
            ? 'success'
            : 'destructive'
        }
        onConfirm={() => void runConfirmAction()}
        loading={actionLoading}
      />
    </div>
  );
}
