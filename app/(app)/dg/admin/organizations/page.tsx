'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Columns3,
  Download,
  Filter,
  Loader2,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  Users,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { CorrespondentDeactivationInbox } from '@/components/admin/correspondent-deactivation-inbox';
import { OrganizationDeactivationInbox } from '@/components/admin/organization-deactivation-inbox';
import { OrganizationsDetailPanel } from '@/components/admin/organizations-detail-panel';
import '@/components/admin/organizations-desk.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useApp } from '@/lib/app-context';
import { cn } from '@/lib/utils';

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  usersCount: number;
  pendingInvitationsCount: number;
};

type OrgDetail = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  users: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    active: boolean;
    createdAt: string;
    lastLoginAt: string | null;
  }>;
  invitations: Array<{
    id: string;
    email: string;
    status: string;
    expiresAt: string;
    acceptedAt: string | null;
    lastSentAt: string | null;
    createdAt: string;
    invitedBy: { firstName: string; lastName: string; email: string } | null;
  }>;
  deactivationActor?: 'admin' | 'super' | null;
  pendingDeactivation?: { id: string; requestedAt: string; expiresAt: string; requestedByName: string } | null;
  deactivationTrace?: {
    requestedAt: string;
    requestedByName: string;
    decidedAt: string | null;
    decidedByName: string | null;
    status?: string;
  } | null;
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return format(d, 'dd/MM/yyyy HH:mm', { locale: fr });
}

function formatActivity(value?: string | null, long = false) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return format(d, long ? "d MMMM yyyy 'à' HH:mm" : "d MMM yyyy 'à' HH:mm", { locale: fr });
}

function SortLabel({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: 'asc' | 'desc';
  onClick: () => void;
}) {
  return (
    <button type="button" className={cn('org-sort', active && 'is-on')} onClick={onClick}>
      {label}
      <em aria-hidden>{active ? (dir === 'asc' ? '↑' : '↓') : '↕'}</em>
    </button>
  );
}

function StatCard({
  tone,
  icon,
  value,
  label,
  bars,
}: {
  tone: string;
  icon: ReactNode;
  value: number;
  label: string;
  bars: number[];
}) {
  return (
    <article className={cn('org-stat', tone)}>
      <div>
        <span className="org-stat__icon">{icon}</span>
        <strong>{value}</strong>
        <p>{label}</p>
      </div>
      <span className="org-stat__bars" aria-hidden>
        {bars.map((height, index) => (
          <i key={index} style={{ height: `${height}%` }} />
        ))}
      </span>
    </article>
  );
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  ACCEPTED: 'Acceptée',
  EXPIRED: 'Inactive',
  CANCELLED: 'Annulée',
};

