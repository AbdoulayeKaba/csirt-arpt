'use client';

import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Activity,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Eye,
  FileEdit,
  Filter,
  Globe,
  Hash,
  Loader2,
  LogIn,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  Shield,
  ShieldAlert,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { UserAvatar } from '@/components/admin/user-avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FrenchDateField } from '@/components/ui/french-datetime-fields';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { AuditActionCategory, AuditJournalEntry, AuditJournalStats } from '@/lib/dg/audit-journal';
import { cn } from '@/lib/utils';
import '@/components/admin/audit-journal.css';

type ApiResponse = {
  items: AuditJournalEntry[];
  stats: AuditJournalStats;
  dominant: { label: string; count: number }[];
  users: { id: string; name: string; email: string; roleLabel: string }[];
};

const CATEGORY_LABELS: Record<AuditActionCategory, string> = {
  LOGIN: 'Connexion',
  UPDATE: 'Modification',
  DELETE: 'Suppression',
  EXPORT: 'Export',
  BUSINESS: 'Opération métier',
  OTHER: 'Autre',
};

const CATEGORY_OPTIONS: { value: AuditActionCategory | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Toutes les catégories' },
  { value: 'LOGIN', label: 'Connexions (LOGIN)' },
  { value: 'UPDATE', label: 'Modifications (UPDATE)' },
  { value: 'DELETE', label: 'Suppressions (DELETE)' },
  { value: 'BUSINESS', label: 'Opérations métier' },
  { value: 'EXPORT', label: 'Exports de données' },
  { value: 'OTHER', label: 'Autres actions' },
];

function categoryIcon(category: AuditActionCategory) {
  switch (category) {
    case 'LOGIN':
      return LogIn;
    case 'UPDATE':
      return FileEdit;
    case 'DELETE':
      return Trash2;
    case 'EXPORT':
      return Download;
    case 'BUSINESS':
      return Shield;
    default:
      return Activity;
  }
}

function categoryBadgeClass(category: AuditActionCategory) {
  switch (category) {
    case 'LOGIN':
      return 'admin-audit-badge-login';
    case 'UPDATE':
      return 'admin-audit-badge-update';
    case 'DELETE':
      return 'admin-audit-badge-delete';
    case 'EXPORT':
      return 'admin-audit-badge-export';
    case 'BUSINESS':
      return 'admin-audit-badge-business';
    default:
      return 'admin-audit-badge-other';
  }
}