export default function AdminOrganizationsPage() {
  const { permissions } = useApp();
  const canCreate = permissions['action.organizations.create'] === true;
  const canEdit = permissions['action.organizations.edit'] === true;
  const canToggle = permissions['action.organizations.toggle_active'] === true;
  const canInvite = permissions['action.invitations.create'] === true;
  const canResend = permissions['action.invitations.resend'] === true;
  const canCancel = permissions['action.invitations.cancel'] === true;
  const canToggleUser = permissions['action.users.toggle_active'] === true;

  const [items, setItems] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrgDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [catalog, setCatalog] = useState<Array<{ id: string; name: string }>>([]);
  const [expiryHours, setExpiryHours] = useState(72);
  const [createOpen, setCreateOpen] = useState(false);
  const [catalogId, setCatalogId] = useState('');
  const [createNotes, setCreateNotes] = useState('');
  const [createBusy, setCreateBusy] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editBusy, setEditBusy] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sort, setSort] = useState<{ key: 'name' | 'active' | 'users' | 'invites' | 'activity'; dir: 'asc' | 'desc' }>({
    key: 'name',
    dir: 'asc',
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailTab, setDetailTab] = useState<'info' | 'users' | 'invites'>('info');
  const [checked, setChecked] = useState<string[]>([]);
  const [visibleCols, setVisibleCols] = useState({
    statut: true,
    correspondants: true,
    invitations: true,
    activite: true,
  });
  const autoSelected = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/organizations');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Chargement impossible',
          description: json.error ?? `Erreur ${res.status}`,
        });
        return;
      }
      setItems(json.items ?? []);
      setCatalog(json.catalog ?? []);
      if (typeof json.expiryHours === 'number' && json.expiryHours > 0) {
        setExpiryHours(json.expiryHours);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/organizations/${id}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Détail indisponible',
          description: json.error ?? `Erreur ${res.status}`,
        });
        setDetail(null);
        return;
      }
      setDetail(json.organization);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId, loadDetail]);

  useEffect(() => {
    if (autoSelected.current || items.length === 0) return;
    autoSelected.current = true;
    setSelectedId(items[0].id);
    setChecked([items[0].id]);
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((o) => {
      if (statusFilter === 'active' && !o.active) return false;
      if (statusFilter === 'inactive' && o.active) return false;
      if (!q) return true;
      return (
        o.name.toLowerCase().includes(q) ||
        o.slug.toLowerCase().includes(q) ||
        (o.notes ?? '').toLowerCase().includes(q)
      );
    }).sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1;
      if (sort.key === 'name') return a.name.localeCompare(b.name, 'fr') * dir;
      if (sort.key === 'active') return (Number(a.active) - Number(b.active)) * dir;
      if (sort.key === 'users') return (a.usersCount - b.usersCount) * dir;
      if (sort.key === 'invites') return (a.pendingInvitationsCount - b.pendingInvitationsCount) * dir;
      return ((Date.parse(a.updatedAt) || 0) - (Date.parse(b.updatedAt) || 0)) * dir;
    });
  }, [items, search, statusFilter, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filtered.length);

  const stats = useMemo(
    () => ({
      active: items.filter((o) => o.active).length,
      users: items.reduce((sum, o) => sum + o.usersCount, 0),
      invites: items.reduce((sum, o) => sum + o.pendingInvitationsCount, 0),
    }),
    [items]
  );

  const exportCsv = () => {
    const rows = filtered.filter((o) => checked.length === 0 || checked.includes(o.id));
    const header = ['Organisation', 'Statut', 'Correspondants', 'Invitations', 'Dernière activité'];
    const lines = rows.map((o) =>
      [o.name, o.active ? 'Active' : 'Inactive', String(o.usersCount), String(o.pendingInvitationsCount), formatActivity(o.updatedAt)]
        .map((cell) => `"${cell.replace(/"/g, '""')}"`)
        .join(';')
    );
    const blob = new Blob([[header.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'organisations-partenaires.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreate = async () => {
    setCreateBusy(true);
    try {
      const res = await fetch('/api/admin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catalogId, notes: createNotes || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Création impossible',
          description:
            json.error === 'NOT_IN_CATALOG'
              ? 'Cette organisation n’est pas dans le référentiel.'
              : json.error === 'ALREADY_EXISTS'
                ? 'Cette organisation est déjà partenaire.'
                : json.error ?? `Erreur ${res.status}`,
        });
        return;
      }
      toast({ title: 'Organisation créée', description: json.organization?.name });
      setCreateOpen(false);
      setCatalogId('');
      setCreateNotes('');
      await load();
      if (json.organization?.id) setSelectedId(json.organization.id);
    } finally {
      setCreateBusy(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedId) return;
    setEditBusy(true);
    try {
      const res = await fetch(`/api/admin/organizations/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: editNotes }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Modification impossible',
          description: json.error ?? `Erreur ${res.status}`,
        });
        return;
      }
      toast({ title: 'Organisation mise à jour' });
      setEditOpen(false);
      await Promise.all([load(), loadDetail(selectedId)]);
    } finally {
      setEditBusy(false);
    }
  };

  const handleToggleActive = async () => {
    if (!detail || !canToggle) return;
    setActionBusy('toggle');
    try {
      const res = await fetch(`/api/admin/organizations/${detail.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !detail.active }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Action impossible',
          description: json.error ?? `Erreur ${res.status}`,
        });
        return;
      }
      if (json.immediate === false) {
        toast({
          title: json.alreadyPending ? 'Demande déjà en attente' : 'Demande envoyée au super administrateur',
          description: json.alreadyPending
            ? 'Elle reste en attente pendant 3 jours.'
            : json.notified
              ? 'Un e-mail a été envoyé. Sans autorisation sous 3 jours, l’organisation reste active.'
              : 'La demande reste en attente 3 jours. Aucun e-mail de super administrateur n’a pu être envoyé.',
        });
      } else {
        toast({
          title: detail.active ? 'Organisation désactivée' : 'Organisation activée',
        });
      }
      await Promise.all([load(), loadDetail(detail.id)]);
    } finally {
      setActionBusy(null);
    }
  };

  const handleInvite = async () => {
    if (!selectedId) return;
    setInviteBusy(true);
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: selectedId, email: inviteEmail }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Invitation impossible',
          description: json.error ?? `Erreur ${res.status}`,
        });
        return;
      }
      toast({
        title: 'Invitation envoyée',
        description: json.emailSent
          ? `E-mail transmis à ${json.invitation?.email}`
          : `Invitation créée pour ${json.invitation?.email} (e-mail non confirmé — vérifier SMTP).`,
      });
      setInviteOpen(false);
      setInviteEmail('');
      await Promise.all([load(), loadDetail(selectedId)]);
    } finally {
      setInviteBusy(false);
    }
  };

  const handleResend = async (invitationId: string) => {
    setActionBusy(invitationId);
    try {
      const res = await fetch(`/api/admin/invitations/${invitationId}/resend`, {
        method: 'POST',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Renvoi impossible',
          description: json.error ?? `Erreur ${res.status}`,
        });
        return;
      }
      toast({ title: 'Invitation renvoyée' });
      if (selectedId) await loadDetail(selectedId);
      await load();
    } finally {
      setActionBusy(null);
    }
  };

  const handleCancel = async (invitationId: string) => {
    setActionBusy(invitationId);
    try {
      const res = await fetch(`/api/admin/invitations/${invitationId}/cancel`, {
        method: 'POST',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Annulation impossible',
          description: json.error ?? `Erreur ${res.status}`,
        });
        return;
      }
      toast({ title: 'Invitation annulée' });
      if (selectedId) await loadDetail(selectedId);
      await load();
    } finally {
      setActionBusy(null);
    }
  };

  const handleDecideDeactivation = async (decision: 'approve' | 'reject') => {
    const requestId = detail?.pendingDeactivation?.id;
    if (!detail || !requestId) return;
    setActionBusy('authorize');
    try {
      const res = await fetch(`/api/admin/organizations/deactivation-requests/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Décision impossible',
          description: json.error ?? `Erreur ${res.status}`,
        });
        return;
      }
      toast({
        title: decision === 'approve' ? 'Organisation désactivée' : 'Désactivation refusée',
        description: decision === 'approve'
          ? 'La demande a été autorisée.'
          : 'L’organisation reste active.',
      });
      await Promise.all([load(), loadDetail(detail.id)]);
    } finally {
      setActionBusy(null);
    }
  };

  const handleToggleCorrespondent = async (userId: string, active: boolean) => {
    setActionBusy(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: active ? 'Activation impossible' : 'Désactivation impossible',
          description: json.error ?? `Erreur ${res.status}`,
        });
        return;
      }
      if (json.immediate === false) {
        toast({
          title: json.alreadyPending ? 'Demande déjà en attente' : 'Demande envoyée au super administrateur',
          description: json.alreadyPending
            ? 'Elle reste en attente pendant 3 jours.'
            : json.notified
              ? 'Un e-mail a été envoyé. Sans autorisation sous 3 jours, le correspondant reste actif.'
              : 'La demande reste en attente 3 jours. Aucun e-mail de super administrateur n’a pu être envoyé.',
        });
      } else {
        toast({ title: active ? 'Correspondant activé' : 'Correspondant désactivé' });
      }
      if (selectedId) await Promise.all([loadDetail(selectedId), load()]);
    } finally {
      setActionBusy(null);
    }
  };

  const handleDecideCorrespondent = async (requestId: string, decision: 'approve' | 'reject') => {
    if (!selectedId) return;
    setActionBusy(requestId);
    try {
      const res = await fetch(`/api/admin/correspondents/deactivation-requests/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Décision impossible',
          description: json.error ?? `Erreur ${res.status}`,
        });
        return;
      }
      toast({
        title: decision === 'approve' ? 'Correspondant désactivé' : 'Désactivation refusée',
        description: decision === 'approve' ? 'La demande a été autorisée.' : 'Le correspondant reste actif.',
      });
      await Promise.all([loadDetail(selectedId), load()]);
    } finally {
      setActionBusy(null);
    }
  };

  const openOrg = (org: OrgRow) => {
    setSelectedId(org.id);
    setDetailTab('info');
    setChecked((current) => (current.includes(org.id) ? current : [...current, org.id]));
  };

  const pageChecked = pageRows.length > 0 && pageRows.every((org) => checked.includes(org.id));

  const toggleSort = (key: typeof sort.key) => {
    setSort((current) =>
      current.key === key ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
    );
  };

  return (
    <div className="org-desk space-y-2">
      <AdminPageHeader
        variant="flat"
        title="Organisations partenaires"
        description="Gestion des organisations externes et des invitations de correspondants."
        actions={
          canCreate ? (
            <Button className="org-desk__create" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle organisation
            </Button>
          ) : null
        }
      />

      <div className="org-stats">
        <StatCard tone="is-green" icon={<Building2 />} value={stats.active} label="Organisation active" bars={[35, 55, 40, 70, 48, 88]} />
        <StatCard tone="is-sky" icon={<Users />} value={stats.users} label="Correspondant(s)" bars={[20, 45, 30, 60, 50, 75]} />
        <StatCard tone="is-amber" icon={<Mail />} value={stats.invites} label="Invitation(s) en attente" bars={[25, 40, 55, 35, 68, 90]} />
      </div>

      <OrganizationDeactivationInbox onDecided={() => { void load(); if (selectedId) void loadDetail(selectedId); }} />
      <CorrespondentDeactivationInbox onDecided={() => { void load(); if (selectedId) void loadDetail(selectedId); }} />

      <div className={cn('org-layout', selectedId && 'has-detail')}>
        <section className="org-table">
          <div className="org-toolbar">
            <div className="org-search">
              <Search aria-hidden />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Rechercher une organisation partenaire..."
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="org-tool">
                  <Filter className="mr-2 h-4 w-4" />
                  Filtres
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Statut</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={statusFilter} onValueChange={(value) => { setStatusFilter(value as 'all' | 'active' | 'inactive'); setPage(1); }}>
                  <DropdownMenuRadioItem value="all">Toutes</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="active">Actives</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="inactive">Inactives</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="org-tool">
                  <Columns3 className="mr-2 h-4 w-4" />
                  Colonnes
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Colonnes affichées</DropdownMenuLabel>
                <DropdownMenuCheckboxItem checked={visibleCols.statut} onCheckedChange={(v) => setVisibleCols((c) => ({ ...c, statut: v === true }))}>Statut</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={visibleCols.correspondants} onCheckedChange={(v) => setVisibleCols((c) => ({ ...c, correspondants: v === true }))}>Correspondants</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={visibleCols.invitations} onCheckedChange={(v) => setVisibleCols((c) => ({ ...c, invitations: v === true }))}>Invitations</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={visibleCols.activite} onCheckedChange={(v) => setVisibleCols((c) => ({ ...c, activite: v === true }))}>Dernière activité</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" className="org-tool" onClick={exportCsv}>
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement…
            </div>
          ) : pageRows.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">Aucune organisation partenaire.</div>
          ) : (
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th className="w-10">
                      <input
                        className="org-check"
                        type="checkbox"
                        aria-label="Sélectionner la page"
                        checked={pageChecked}
                        onChange={() => {
                          setChecked((current) =>
                            pageChecked
                              ? current.filter((id) => !pageRows.some((org) => org.id === id))
                              : [...new Set([...current, ...pageRows.map((org) => org.id)])]
                          );
                        }}
                      />
                    </th>
                    <th><SortLabel label="Organisation" active={sort.key === 'name'} dir={sort.dir} onClick={() => toggleSort('name')} /></th>
                    {visibleCols.statut ? <th><SortLabel label="Statut" active={sort.key === 'active'} dir={sort.dir} onClick={() => toggleSort('active')} /></th> : null}
                    {visibleCols.correspondants ? <th><SortLabel label="Correspondants" active={sort.key === 'users'} dir={sort.dir} onClick={() => toggleSort('users')} /></th> : null}
                    {visibleCols.invitations ? <th><SortLabel label="Invitations" active={sort.key === 'invites'} dir={sort.dir} onClick={() => toggleSort('invites')} /></th> : null}
                    {visibleCols.activite ? <th><SortLabel label="Dernière activité" active={sort.key === 'activity'} dir={sort.dir} onClick={() => toggleSort('activity')} /></th> : null}
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((org) => {
                    const selected = selectedId === org.id;
                    return (
                      <tr
                        key={org.id}
                        className={selected ? 'is-selected' : undefined}
                        onClick={() => openOrg(org)}
                      >
                        <td onClick={(event) => event.stopPropagation()}>
                          <input
                            className="org-check"
                            type="checkbox"
                            aria-label={`Sélectionner ${org.name}`}
                            checked={checked.includes(org.id)}
                            onChange={() => {
                              setChecked((current) =>
                                current.includes(org.id) ? current.filter((id) => id !== org.id) : [...current, org.id]
                              );
                              setSelectedId(org.id);
                            }}
                          />
                        </td>
                        <td>
                          <div className="org-org">
                            <span className="org-org__mark"><Building2 className="h-4 w-4" /></span>
                            <span>
                              <strong>{org.name}</strong>
                              <small>{org.notes?.trim() || 'Aucune description'}</small>
                            </span>
                          </div>
                        </td>
                        {visibleCols.statut ? (
                          <td>
                            <span className={cn('org-pill', !org.active && 'is-off')}>
                              <i />
                              {org.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        ) : null}
                        {visibleCols.correspondants ? (
                          <td><span className="org-metric"><Users />{org.usersCount}</span></td>
                        ) : null}
                        {visibleCols.invitations ? (
                          <td><span className="org-metric is-mail"><Mail />{org.pendingInvitationsCount}</span></td>
                        ) : null}
                        {visibleCols.activite ? (
                          <td><span className="org-metric is-date"><Clock />{formatActivity(org.updatedAt)}</span></td>
                        ) : null}
                        <td className="text-right" onClick={(event) => event.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label={`Actions pour ${org.name}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openOrg(org)}>Voir le détail</DropdownMenuItem>
                              {canEdit ? (
                                <DropdownMenuItem onClick={() => { openOrg(org); setEditName(org.name); setEditNotes(org.notes ?? ''); setEditOpen(true); }}>
                                  Modifier
                                </DropdownMenuItem>
                              ) : null}
                              {canInvite && org.active ? (
                                <DropdownMenuItem onClick={() => { openOrg(org); setInviteOpen(true); }}>Inviter un correspondant</DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="org-pager">
            <p>Affichage de {rangeStart} à {rangeEnd} sur {filtered.length} résultat{filtered.length === 1 ? '' : 's'}</p>
            <div className="org-pager__nav">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} aria-label="Page précédente">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="org-pager__current">{currentPage}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)} aria-label="Page suivante">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <select
                aria-label="Résultats par page"
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm"
                value={pageSize}
                onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
              </select>
            </div>
          </div>
        </section>

        {selectedId ? (
          <OrganizationsDetailPanel
            selectedId={selectedId}
            detail={detail}
            loading={detailLoading}
            tab={detailTab}
            onTab={setDetailTab}
            onClose={() => setSelectedId(null)}
            formatActivity={formatActivity}
            formatDate={formatDate}
            statusLabels={STATUS_LABELS}
            canEdit={canEdit}
            canToggle={canToggle}
            canInvite={canInvite}
            canResend={canResend}
            canCancel={canCancel}
            canToggleUser={canToggleUser}
            actionBusy={actionBusy}
            onEdit={() => {
              if (!detail) return
              setEditName(detail.name)
              setEditNotes(detail.notes ?? '')
              setEditOpen(true)
            }}
            onToggle={() => void handleToggleActive()}
            onDecide={(decision) => void handleDecideDeactivation(decision)}
            onDecideUser={(requestId, decision) => void handleDecideCorrespondent(requestId, decision)}
            onInvite={() => setInviteOpen(true)}
            onResend={(id) => void handleResend(id)}
            onCancelInvite={(id) => void handleCancel(id)}
            onToggleUser={(userId, active) => void handleToggleCorrespondent(userId, active)}
          />
        ) : null}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="org-dialog">
          <DialogHeader className="org-dialog__head">
            <span className="org-dialog__mark"><Building2 className="h-4 w-4" /></span>
            <div>
              <DialogTitle>Nouvelle organisation partenaire</DialogTitle>
              <p>Sélectionnez une organisation du référentiel. Son nom ne se saisit pas.</p>
            </div>
          </DialogHeader>
          <div className="org-dialog__body">
            <div className="space-y-1.5">
              <Label htmlFor="org-catalog">Organisation</Label>
              <select
                id="org-catalog"
                className="org-dialog__select"
                value={catalogId}
                onChange={(e) => setCatalogId(e.target.value)}
              >
                <option value="">Sélectionner une organisation</option>
                {catalog
                  .filter((entry) => !items.some((org) => org.name.localeCompare(entry.name, 'fr', { sensitivity: 'accent' }) === 0))
                  .map((entry) => (
                    <option key={entry.id} value={entry.id}>{entry.name}</option>
                  ))}
              </select>
              <p className="org-dialog__hint">Nom officiel verrouillé, repris tel quel du référentiel.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-notes">Notes (optionnel)</Label>
              <Textarea
                id="org-notes"
                value={createNotes}
                onChange={(e) => setCreateNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button className="org-desk__create" disabled={createBusy || !catalogId} onClick={() => void handleCreate()}>
              {createBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="org-dialog">
          <DialogHeader className="org-dialog__head">
            <span className="org-dialog__mark"><Building2 className="h-4 w-4" /></span>
            <div>
              <DialogTitle>Modifier l’organisation</DialogTitle>
              <p>Le nom est verrouillé. Seules les notes peuvent être mises à jour.</p>
            </div>
          </DialogHeader>
          <div className="org-dialog__body">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Organisation</Label>
              <input id="edit-name" className="org-dialog__locked" value={editName} readOnly tabIndex={-1} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Annuler
            </Button>
            <Button className="org-desk__create" disabled={editBusy} onClick={() => void handleEdit()}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="org-dialog">
          <DialogHeader className="org-dialog__head">
            <span className="org-dialog__mark"><Mail className="h-4 w-4" /></span>
            <div>
              <DialogTitle>Inviter un correspondant</DialogTitle>
              <p>L’organisation est déjà choisie. Seule l’adresse e-mail est demandée.</p>
            </div>
          </DialogHeader>
          <div className="org-dialog__body">
            <div className="space-y-1.5">
              <Label htmlFor="invite-org">Organisation</Label>
              <input
                id="invite-org"
                className="org-dialog__locked"
                value={detail?.name ?? ''}
                readOnly
                tabIndex={-1}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Adresse e-mail</Label>
              <Input
                id="invite-email"
                className="org-dialog__email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="correspondant@organisation.gn"
              />
            </div>
            <div className="org-dialog__expiry">
              <Clock aria-hidden />
              <div>
                <span>Date d’expiration</span>
                <strong>
                  {format(new Date(Date.now() + expiryHours * 60 * 60 * 1000), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                </strong>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Annuler
            </Button>
            <Button
              className="org-desk__create"
              disabled={inviteBusy || !inviteEmail.includes('@')}
              onClick={() => void handleInvite()}
            >
              {inviteBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Envoyer l’invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