function AuditDetailModal({
  entry,
  onClose,
}: {
  entry: AuditJournalEntry | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!entry) return null;

  const ActionIcon = categoryIcon(entry.category);
  const createdAt = new Date(entry.createdAt);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast({ title: 'Copié', description: text });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="admin-audit-detail-dialog max-w-lg gap-0 overflow-hidden p-0 sm:max-w-lg rounded-xl shadow-2xl border bg-background">
        <DialogHeader className="sr-only">
          <DialogTitle>Détail de l’événement d’audit - {entry.id}</DialogTitle>
          <DialogDescription>
            Trace d’audit complète de l’action enregistrée sur la plateforme.
          </DialogDescription>
        </DialogHeader>

        {/* Hero header compact */}
        <div className="admin-audit-detail-hero">
          <div className="admin-audit-detail-hero-top">
            <div className="admin-audit-detail-user">
              <UserAvatar firstName={entry.user.firstName} lastName={entry.user.lastName} size="sm" />
              <div className="min-w-0">
                <p className="admin-audit-detail-user-name">
                  {entry.user.firstName} {entry.user.lastName}
                </p>
                <p className="admin-audit-detail-user-meta">
                  {entry.user.roleLabel} · {entry.user.email}
                </p>
              </div>
            </div>
            <span className={cn('admin-audit-badge admin-audit-detail-badge', categoryBadgeClass(entry.category))}>
              <ActionIcon className="h-2.5 w-2.5" aria-hidden />
              {entry.actionLabel}
            </span>
          </div>

          <div className="admin-audit-detail-hero-meta">
            <span className="admin-audit-detail-chip">
              <Calendar className="h-2.5 w-2.5" aria-hidden />
              {format(createdAt, 'EEEE d MMMM yyyy', { locale: fr })}
            </span>
            <span className="admin-audit-detail-chip admin-audit-detail-chip--mono">
              <Clock className="h-2.5 w-2.5" aria-hidden />
              {format(createdAt, 'HH:mm:ss', { locale: fr })}
            </span>
            <span className="admin-audit-detail-chip">{CATEGORY_LABELS[entry.category] || entry.category}</span>
          </div>
        </div>

        {/* Body content compact */}
        <div className="admin-audit-detail-body space-y-2 p-2.5 text-xs">
          <section className="admin-audit-detail-section">
            <h3 className="admin-audit-detail-section-title">Description de l’action</h3>
            <div className="p-1.5 px-2 rounded bg-muted/40 border text-foreground leading-relaxed break-words [overflow-wrap:anywhere] text-[11px]">
              {entry.description}
            </div>
          </section>

          <section className="admin-audit-detail-section">
            <h3 className="admin-audit-detail-section-title">Informations techniques & Traçabilité</h3>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="admin-audit-detail-row">
                <dt>
                  <Server className="h-2.5 w-2.5 text-primary" aria-hidden />
                  Ressource
                </dt>
                <dd className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-foreground text-[11px]">{entry.resourceType}</span>
                  <span className="text-[10px] text-muted-foreground truncate">{entry.resourceLabel}</span>
                </dd>
              </div>

              <div className="admin-audit-detail-row">
                <dt>
                  <Hash className="h-2.5 w-2.5 text-primary" aria-hidden />
                  Code action
                </dt>
                <dd className="flex items-center justify-between gap-1">
                  <code className="font-mono font-bold text-primary text-[10.5px] truncate">{entry.actionCode}</code>
                  <button
                    type="button"
                    onClick={() => handleCopy(entry.actionCode, 'actionCode')}
                    className="p-0.5 text-muted-foreground hover:text-foreground shrink-0"
                    title="Copier le code"
                  >
                    {copiedKey === 'actionCode' ? <Check className="h-2.5 w-2.5 text-emerald-600" /> : <Copy className="h-2.5 w-2.5" />}
                  </button>
                </dd>
              </div>

              <div className="admin-audit-detail-row">
                <dt>
                  <Globe className="h-2.5 w-2.5 text-primary" aria-hidden />
                  Adresse IP
                </dt>
                <dd className="flex items-center justify-between gap-1">
                  <code className="font-mono text-[10.5px] text-foreground">{entry.ip ?? 'Non enregistrée'}</code>
                  {entry.ip && (
                    <button
                      type="button"
                      onClick={() => handleCopy(entry.ip!, 'ip')}
                      className="p-0.5 text-muted-foreground hover:text-foreground shrink-0"
                      title="Copier l'IP"
                    >
                      {copiedKey === 'ip' ? <Check className="h-2.5 w-2.5 text-emerald-600" /> : <Copy className="h-2.5 w-2.5" />}
                    </button>
                  )}
                </dd>
              </div>

              <div className="admin-audit-detail-row">
                <dt>
                  <FileEdit className="h-2.5 w-2.5 text-primary" aria-hidden />
                  Identifiant log
                </dt>
                <dd className="flex items-center justify-between gap-1">
                  <code className="font-mono text-[10px] text-muted-foreground truncate">{entry.id}</code>
                  <button
                    type="button"
                    onClick={() => handleCopy(entry.id, 'id')}
                    className="p-0.5 text-muted-foreground hover:text-foreground shrink-0"
                    title="Copier l'identifiant"
                  >
                    {copiedKey === 'id' ? <Check className="h-2.5 w-2.5 text-emerald-600" /> : <Copy className="h-2.5 w-2.5" />}
                  </button>
                </dd>
              </div>
            </div>
          </section>

          {entry.comments.length > 0 ? (
            <section className="admin-audit-detail-section">
              <h3 className="admin-audit-detail-section-title">Commentaires & Métadonnées</h3>
              <ul className="space-y-1">
                {entry.comments.map((comment) => (
                  <li key={comment} className="p-1 px-2 rounded bg-muted/40 border font-mono text-[10px] leading-relaxed break-all">
                    {comment}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <DialogFooter className="p-2 border-t bg-muted/20">
          <Button type="button" variant="outline" size="sm" className="h-6 text-xs px-3" onClick={onClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AuditJournal() {
  const { toast } = useToast();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(new Date());
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  // Filters
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<AuditActionCategory | 'ALL'>('ALL');
  const [userId, setUserId] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [detail, setDetail] = useState<AuditJournalEntry | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (category !== 'ALL') params.set('category', category);
      if (userId !== 'ALL') params.set('userId', userId);
      if (dateFrom) params.set('from', new Date(`${dateFrom}T00:00:00`).toISOString());
      if (dateTo) params.set('to', new Date(`${dateTo}T23:59:59`).toISOString());
      const res = await fetch(`/api/dg/audit-logs?${params.toString()}`);
      if (!res.ok) {
        setData(null);
        return;
      }
      const json = (await res.json()) as ApiResponse;
      setData(json);
      setLastSyncedAt(new Date());
    } catch {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger le journal d’audit.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [q, category, userId, dateFrom, dateTo, toast]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(t);
  }, [load]);

  const resetFilters = () => {
    setQ('');
    setCategory('ALL');
    setUserId('ALL');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = Boolean(q.trim() || category !== 'ALL' || userId !== 'ALL' || dateFrom || dateTo);

  const handleCopy = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedRef(text);
    toast({ title: 'Copié', description: text });
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const handleExportCsv = () => {
    if (!data?.items.length) {
      toast({ title: 'Aucune donnée', description: 'Aucun enregistrement à exporter.' });
      return;
    }

    const headers = ['N°', 'Date', 'Heure', 'Utilisateur', 'Email', 'Role', 'Categorie', 'Action', 'Code', 'Ressource', 'IP', 'Description'];
    const rows = data.items.map((item, index) => [
      index + 1,
      format(new Date(item.createdAt), 'yyyy-MM-dd'),
      format(new Date(item.createdAt), 'HH:mm:ss'),
      `"${item.user.firstName} ${item.user.lastName}"`,
      `"${item.user.email}"`,
      `"${item.user.roleLabel}"`,
      `"${item.category}"`,
      `"${item.actionLabel.replace(/"/g, '""')}"`,
      `"${item.actionCode}"`,
      `"${item.resourceType}"`,
      `"${item.ip || ''}"`,
      `"${item.description.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `journal-audit-csirt-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: 'Export terminé', description: 'Le fichier CSV a été téléchargé avec succès.' });
  };

  return (
    <div className="admin-audit-page min-w-0">
      <AdminPageHeader
        title="Journal d'audit & Traçabilité"
        description="Historique complet des actions, connexions et modifications sur la plateforme."
        badge={data ? `${data.items.length} logs` : undefined}
        actions={
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void load(true)}
              disabled={refreshing || loading}
              className="h-7 text-xs font-semibold px-2.5"
            >
              <RefreshCw className={cn('h-3 w-3 mr-1', (refreshing || loading) && 'animate-spin')} />
              Actualiser
            </Button>
            <Button
              size="sm"
              onClick={handleExportCsv}
              disabled={!data?.items.length}
              className="h-7 text-xs font-semibold px-2.5 bg-primary text-primary-foreground"
            >
              <Download className="h-3 w-3 mr-1" />
              Exporter CSV
            </Button>
          </div>
        }
      />

      {/* KPI Cards Grid Compact */}
      {data?.stats && (
        <div className="admin-audit-kpi-grid">
          <div className="admin-audit-kpi-card">
            <div className="admin-audit-kpi-icon bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <Activity className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="admin-audit-kpi-val">{data.stats.actions24h}</span>
                <span className="admin-audit-kpi-label">Actions (24h)</span>
              </div>
              <p className="admin-audit-kpi-sub text-emerald-600">
                {data.stats.actions24hTrendPct > 0 ? `+${data.stats.actions24hTrendPct}%` : `${data.stats.actions24hTrendPct}%`} vs 24h préc.
              </p>
            </div>
          </div>

          <div className="admin-audit-kpi-card">
            <div className="admin-audit-kpi-icon bg-blue-500/10 text-blue-600 border border-blue-500/20">
              <LogIn className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="admin-audit-kpi-val">{data.stats.logins24h}</span>
                <span className="admin-audit-kpi-label">Connexions</span>
              </div>
              <p className="admin-audit-kpi-sub text-muted-foreground">Sessions actives</p>
            </div>
          </div>

          <div className="admin-audit-kpi-card">
            <div className="admin-audit-kpi-icon bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <FileEdit className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="admin-audit-kpi-val">{data.stats.businessOps24h}</span>
                <span className="admin-audit-kpi-label">Opérations</span>
              </div>
              <p className="admin-audit-kpi-sub text-amber-600">Mises à jour</p>
            </div>
          </div>

          <div className="admin-audit-kpi-card">
            <div className="admin-audit-kpi-icon bg-purple-500/10 text-purple-600 border border-purple-500/20">
              <Users className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="admin-audit-kpi-val">{data.stats.activeUsers24h}</span>
                <span className="admin-audit-kpi-label">Actifs (24h)</span>
              </div>
              <p className="admin-audit-kpi-sub text-purple-600">Comptes actifs</p>
            </div>
          </div>
        </div>
      )}

      {/* Dominant Actions Slim Bar */}
      {data && data.dominant.length > 0 && (
        <div className="admin-audit-dominant-bar">
          <span className="admin-audit-dominant-lbl">Actions fréquentes :</span>
          <div className="flex flex-wrap gap-1 items-center">
            {data.dominant.map((d) => (
              <button
                key={d.label}
                type="button"
                onClick={() => setQ(d.label)}
                className="admin-audit-dominant-chip"
                title={`Filtrer par : ${d.label}`}
              >
                <span>{d.label}</span>
                <span className="admin-audit-dominant-count">{d.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar & Filter Bar Compact */}
      <div className="admin-audit-toolbar">
        <div className="flex flex-wrap items-center gap-1.5 flex-1">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2 top-1.5 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Rechercher utilisateur, description, code, IP..."
              className="pl-7 h-7 text-xs bg-background"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                className="absolute right-1.5 top-1.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  'admin-audit-select h-[1.65rem] text-[0.68rem] px-2 gap-1 font-semibold rounded-[0.35rem] shadow-none',
                  (dateFrom || dateTo) && 'border-primary/40 bg-primary/10 text-primary'
                )}
              >
                <Calendar className="h-3 w-3" />
                {dateFrom || dateTo ? `${dateFrom || '...'} → ${dateTo || '...'}` : 'Période'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2.5 text-xs" align="start">
              <p className="font-bold text-xs mb-1.5">Filtrer par dates</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Du</Label>
                  <FrenchDateField
                    id="audit-date-from"
                    className="h-7 text-xs mt-0.5"
                    value={dateFrom}
                    onChange={setDateFrom}
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Au</Label>
                  <FrenchDateField
                    id="audit-date-to"
                    className="h-7 text-xs mt-0.5"
                    value={dateTo}
                    onChange={setDateTo}
                  />
                </div>
              </div>
              {(dateFrom || dateTo) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full mt-1.5 h-6 text-[11px] text-red-600 hover:text-red-700"
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                  }}
                >
                  Effacer les dates
                </Button>
              )}
            </PopoverContent>
          </Popover>

          <Select value={category} onValueChange={(v) => setCategory(v as AuditActionCategory | 'ALL')}>
            <SelectTrigger size="sm" className="admin-audit-select w-auto min-w-[7.5rem] max-w-[9.5rem]">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.value === 'ALL' ? 'Catégories' : o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger size="sm" className="admin-audit-select w-auto min-w-[7.25rem] max-w-[10rem]">
              <SelectValue placeholder="Utilisateurs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Utilisateurs</SelectItem>
              {data?.users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground gap-1"
              onClick={resetFilters}
            >
              <RotateCcw className="h-2.5 w-2.5" />
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Main Audit Table Compact */}
      <div className="admin-audit-table-wrap">
        {loading && !data ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs font-semibold">Chargement des logs d’audit...</p>
          </div>
        ) : !data?.items.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-1.5">
            <div className="p-2.5 rounded-full bg-muted/60 text-muted-foreground">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <p className="text-xs font-semibold text-foreground">Aucune entrée trouvée</p>
            <p className="text-[11px] text-muted-foreground max-w-sm text-center">
              Aucun événement ne correspond aux critères sélectionnés.
            </p>
            {hasActiveFilters && (
              <Button size="sm" variant="outline" className="mt-1 h-7 text-xs" onClick={resetFilters}>
                Réinitialiser les filtres
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-audit-table">
              <thead>
                <tr>
                  <th className="w-9 text-center">
                    <span className="th-content justify-center">N°</span>
                  </th>
                  <th>
                    <span className="th-content">
                      <Clock className="h-2.5 w-2.5" /> Date & Heure
                    </span>
                  </th>
                  <th>
                    <span className="th-content">
                      <User className="h-2.5 w-2.5" /> Utilisateur
                    </span>
                  </th>
                  <th>
                    <span className="th-content">
                      <Activity className="h-2.5 w-2.5" /> Action & Événement
                    </span>
                  </th>
                  <th>
                    <span className="th-content">
                      <Server className="h-2.5 w-2.5" /> Ressource
                    </span>
                  </th>
                  <th>
                    <span className="th-content">
                      <Globe className="h-2.5 w-2.5" /> IP
                    </span>
                  </th>
                  <th className="w-10 text-right">
                    <span className="th-content justify-end">Voir</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((row, index) => {
                  const ActionIcon = categoryIcon(row.category);
                  const isLogin = row.category === 'LOGIN';
                  const isDelete = row.category === 'DELETE';

                  return (
                    <tr
                      key={row.id}
                      onClick={() => setDetail(row)}
                      className={cn(
                        'cursor-pointer transition-colors',
                        isDelete && 'bg-red-500/[0.02]',
                        isLogin && 'bg-blue-500/[0.01]'
                      )}
                    >
                      {/* 1. N° */}
                      <td className="w-9 text-center font-mono text-[10.5px] text-muted-foreground">
                        {index + 1}
                      </td>

                      {/* 2. Date & Heure */}
                      <td>
                        <div className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                          <span className="font-semibold text-foreground text-[11px]">
                            {format(new Date(row.createdAt), 'dd/MM/yyyy', { locale: fr })}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {format(new Date(row.createdAt), 'HH:mm:ss')}
                          </span>
                        </div>
                      </td>

                      {/* 3. Utilisateur */}
                      <td>
                        <div className="flex items-center gap-1.5 max-w-[200px]">
                          <UserAvatar
                            firstName={row.user.firstName}
                            lastName={row.user.lastName}
                            size="sm"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-foreground text-[11px] truncate leading-tight">
                              {row.user.firstName} {row.user.lastName}
                            </span>
                            <span className="text-[9.5px] text-muted-foreground truncate" title={row.user.roleLabel || row.user.email}>
                              {row.user.roleLabel || row.user.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 4. Action & Événement */}
                      <td className="min-w-[220px]">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className={cn('admin-audit-badge', categoryBadgeClass(row.category))}>
                              <ActionIcon className="h-2.5 w-2.5" aria-hidden />
                              {row.actionLabel}
                            </span>
                            <code className="text-[9.5px] font-mono px-1 py-0.2 rounded bg-muted/70 text-muted-foreground border border-border/40">
                              {row.actionCode}
                            </code>
                          </div>
                          <p className="text-[10.5px] text-muted-foreground leading-tight truncate max-w-[340px]" title={row.description}>
                            {row.description}
                          </p>
                        </div>
                      </td>

                      {/* 5. Ressource */}
                      <td>
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full bg-muted border text-foreground/80 whitespace-nowrap">
                          <Server className="h-2.5 w-2.5 text-muted-foreground" />
                          {row.resourceType}
                        </span>
                      </td>

                      {/* 6. IP */}
                      <td>
                        {row.ip ? (
                          <button
                            type="button"
                            onClick={(e) => handleCopy(row.ip!, e)}
                            className="inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted/50 border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors group"
                            title="Cliquer pour copier l'IP"
                          >
                            <span>{row.ip}</span>
                            {copiedRef === row.ip ? (
                              <Check className="h-2.5 w-2.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-2 w-2 opacity-40 group-hover:opacity-100" />
                            )}
                          </button>
                        ) : (
                          <span className="text-muted-foreground/40 text-[10px] font-mono">—</span>
                        )}
                      </td>

                      {/* 8. Voir / Action */}
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded"
                          onClick={() => setDetail(row)}
                          title="Voir la fiche détaillée"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Table Footer */}
            <div className="admin-audit-table-footer">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">
                  {data.items.length} événement{data.items.length > 1 ? 's' : ''} affiché{data.items.length > 1 ? 's' : ''}
                </span>
                {hasActiveFilters && (
                  <>
                    <span>•</span>
                    <span className="text-primary font-medium">Filtres actifs</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1 text-[10.5px]">
                <Radio className="h-2.5 w-2.5 text-emerald-500 animate-pulse" />
                <span>Sync : {format(lastSyncedAt, 'HH:mm:ss')}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Detail Inspection */}
      <AuditDetailModal entry={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
