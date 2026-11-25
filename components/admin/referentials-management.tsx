'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  ArrowUpDown,
  Bookmark,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Edit2,
  Eye,
  FileDown,
  FileSpreadsheet,
  Landmark,
  Layers,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Tag,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { AccessGroupsPanel } from '@/components/admin/access-groups-panel';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { AdminConfirmDialog } from '@/components/admin/admin-confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ClientMount } from '@/components/ui/client-mount';
import { toast } from '@/hooks/use-toast';
import { useApp } from '@/lib/app-context';
import { cachedGet, invalidateCachedGet } from '@/lib/client/cached-get';
import { CorrespondentDeactivationInbox } from '@/components/admin/correspondent-deactivation-inbox';
import { OrganizationDeactivationInbox } from '@/components/admin/organization-deactivation-inbox';
import { OrganizationsDetailPanel, type OrgDetailPanelData } from '@/components/admin/organizations-detail-panel';
import '@/components/admin/organizations-desk.css';
import {
  REFERENTIAL_CATEGORIES,
  type ReferentialCategoryId,
} from '@/lib/dg/referential-catalog';
import {
  DEFAULT_DECLARANT_TYPES_SEED,
  DEFAULT_NATURES_SIGNALEMENT_SEED,
  DEFAULT_ORGANISATIONS_SEED,
} from '@/lib/seed/referentials-default';
import { parseEmailDomainsInput } from '@/lib/csirt/signalement-referentials';
import { openTablePdfInTab } from '@/lib/export/download-table-pdf';
import { cn } from '@/lib/utils';
import '@/components/admin/referentials-management.css';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export type ReferentialItem = {
  id: string;
  categoryId: ReferentialCategoryId;
  name: string;
  value?: string;
  meta?: {
    description?: string;
    order?: number;
    color?: string;
    declarantType?: string;
    archivedAt?: string | null;
    [key: string]: unknown;
  };
  archived: boolean;
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type ActiveTab =
  | 'thematiques'
  | 'departements'
  | 'groupes'
  | 'types_declarant'
  | 'organisations'
  | 'natures_signalement'
  | 'trash';

type ReferentialBuckets = {
  themes: ReferentialItem[];
  depts: ReferentialItem[];
  declarant: ReferentialItem[];
  orgs: ReferentialItem[];
  natures: ReferentialItem[];
  trash: ReferentialItem[];
};

export function ReferentialsManagement() {
  const { permissions } = useApp();
  const canEditOrg = permissions['action.organizations.edit'] === true;
  const canToggleOrg = permissions['action.organizations.toggle_active'] === true;
  const canInvite = permissions['action.invitations.create'] === true;
  const canResend = permissions['action.invitations.resend'] === true;
  const canCancelInvite = permissions['action.invitations.cancel'] === true;
  const canToggleUser = permissions['action.users.toggle_active'] === true;
  const [activeTab, setActiveTab] = useState<ActiveTab>('thematiques');
  const activeTabRef = useRef(activeTab);
  const bucketsRef = useRef<ReferentialBuckets | null>(null);
  activeTabRef.current = activeTab;
  const [items, setItems] = useState<ReferentialItem[]>([]);
  const [trashItems, setTrashItems] = useState<ReferentialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Counts for KPIs & Tabs
  const [themesCount, setThemesCount] = useState(0);
  const [groupsCount, setGroupsCount] = useState(0);
  const [groupCreateToken, setGroupCreateToken] = useState(0);
  const [declarantTypesCount, setDeclarantTypesCount] = useState(0);
  const [organisationsCount, setOrganisationsCount] = useState(0);
  const [naturesCount, setNaturesCount] = useState(0);
  const [declarantList, setDeclarantList] = useState<ReferentialItem[]>([]);

  // Modal Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ReferentialItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<ReferentialCategoryId>('thematiques');
  const [formDeclarantType, setFormDeclarantType] = useState('operateur');
  const [formEmailDomains, setFormEmailDomains] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Modal Confirm Archive (Move to Trash)
  const [archiveTarget, setArchiveTarget] = useState<ReferentialItem | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  // Modal Confirm Permanent Delete
  const [deleteTarget, setDeleteTarget] = useState<ReferentialItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal Confirm Empty Trash
  const [emptyTrashDialogOpen, setEmptyTrashDialogOpen] = useState(false);
  const [isEmptyingTrash, setIsEmptyingTrash] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<ReferentialItem | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [expiryHours, setExpiryHours] = useState(72);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailSource, setDetailSource] = useState<ReferentialItem | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [orgDetail, setOrgDetail] = useState<OrgDetailPanelData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<'info' | 'users' | 'invites'>('info');
  const [detailBusy, setDetailBusy] = useState<string | null>(null);
  const [partnerActivity, setPartnerActivity] = useState<Array<{ name: string; active: boolean }>>([]);

  const showBucket = useCallback((tab: ActiveTab, buckets: ReferentialBuckets) => {
    if (tab === 'thematiques') setItems(buckets.themes);
    else if (tab === 'departements') setItems(buckets.depts);
    else if (tab === 'types_declarant') setItems(buckets.declarant);
    else if (tab === 'organisations') setItems(buckets.orgs);
    else if (tab === 'natures_signalement') setItems(buckets.natures);
    else if (tab === 'trash') setItems(buckets.trash);
  }, []);

  const loadPartnerActivity = useCallback(async () => {
    const json = await cachedGet<{ items?: Array<{ name?: string; active?: boolean }> }>(
      '/api/admin/organizations',
      20000
    ).catch(() => null);
    if (!json) return;
    setPartnerActivity(
      (json.items ?? [])
        .filter((org) => typeof org.name === 'string' && org.name.trim())
        .map((org) => ({ name: org.name!.trim(), active: org.active !== false }))
    );
  }, []);

  // Load active and trash items
  const loadData = useCallback(async (force = false) => {
    try {
      setLoading(true);
      if (force) invalidateCachedGet('/api/admin/referentials/catalog');
      const data = await cachedGet<{ items?: ReferentialItem[] }>(
        '/api/admin/referentials/catalog',
        20000
      );

      const dedupe = (arr: ReferentialItem[]) => {
        const seen = new Set<string>();
        return arr.filter((item) => {
          const key = `${item.categoryId}::${item.archived ? '1' : '0'}::${item.name.trim().toLowerCase()}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      };

      const all = dedupe((data.items || []) as ReferentialItem[]);
      const ofCategory = (categoryId: string, archived: boolean) =>
        all.filter((item) => item.categoryId === categoryId && item.archived === archived);

      const allActiveThemes = ofCategory('thematiques', false);
      const allActiveDepts = ofCategory('departements', false);
      const allActiveDeclarant = ofCategory('types_declarant', false);
      const allActiveOrgs = ofCategory('organisations', false);
      const allActiveNatures = ofCategory('natures_signalement', false);
      const trashDeclarant = ofCategory('types_declarant', true);
      const trashOrgs = ofCategory('organisations', true);
      const trashNatures = ofCategory('natures_signalement', true);
      const allTrash = all.filter((item) => item.archived);

      const hasTrashDeclarant = trashDeclarant.length > 0;
      const hasTrashOrgs = trashOrgs.length > 0;
      const hasTrashNatures = trashNatures.length > 0;

      const fallbackDeclarant: ReferentialItem[] = DEFAULT_DECLARANT_TYPES_SEED.map((s, idx) => ({
        id: `dec-seed-${idx + 1}`,
        categoryId: 'types_declarant',
        name: s.name,
        value: s.value,
        meta: s.meta,
        archived: false,
      }));
      const fallbackOrgs: ReferentialItem[] = DEFAULT_ORGANISATIONS_SEED.map((s, idx) => ({
        id: `org-seed-${idx + 1}`,
        categoryId: 'organisations',
        name: s.name,
        value: s.value,
        meta: s.meta,
        archived: false,
      }));
      const fallbackNatures: ReferentialItem[] = DEFAULT_NATURES_SIGNALEMENT_SEED.map((s, idx) => ({
        id: `nat-seed-${idx + 1}`,
        categoryId: 'natures_signalement',
        name: s.name,
        value: s.value,
        meta: s.meta,
        archived: false,
      }));

      const effectiveActiveDeclarant =
        allActiveDeclarant.length > 0 || hasTrashDeclarant
          ? allActiveDeclarant
          : fallbackDeclarant;
      const effectiveActiveOrgs =
        allActiveOrgs.length > 0 || hasTrashOrgs
          ? allActiveOrgs
          : fallbackOrgs;
      const effectiveActiveNatures =
        allActiveNatures.length > 0 || hasTrashNatures
          ? allActiveNatures
          : fallbackNatures;

      setThemesCount(allActiveThemes.length);
      void cachedGet<{ items?: unknown[] }>('/api/admin/access-groups', 20000)
        .then((json) => setGroupsCount(json.items?.length ?? 0))
        .catch(() => {});
      setDeclarantTypesCount(effectiveActiveDeclarant.length);
      setOrganisationsCount(effectiveActiveOrgs.length);
      setNaturesCount(effectiveActiveNatures.length);
      setDeclarantList(effectiveActiveDeclarant);
      setTrashItems(allTrash);

      const buckets: ReferentialBuckets = {
        themes: allActiveThemes,
        depts: allActiveDepts,
        declarant: effectiveActiveDeclarant,
        orgs: effectiveActiveOrgs,
        natures: effectiveActiveNatures,
        trash: allTrash,
      };
      bucketsRef.current = buckets;
      showBucket(activeTabRef.current, buckets);
      await loadPartnerActivity();
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Erreur de chargement',
        description: 'Impossible de récupérer les référentiels.',
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [loadPartnerActivity, showBucket]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (bucketsRef.current) showBucket(activeTab, bucketsRef.current);
  }, [activeTab, showBucket]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    invalidateCachedGet('/api/admin/organizations');
    invalidateCachedGet('/api/admin/access-groups');
    loadData(true);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copié',
      description: `« ${label} » copié dans le presse-papier.`,
    });
  };

  const getDeclarantTypeLabel = (code?: string, orgName?: string, orgValue?: string) => {
    let effectiveCode = code;
    if (!effectiveCode && orgName) {
      const match = DEFAULT_ORGANISATIONS_SEED.find(
        (s) =>
          s.name.trim().toLowerCase() === orgName.trim().toLowerCase() ||
          (orgValue && s.value === orgValue)
      );
      if (match?.meta?.declarantType) {
        effectiveCode = match.meta.declarantType;
      }
    }
    if (!effectiveCode) return 'Non spécifié';
    const found =
      declarantList.find(
        (d) =>
          (d.value || d.id).toLowerCase() === effectiveCode!.toLowerCase() ||
          d.name.toLowerCase() === effectiveCode!.toLowerCase()
      ) ||
      DEFAULT_DECLARANT_TYPES_SEED.find(
        (d) =>
          (d.value || d.name).toLowerCase() === effectiveCode!.toLowerCase() ||
          d.name.toLowerCase() === effectiveCode!.toLowerCase()
      );
    return found?.name || effectiveCode;
  };

  const openCreateModal = (cat?: ReferentialCategoryId) => {
    let targetCat: ReferentialCategoryId = 'thematiques';
    if (cat) {
      targetCat = cat;
    } else if (
      activeTab === 'departements' ||
      activeTab === 'types_declarant' ||
      activeTab === 'organisations' ||
      activeTab === 'natures_signalement'
    ) {
      targetCat = activeTab;
    }
    setEditingItem(null);
    setFormCategory(targetCat);
    setFormName('');
    setFormValue('');
    setFormDescription('');
    setFormDeclarantType(
      declarantList[0]?.value || DEFAULT_DECLARANT_TYPES_SEED[0]?.value || 'operateur'
    );
    setFormEmailDomains('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: ReferentialItem) => {
    setEditingItem(item);
    setFormCategory(item.categoryId);
    setFormName(item.name);
    setFormValue(item.value || '');
    setFormDescription((item.meta?.description as string) || '');
    setFormDeclarantType(
      (item.meta?.declarantType as string) ||
        declarantList[0]?.value ||
        DEFAULT_DECLARANT_TYPES_SEED[0]?.value ||
        'operateur'
    );
    const domains = (item.meta as { emailDomains?: string[] } | undefined)?.emailDomains;
    setFormEmailDomains(Array.isArray(domains) ? domains.join(', ') : '');
    setIsModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setFormName(val);
    // If creating and code hasn't been manually altered, generate slug
    if (!editingItem && !formValue) {
      const slug = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setFormValue(slug);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nom requis',
        description: 'Veuillez saisir un libellé pour cet élément.',
      });
      return;
    }

    try {
      setIsSaving(true);
      const metaObj: Record<string, unknown> = {};
      if (formDescription.trim()) {
        metaObj.description = formDescription.trim();
      }
      if (formCategory === 'organisations' && formDeclarantType) {
        metaObj.declarantType = formDeclarantType;
        const emailDomains = parseEmailDomainsInput(formEmailDomains);
        if (emailDomains.length > 0) {
          metaObj.emailDomains = emailDomains;
        }
      }

      const payload = {
        name: formName.trim(),
        value: formValue.trim() || undefined,
        meta: Object.keys(metaObj).length > 0 ? metaObj : undefined,
      };

      if (editingItem) {
        let res = await fetch(
          `/api/admin/referentials/${editingItem.categoryId}/${editingItem.id}`,
          {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
          }
        );

        // Si l’élément n’existe pas encore en base (ID seed UI), le créer
        if (!res.ok) {
          const errBody = await res.clone().json().catch(() => ({}));
          const shouldCreate =
            res.status === 404 || errBody.error === 'NOT_FOUND';

          if (shouldCreate) {
            res = await fetch(`/api/admin/referentials/${editingItem.categoryId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
          }
        }

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          const message =
            errBody.error === 'FORBIDDEN'
              ? 'Accès refusé : activez « Gérer les référentiels » (ou le menu Référentiels) pour votre rôle.'
              : typeof errBody.error === 'string'
                ? errBody.error
                : 'Erreur lors de la mise à jour';
          throw new Error(message);
        }
        toast({
          title: 'Modifications enregistrées',
          description: `« ${formName} » a été mis à jour avec succès.`,
        });
    } else {
        const res = await fetch(`/api/admin/referentials/${formCategory}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(
            typeof errBody.error === 'string'
              ? errBody.error
              : 'Erreur lors de la création'
          );
        }
        toast({
          title: 'Élément ajouté',
          description: `« ${formName} » est désormais disponible.`,
        });
      }

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description:
          err instanceof Error ? err.message : 'Une erreur est survenue lors de l’enregistrement.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    try {
      setIsArchiving(true);
      const res = await fetch(
        `/api/admin/referentials/${archiveTarget.categoryId}/${archiveTarget.id}`,
        {
          method: 'DELETE',
        }
      );
      if (!res.ok) throw new Error('Erreur');
      toast({
        title: 'Élément déplacé dans la corbeille',
        description: `« ${archiveTarget.name} » a été archivé.`,
      });
      setArchiveTarget(null);
      loadData();
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible d’archiver cet élément.',
      });
    } finally {
      setIsArchiving(false);
    }
  };

  const handleRestore = async (item: ReferentialItem) => {
    try {
      const res = await fetch(`/api/admin/referentials/${item.categoryId}/${item.id}/restore`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Erreur');
      toast({
        title: 'Élément restauré',
        description: `« ${item.name} » a été réactivé.`,
      });
      loadData();
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de restaurer cet élément.',
      });
    }
  };

  const handlePermanentDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const res = await fetch(
        `/api/admin/referentials/${deleteTarget.categoryId}/${deleteTarget.id}?permanent=1`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Erreur');
      toast({
        title: 'Suppression définitive',
        description: `« ${deleteTarget.name} » a été supprimé du système.`,
      });
      setDeleteTarget(null);
      loadData();
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de supprimer cet élément.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEmptyTrash = async () => {
    try {
      setIsEmptyingTrash(true);
      const res = await fetch('/api/admin/referentials/trash', {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Erreur');
      toast({
        title: 'Corbeille vidée',
        description: 'Tous les éléments archivés ont été définitivement supprimés.',
      });
      setEmptyTrashDialogOpen(false);
      await loadData();
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de vider la corbeille.',
      });
    } finally {
      setIsEmptyingTrash(false);
    }
  };

  const organizationIsInactive = (item: ReferentialItem) => {
    if (item.categoryId !== 'organisations' || item.archived) return false;
    const match = partnerActivity.find(
      (org) => org.name.localeCompare(item.name, 'fr', { sensitivity: 'accent' }) === 0
    );
    return Boolean(match && !match.active);
  };

  const openInvite = (item: ReferentialItem) => {
    setInviteTarget(item);
    setInviteEmail('');
    void fetch('/api/admin/organizations')
      .then((res) => res.json())
      .then((json) => {
        if (typeof json.expiryHours === 'number' && json.expiryHours > 0) {
          setExpiryHours(json.expiryHours);
        }
      })
      .catch(() => undefined);
  };

  const referentialPreview = (item: ReferentialItem): OrgDetailPanelData => ({
    id: item.id,
    name: item.name,
    active: !item.archived,
    notes: typeof item.meta?.description === 'string' ? item.meta.description : null,
    createdAt: item.createdAt ?? item.updatedAt ?? new Date().toISOString(),
    updatedAt: item.updatedAt ?? item.createdAt ?? new Date().toISOString(),
    users: [],
    invitations: [],
  });

  const loadPartnerDetail = async (item: ReferentialItem) => {
    setDetailLoading(true);
    try {
      const res = await fetch('/api/admin/organizations');
      const json = await res.json().catch(() => ({}));
      const match = (json.items ?? []).find(
        (org: { id: string; name: string }) =>
          org.name.localeCompare(item.name, 'fr', { sensitivity: 'accent' }) === 0
      ) as { id: string; name: string } | undefined;
      if (!match) {
        setPartnerId(null);
        setOrgDetail(referentialPreview(item));
        return;
      }
      setPartnerId(match.id);
      const detailRes = await fetch(`/api/admin/organizations/${match.id}`);
      const detailJson = await detailRes.json().catch(() => ({}));
      setOrgDetail(detailRes.ok && detailJson.organization ? detailJson.organization : referentialPreview(item));
    } finally {
      setDetailLoading(false);
    }
  };

  const openDetails = (item: ReferentialItem) => {
    setDetailSource(item);
    setDetailTab('info');
    setDetailOpen(true);
    void loadPartnerDetail(item);
  };

  const formatActivity = (value?: string | null) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return format(date, "d MMM yyyy 'à' HH:mm", { locale: fr });
  };

  const formatDate = (value?: string | null) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return format(date, 'dd/MM/yyyy HH:mm', { locale: fr });
  };

  const refreshOpenDetail = async () => {
    if (detailSource) await loadPartnerDetail(detailSource);
  };

  const handleTogglePartner = async () => {
    if (!partnerId || !orgDetail) return;
    setDetailBusy('toggle');
    try {
      const res = await fetch(`/api/admin/organizations/${partnerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !orgDetail.active }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'Action impossible', description: json.error ?? `Erreur ${res.status}` });
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
        toast({ title: orgDetail.active ? 'Organisation désactivée' : 'Organisation activée' });
      }
      await Promise.all([refreshOpenDetail(), loadPartnerActivity()]);
    } finally {
      setDetailBusy(null);
    }
  };

  const handleDecideDeactivation = async (decision: 'approve' | 'reject') => {
    const requestId = orgDetail?.pendingDeactivation?.id;
    if (!requestId) return;
    setDetailBusy('authorize');
    try {
      const res = await fetch(`/api/admin/organizations/deactivation-requests/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'Décision impossible', description: json.error ?? `Erreur ${res.status}` });
        return;
      }
      toast({
        title: decision === 'approve' ? 'Organisation désactivée' : 'Désactivation refusée',
        description: decision === 'approve'
          ? 'La demande a été autorisée.'
          : 'L’organisation reste active.',
      });
      await Promise.all([refreshOpenDetail(), loadPartnerActivity()]);
    } finally {
      setDetailBusy(null);
    }
  };

  const handleResendInvite = async (invitationId: string) => {
    setDetailBusy(invitationId);
    try {
      const res = await fetch(`/api/admin/invitations/${invitationId}/resend`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'Renvoi impossible', description: json.error ?? `Erreur ${res.status}` });
        return;
      }
      toast({ title: 'Invitation renvoyée' });
      await refreshOpenDetail();
    } finally {
      setDetailBusy(null);
    }
  };

  const handleCancelInvite = async (invitationId: string) => {
    setDetailBusy(invitationId);
    try {
      const res = await fetch(`/api/admin/invitations/${invitationId}/cancel`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'Annulation impossible', description: json.error ?? `Erreur ${res.status}` });
        return;
      }
      toast({ title: 'Invitation annulée' });
      await refreshOpenDetail();
    } finally {
      setDetailBusy(null);
    }
  };

  const handleToggleCorrespondent = async (userId: string, active: boolean) => {
    setDetailBusy(userId);
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
      await refreshOpenDetail();
    } finally {
      setDetailBusy(null);
    }
  };

  const handleDecideCorrespondent = async (requestId: string, decision: 'approve' | 'reject') => {
    setDetailBusy(requestId);
    try {
      const res = await fetch(`/api/admin/correspondents/deactivation-requests/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'Décision impossible', description: json.error ?? `Erreur ${res.status}` });
        return;
      }
      toast({
        title: decision === 'approve' ? 'Correspondant désactivé' : 'Désactivation refusée',
        description: decision === 'approve' ? 'La demande a été autorisée.' : 'Le correspondant reste actif.',
      });
      await refreshOpenDetail();
    } finally {
      setDetailBusy(null);
    }
  };

  const handleInviteCorrespondent = async () => {
    if (!inviteTarget) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!email.includes('@')) return;
    setInviteBusy(true);
    try {
      const listed = await fetch('/api/admin/organizations');
      const listJson = await listed.json().catch(() => ({}));
      if (!listed.ok) {
        toast({
          variant: 'destructive',
          title: 'Invitation impossible',
          description: listJson.error ?? `Erreur ${listed.status}`,
        });
        return;
      }
      const sameName = (org: { name: string }) =>
        org.name.localeCompare(inviteTarget.name, 'fr', { sensitivity: 'accent' }) === 0;
      let partner = (listJson.items ?? []).find(sameName) as { id: string; active: boolean } | undefined;
      if (!partner) {
        const created = await fetch('/api/admin/organizations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            catalogId: inviteTarget.id,
            notes: typeof inviteTarget.meta?.description === 'string' ? inviteTarget.meta.description : undefined,
          }),
        });
        const createdJson = await created.json().catch(() => ({}));
        if (!created.ok || !createdJson.organization?.id) {
          toast({
            variant: 'destructive',
            title: 'Invitation impossible',
            description:
              createdJson.error === 'ALREADY_EXISTS'
                ? 'Cette organisation existe déjà, mais elle n’a pas pu être ouverte.'
                : createdJson.error ?? `Erreur ${created.status}`,
          });
          return;
        }
        partner = { id: createdJson.organization.id, active: createdJson.organization.active !== false };
      }
      if (partner && !partner.active) {
        const activated = await fetch(`/api/admin/organizations/${partner.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: true }),
        });
        if (!activated.ok) {
          toast({
            variant: 'destructive',
            title: 'Invitation impossible',
            description: 'L’organisation est inactive.',
          });
          return;
        }
      }
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: partner.id, email }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const reasons: Record<string, string> = {
          EMAIL_EXISTS: 'Un compte existe déjà pour cette adresse.',
          PENDING_EXISTS: 'Une invitation est déjà en attente pour cette adresse.',
          ORG_INACTIVE: 'L’organisation est inactive.',
          FORBIDDEN: 'Vous n’avez pas le droit d’inviter un correspondant.',
        };
        toast({
          variant: 'destructive',
          title: 'Invitation impossible',
          description: reasons[json.error] ?? json.error ?? `Erreur ${res.status}`,
        });
        return;
      }
      toast({
        title: 'Invitation envoyée',
        description: json.emailSent
          ? `E-mail transmis à ${json.invitation?.email}`
          : `Invitation créée pour ${json.invitation?.email}.`,
      });
      const invited = inviteTarget;
      setInviteTarget(null);
      setInviteEmail('');
      if (detailOpen && detailSource && invited.id === detailSource.id) {
        await loadPartnerDetail(detailSource);
      }
    } finally {
      setInviteBusy(false);
    }
  };

  const formatTrashDate = (rawDate?: string | null) => {
    if (!rawDate) return { dateStr: '—', timeStr: '' };
    try {
      const d = new Date(rawDate);
      if (Number.isNaN(d.getTime())) return { dateStr: '—', timeStr: '' };
      const dateStr = d.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const timeStr = d.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return { dateStr, timeStr };
    } catch {
      return { dateStr: '—', timeStr: '' };
    }
  };

  // Filtered items
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const matchName = item.name.toLowerCase().includes(q);
      const matchValue = item.value?.toLowerCase().includes(q) ?? false;
      const matchDesc =
        ((item.meta?.description as string) || '').toLowerCase().includes(q) ?? false;
      return matchName || matchValue || matchDesc;
    });
  }, [items, search]);

  const exportHeaders = ['Nom', 'Catégorie', 'Code / Slug', 'Statut', 'Description'] as const

  const buildExportRows = (list: ReferentialItem[]) =>
    list.map((i) => [
      i.name || '—',
      i.categoryId || '—',
      i.value || '—',
      i.archived ? 'Archivé' : organizationIsInactive(i) ? 'Désactivé' : 'Actif',
      (i.meta?.description as string) || '—',
    ])

  const handleExportExcel = async () => {
    const activeList = filteredItems
    if (activeList.length === 0) {
      toast({ title: 'Aucune donnée à exporter' })
      return
    }
    setExporting(true)
    try {
      const ExcelJS = (await import('@/lib/exceljs')).default
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'CSIRT-ARPT'
      workbook.created = new Date()
      const sheet = workbook.addWorksheet('Référentiels', {
        views: [{ state: 'frozen', ySplit: 1 }],
      })
      sheet.columns = exportHeaders.map((header, index) => ({
        header,
        key: `c${index}`,
        width: index === 0 || index === 4 ? 28 : 16,
      }))
      const headerRow = sheet.getRow(1)
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F6B42' },
      }
      headerRow.alignment = { vertical: 'middle' }
      buildExportRows(activeList).forEach((row) => {
        sheet.addRow(Object.fromEntries(row.map((value, index) => [`c${index}`, value])))
      })
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `referentiels_${activeTab}_${format(new Date(), 'yyyyMMdd-HHmm')}.xlsx`
      link.click()
      URL.revokeObjectURL(url)
      toast({ title: `${activeList.length} élément(s) exporté(s) en Excel` })
    } catch {
      toast({ variant: 'destructive', title: 'Échec de l’export Excel' })
    } finally {
      setExporting(false)
    }
  }

  const handleExportPdf = () => {
    const activeList = filteredItems
    if (activeList.length === 0) {
      toast({ title: 'Aucune donnée à exporter' })
      return
    }
    const opened = openTablePdfInTab({
      filename: `referentiels_${activeTab}_${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`,
      title: 'CSIRT-ARPT — Référentiels',
      subtitle: `${activeTab} · ${format(new Date(), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}`,
      headers: [...exportHeaders],
      rows: buildExportRows(activeList),
    })
    if (!opened) {
      toast({
        variant: 'destructive',
        title: 'Aperçu bloqué',
        description: 'Autorisez les pop-ups pour visualiser le PDF.',
      })
      return
    }
    toast({ title: 'PDF ouvert dans un nouvel onglet' })
  }

  return (
    <div className="ref-management-wrap admin-theme">
      {/* Header */}
      <AdminPageHeader
        title="Référentiels & Nomenclatures"
        description="Gestion des groupes d’accès, des thématiques, des organisations et des natures de signalement."
        eyebrow="Administration Système"
        actions={
          <div className="flex items-center gap-2">
            {activeTab === 'trash' ? (
              <button
                type="button"
                onClick={() => setEmptyTrashDialogOpen(true)}
                disabled={trashItems.length === 0}
                className="ref-empty-trash-btn"
              >
                <Trash2 className="h-4 w-4" />
                <span>Vider la corbeille</span>
              </button>
            ) : (
              <button
                type="button"
            onClick={() => {
                  if (activeTab === 'groupes') {
                    setGroupCreateToken((token) => token + 1);
                    return;
                  }
                  openCreateModal();
                }}
                className="ref-create-btn"
              >
                <Plus className="h-4 w-4" />
                <span>
                  {activeTab === 'groupes'
                    ? 'Nouveau groupe'
                    : activeTab === 'departements'
                    ? 'Nouveau département'
                    : activeTab === 'types_declarant'
                    ? 'Nouveau type déclarant'
                    : activeTab === 'organisations'
                    ? 'Nouvelle organisation'
                    : activeTab === 'natures_signalement'
                    ? 'Nouvelle nature'
                    : 'Nouvelle thématique'}
                </span>
              </button>
            )}
      </div>
        }
      />

      {/* Main Table Card */}
      <div className="ref-main-card">
        {/* Header Tabs & Toolbar */}
        <div className="ref-card-header">
          <div className="ref-tabs-group">
                <button
                  type="button"
              onClick={() => setActiveTab('thematiques')}
              className={cn('ref-tab-btn', activeTab === 'thematiques' && 'is-active')}
            >
              <Bookmark className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Thématiques</span>
              <span className="ref-tab-badge">{themesCount}</span>
                </button>

                <button
                  type="button"
              onClick={() => setActiveTab('types_declarant')}
              className={cn('ref-tab-btn', activeTab === 'types_declarant' && 'is-active')}
            >
              <UserCheck className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              <span>Types de déclarant</span>
              <span className="ref-tab-badge">{declarantTypesCount}</span>
                </button>

                <button
                  type="button"
              onClick={() => setActiveTab('organisations')}
              className={cn('ref-tab-btn', activeTab === 'organisations' && 'is-active')}
              >
              <Landmark className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
              <span>Organisations</span>
              <span className="ref-tab-badge">{organisationsCount}</span>
                </button>

              <button
                type="button"
                onClick={() => setActiveTab('natures_signalement')}
                className={cn('ref-tab-btn', activeTab === 'natures_signalement' && 'is-active')}
              >
                <ShieldAlert className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                <span>Nature du signalement</span>
                <span className="ref-tab-badge">{naturesCount}</span>
              </button>

              <button
                type="button"
              onClick={() => setActiveTab('groupes')}
              className={cn('ref-tab-btn', activeTab === 'groupes' && 'is-active')}
              >
              <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Groupes</span>
              <span className="ref-tab-badge">{groupsCount}</span>
              </button>

              <button
                type="button"
              onClick={() => setActiveTab('trash')}
              className={cn('ref-tab-btn', activeTab === 'trash' && 'is-active')}
            >
              <Trash2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>Corbeille</span>
              {trashItems.length > 0 && (
                <span className="ref-tab-badge bg-amber-500/15 text-amber-700 dark:text-amber-300">
                  {trashItems.length}
                </span>
              )}
              </button>
      </div>

          {activeTab === 'groupes' ? null : <div className="ref-toolbar-actions">
            {/* Search Input */}
            <div className="ref-search-input-wrap">
              <Search className="ref-search-icon" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="ref-search-input"
                />
              </div>

            {/* Refresh */}
              <button
                type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Rafraîchir les données"
              className="ref-action-btn ref-toolbar-btn--refresh"
            >
              <RefreshCw className={cn('h-3 w-3', isRefreshing && 'animate-spin')} />
              </button>

            {/* Export Excel / PDF — monté après hydratation : l’id Radix diverge sinon. */}
            <ClientMount
              fallback={
              <button
                type="button"
                  title="Exporter (Excel ou PDF)"
                  className="ref-action-btn ref-toolbar-btn--export"
                  disabled
                >
                  <Download className="h-3 w-3" />
              </button>
              }
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
              <button
                    type="button"
                    title="Exporter (Excel ou PDF)"
                    className="ref-action-btn ref-toolbar-btn--export"
                    disabled={exporting || filteredItems.length === 0}
                  >
                    {exporting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Download className="h-3 w-3" />
                    )}
              </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 text-xs">
                  <DropdownMenuItem
                    disabled={exporting || filteredItems.length === 0}
                    onClick={() => void handleExportExcel()}
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                    Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={exporting || filteredItems.length === 0}
                    onClick={handleExportPdf}
                  >
                    <FileDown className="h-3.5 w-3.5 mr-2 text-red-600" />
                    PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </ClientMount>

            {/* Vider la corbeille rapide si dans l'onglet corbeille */}
            {activeTab === 'trash' && trashItems.length > 0 && (
              <button
                type="button"
                onClick={() => setEmptyTrashDialogOpen(true)}
        title="Vider la corbeille"
                className="ref-action-btn ref-toolbar-btn--empty-trash"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
    </div>}
    </div>

        {activeTab === 'organisations' ? (
          <>
            <OrganizationDeactivationInbox onDecided={() => { if (detailSource) void loadPartnerDetail(detailSource); }} />
            <CorrespondentDeactivationInbox onDecided={() => { if (detailSource) void loadPartnerDetail(detailSource); }} />
          </>
        ) : null}

        {activeTab === 'groupes' ? (
          <AccessGroupsPanel createToken={groupCreateToken} onCountChange={setGroupsCount} />
        ) : (
        <div className="ref-table-container">
          <table className="ref-table">
            <thead>
              <tr>
                <th style={{ width: activeTab === 'organisations' ? '26%' : activeTab === 'trash' ? '24%' : '30%' }}>Libellé</th>
                {activeTab === 'organisations' && (
                  <th style={{ width: '22%' }}>Type de déclarant</th>
                )}
                <th style={{ width: activeTab === 'organisations' ? '18%' : activeTab === 'trash' ? '18%' : '22%' }}>Code / Slug</th>
                <th style={{ width: activeTab === 'organisations' ? '14%' : activeTab === 'trash' ? '16%' : '22%' }}>Catégorie</th>
                {activeTab === 'trash' && (
                  <th style={{ width: '20%' }}>Mise en corbeille</th>
                )}
                <th style={{ width: activeTab === 'organisations' ? '8%' : activeTab === 'trash' ? '9%' : '12%' }}>Statut</th>
                <th style={{ width: activeTab === 'organisations' ? '12%' : activeTab === 'trash' ? '13%' : '14%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={activeTab === 'organisations' || activeTab === 'trash' ? 6 : 5} className="py-10 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-5 w-5 animate-spin text-[#1f6b42]" />
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        Chargement des données…
          </span>
        </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'organisations' || activeTab === 'trash' ? 6 : 5} className="py-10 text-center">
                    {search ? (
                      <div className="flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
                        <Search className="h-6 w-6 text-muted-foreground/50 mb-0.5" />
                        <p className="text-xs font-semibold text-foreground">
                          Aucun résultat trouvé
                        </p>
                        <p className="text-[11px]">
                          Aucun élément ne correspond à « <span className="font-semibold text-foreground">{search}</span> »
                        </p>
    <button
      type="button"
                          onClick={() => setSearch('')}
                          className="mt-1 text-[11px] font-bold text-[#1f6b42] hover:underline"
                        >
                          Effacer la recherche
    </button>
    </div>
                    ) : activeTab === 'trash' ? (
                      <div className="flex flex-col items-center justify-center gap-1.5 py-2 text-muted-foreground">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-0.5">
                          <Trash2 className="h-5 w-5" />
      </div>
                        <p className="text-xs font-bold text-[#0b1f14] dark:text-white">
                          La corbeille est vide
                        </p>
                        <p className="text-[11px] max-w-sm text-muted-foreground text-center">
                          Aucun élément n’a été archivé. Les éléments mis en corbeille sont conservés pendant 3 mois avant suppression définitive automatique.
                        </p>
        </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 py-2 text-muted-foreground">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-[#1f6b42] dark:text-emerald-400">
                          {activeTab === 'thematiques' ? (
                            <Bookmark className="h-5 w-5" />
                          ) : activeTab === 'departements' ? (
                            <Building2 className="h-5 w-5" />
                          ) : activeTab === 'types_declarant' ? (
                            <UserCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          ) : activeTab === 'natures_signalement' ? (
                            <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                          ) : (
                            <Landmark className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                          )}
          </div>
                        <p className="text-xs font-bold text-[#0b1f14] dark:text-white">
                          Aucun élément enregistré
                        </p>
                        <p className="text-[11px] max-w-xs text-muted-foreground">
                          {activeTab === 'thematiques'
                            ? 'Créez votre première thématique de veille pour catégoriser vos flux d’actualités.'
                            : activeTab === 'departements'
                            ? 'Ajoutez les directions et services de votre organisation.'
                            : activeTab === 'types_declarant'
                            ? 'Définissez les profils de déclarants d’incidents cyber (particulier, opérateur, administration…).'
                            : activeTab === 'natures_signalement'
                            ? 'Définissez les types d’incidents proposés sur le formulaire public de signalement.'
                            : 'Enregistrez les organisations partenaires, régulateurs et opérateurs télécoms.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => openCreateModal()}
                          className="ref-create-btn"
                          style={{ marginTop: '0.5rem' }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>
                            {activeTab === 'thematiques'
                              ? 'Créer une thématique'
                              : activeTab === 'departements'
                              ? 'Créer un département'
                              : activeTab === 'types_declarant'
                              ? 'Créer un type déclarant'
                              : activeTab === 'natures_signalement'
                              ? 'Créer une nature'
                              : 'Créer une organisation'}
                          </span>
                        </button>
        </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const description = item.meta?.description as string | undefined;
                  const dotColor =
                    item.categoryId === 'thematiques'
                      ? 'bg-[#1f6b42]'
                      : item.categoryId === 'departements'
                      ? 'bg-blue-600'
                      : item.categoryId === 'types_declarant'
                      ? 'bg-purple-600'
                      : item.categoryId === 'natures_signalement'
                      ? 'bg-rose-600'
                      : 'bg-teal-600';

        return (
                    <tr key={item.id}>
                      {/* Name & Description */}
                      <td>
                        <div className="flex items-start gap-2">
                          <span
        className={cn(
                              'mt-1 h-2 w-2 rounded-full flex-shrink-0',
                              dotColor
                            )}
                          />
                          <div>
                            <span className="font-bold text-[#0b1f14] dark:text-[#f0fdf4]">
                              {item.name}
              </span>
                            {description && (
                              <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                                {description}
                              </p>
                            )}
          </div>
                        </div>
                      </td>

                      {/* Type de déclarant (si onglet Organisations) */}
                      {activeTab === 'organisations' && (
                        <td>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40">
                            <UserCheck className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                            {getDeclarantTypeLabel(item.meta?.declarantType as string, item.name, item.value)}
              </span>
                        </td>
                      )}

                      {/* Code / Slug */}
                      <td>
                        {item.value ? (
                          <button
                            type="button"
                            onClick={() => handleCopy(item.value!, 'Code')}
                            className="ref-code-chip"
                            title="Cliquer pour copier le code"
                          >
                            <span>{item.value}</span>
                            <Copy className="h-2.5 w-2.5 opacity-60" />
                          </button>
                        ) : (
                          <span className="text-[11px] italic text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Category */}
                      <td>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                          {item.categoryId === 'thematiques' ? (
                            <>
                              <Bookmark className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                              Thématique
                            </>
                          ) : item.categoryId === 'departements' ? (
                            <>
                              <Building2 className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                              Département
                            </>
                          ) : item.categoryId === 'types_declarant' ? (
                            <>
                              <UserCheck className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                              Type déclarant
                            </>
                          ) : item.categoryId === 'natures_signalement' ? (
                            <>
                              <ShieldAlert className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                              Nature signalement
          </>
        ) : (
                            <>
                              <Landmark className="h-3 w-3 text-teal-600 dark:text-teal-400" />
                              Organisation
                            </>
                          )}
              </span>
                      </td>

                      {/* Date & Heure mise en corbeille (si onglet Corbeille) */}
                      {activeTab === 'trash' && (
                        <td>
                          {(() => {
                            const rawArchived =
                              item.archivedAt ||
                              (item.meta?.archivedAt as string | undefined) ||
                              item.updatedAt;
                            const { dateStr, timeStr } = formatTrashDate(rawArchived);
        return (
                              <div className="flex flex-col text-[11px] leading-tight">
                                <span className="font-semibold text-[#0b1f14] dark:text-[#f0fdf4]">
                                  {dateStr}
              </span>
                                {timeStr && (
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    à {timeStr}
              </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                      )}

                      {/* Status */}
                      <td>
                        {item.archived ? (
                          <span className="ref-status-pill ref-status-pill--trash">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                            Archivé
                </span>
                        ) : organizationIsInactive(item) ? (
                          <span className="ref-status-pill ref-status-pill--inactive">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                            Désactivé
              </span>
                        ) : (
                          <span className="ref-status-pill ref-status-pill--active">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Actif
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div className="inline-flex items-center gap-1.5">
                          {activeTab === 'trash' ? (
              <>
                <button
                  type="button"
                                onClick={() => handleRestore(item)}
                                title="Restaurer cet élément"
                                className="ref-action-btn ref-action-btn--restore"
                              >
                                <RotateCcw className="h-3 w-3" />
                </button>
                <button
                  type="button"
                                onClick={() => setDeleteTarget(item)}
                  title="Supprimer définitivement"
                                className="ref-action-btn ref-action-btn--purge"
                >
                                <X className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <>
                {activeTab === 'organisations' ? (
                <button
                  type="button"
                    onClick={() => openDetails(item)}
                    title="Voir les détails"
                    aria-label={`Voir les détails de ${item.name}`}
                    className="ref-action-btn ref-action-btn--detail"
                  >
                    <Eye className="h-3 w-3" />
                  </button>
                ) : null}
                {activeTab === 'organisations' ? (
                  <button
                    type="button"
                    onClick={() => openInvite(item)}
                    title="Inviter un correspondant"
                    aria-label={`Inviter un correspondant pour ${item.name}`}
                    className="ref-action-btn ref-action-btn--invite"
                  >
                    <Mail className="h-3 w-3" />
                  </button>
                ) : null}
                <button
                  type="button"
                                onClick={() => openEditModal(item)}
                  title="Modifier"
                                className="ref-action-btn ref-action-btn--edit"
                >
                                <Edit2 className="h-3 w-3" />
                </button>
                <button
                  type="button"
                                onClick={() => setArchiveTarget(item)}
                  title="Mettre en corbeille"
                                className="ref-action-btn ref-action-btn--delete"
                >
                                <Trash2 className="h-3 w-3" />
                </button>
              </>
            )}
          </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Modal Création / Édition */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="ref-modal-dialog max-w-lg">
          <form onSubmit={handleSave}>
            {/* Header avec icône moderne */}
            <div className="ref-modal-header">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'ref-modal-header-icon',
                    formCategory === 'thematiques'
                      ? 'ref-modal-header-icon--theme'
                      : formCategory === 'departements'
                      ? 'ref-modal-header-icon--dept'
                      : formCategory === 'types_declarant'
                      ? 'ref-modal-header-icon--declarant'
                      : formCategory === 'natures_signalement'
                      ? 'ref-modal-header-icon--declarant'
                      : 'ref-modal-header-icon--org'
                  )}
                >
                  {formCategory === 'thematiques' ? (
                    <Bookmark className="h-4 w-4" />
                  ) : formCategory === 'departements' ? (
                    <Building2 className="h-4 w-4" />
                  ) : formCategory === 'types_declarant' ? (
                    <UserCheck className="h-4 w-4" />
                  ) : formCategory === 'natures_signalement' ? (
                    <ShieldAlert className="h-4 w-4" />
                  ) : (
                    <Landmark className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <DialogTitle className="ref-modal-title">
                    {editingItem
                      ? `Modifier « ${editingItem.name} »`
                      : formCategory === 'thematiques'
                      ? 'Nouvelle thématique de veille'
                      : formCategory === 'departements'
                      ? 'Nouveau département / service'
                      : formCategory === 'types_declarant'
                      ? 'Nouveau type de déclarant'
                      : formCategory === 'natures_signalement'
                      ? 'Nouvelle nature de signalement'
                      : 'Nouvelle organisation / partenaire'}
                  </DialogTitle>
                  <DialogDescription className="ref-modal-desc">
                    Configurez le libellé, le code technique et la description associée.
                  </DialogDescription>
                </div>
              </div>
            </div>

            {/* Corps du formulaire */}
            <div className="ref-modal-body">
              {/* Libellé */}
              <div className="ref-form-group">
                <label className="ref-form-label">
                  <span>
                    Intitulé / Libellé <span className="text-red-500">*</span>
                  </span>
                  <span className="ref-form-hint">Nom public et affiché</span>
                </label>
                <div className="ref-input-wrap">
                  {formCategory === 'thematiques' ? (
                    <Tag className="ref-input-icon" />
                  ) : formCategory === 'departements' ? (
                    <Building2 className="ref-input-icon" />
                  ) : formCategory === 'types_declarant' ? (
                    <UserCheck className="ref-input-icon" />
                  ) : formCategory === 'natures_signalement' ? (
                    <ShieldAlert className="ref-input-icon" />
                  ) : (
                    <Landmark className="ref-input-icon" />
                  )}
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder={
                      formCategory === 'thematiques'
                        ? 'Ex. Cybersécurité, Infrastructure & Réseaux…'
                        : formCategory === 'departements'
                        ? 'Ex. Direction générale, Affaires juridiques…'
                        : formCategory === 'types_declarant'
                        ? 'Ex. Particulier, Entreprise privée, Opérateur / FAI…'
                        : formCategory === 'natures_signalement'
                        ? 'Ex. Attaques réseau, Hameçonnage, Déni de service…'
                        : 'Ex. ARPT, Orange Guinée, MTN, Banque Centrale…'
                    }
                    className="ref-form-input"
                  />
                </div>
              </div>

              {/* Code / Slug */}
              <div className="ref-form-group">
                <label className="ref-form-label">
                  <span>Code / Identifiant technique</span>
                  <span className="ref-form-hint">Généré automatiquement</span>
                </label>
                <div className="ref-input-wrap">
                  <Layers className="ref-input-icon" />
                  <input
                    type="text"
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    placeholder={
                      formCategory === 'thematiques'
                        ? 'Ex. cybersecurite'
                        : formCategory === 'departements'
                        ? 'Ex. direction-generale'
                        : formCategory === 'types_declarant'
                        ? 'Ex. operateur-fai'
                        : formCategory === 'natures_signalement'
                        ? 'Ex. phishing'
                        : 'Ex. orange-guinee'
                    }
                    className="ref-form-input font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* Type de déclarant lié pour les organisations */}
              {formCategory === 'organisations' && (
                <div className="ref-form-group">
                  <label className="ref-form-label">
                    <span>
                      Type de déclarant lié <span className="text-red-500">*</span>
                    </span>
                    <span className="ref-form-hint">Profil associé au signalement d’incident</span>
                  </label>
                  <div className="ref-input-wrap">
                    <UserCheck className="ref-input-icon" />
                    <select
                      value={formDeclarantType}
                      onChange={(e) => setFormDeclarantType(e.target.value)}
                      className="ref-form-input"
                      style={{ cursor: 'pointer' }}
                      required
                    >
                      <option value="">-- Sélectionner le type de déclarant --</option>
                      {(declarantList.length > 0
                        ? declarantList
                        : DEFAULT_DECLARANT_TYPES_SEED.map((d) => ({
                            id: d.value || d.name,
                            name: d.name,
                            value: d.value,
                          }))
                      ).map((d) => (
                        <option key={d.id} value={d.value || d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {formCategory === 'organisations' && (
                <div className="ref-form-group">
                  <label className="ref-form-label">
                    <span>Domaines e-mail professionnels</span>
                    <span className="ref-form-hint">
                      Séparez par des virgules — ex. orange-sonatel.com
                    </span>
                  </label>
                  <input
                    type="text"
                    value={formEmailDomains}
                    onChange={(e) => setFormEmailDomains(e.target.value)}
                    placeholder="orange-sonatel.com, arpt.gov.gn"
                    className="ref-form-input font-mono text-[11px]"
                  />
                </div>
              )}

              {/* Description */}
              <div className="ref-form-group">
                <label className="ref-form-label">
                  <span>Description & remarques</span>
                  <span className="ref-form-hint">Optionnel</span>
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={
                    formCategory === 'thematiques'
                      ? 'Précisez le périmètre d’application ou les mots-clés de veille associés…'
                      : formCategory === 'departements'
                      ? 'Précisez les attributions de la direction ou du service…'
                      : formCategory === 'types_declarant'
                      ? 'Précisez les critères et profils applicables à ce type de déclarant…'
                      : formCategory === 'natures_signalement'
                      ? 'Précisez le périmètre, les exemples ou les critères de cette nature d’incident…'
                      : 'Précisez le statut institutionnel, secteur d’activité ou coordonnées…'
                  }
                  className="ref-form-textarea"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="ref-modal-footer">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="ref-btn-cancel"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="ref-btn-submit"
              >
                {isSaving ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                <span>{editingItem ? 'Mettre à jour' : 'Créer l’élément'}</span>
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDetailOpen(false);
            setDetailSource(null);
            setPartnerId(null);
            setOrgDetail(null);
          }
        }}
      >
        <DialogContent className="ref-org-sheet" showCloseButton={false}>
          <DialogTitle className="sr-only">
            Détails de {orgDetail?.name ?? detailSource?.name ?? 'l’organisation'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Informations, correspondants et invitations de l’organisation.
          </DialogDescription>
          <OrganizationsDetailPanel
            selectedId={detailSource?.id ?? null}
            detail={orgDetail}
            loading={detailLoading}
            tab={detailTab}
            onTab={setDetailTab}
            onClose={() => {
              setDetailOpen(false);
              setDetailSource(null);
              setPartnerId(null);
              setOrgDetail(null);
            }}
            formatActivity={formatActivity}
            formatDate={formatDate}
            statusLabels={{
              PENDING: 'En attente',
              ACCEPTED: 'Acceptée',
              EXPIRED: 'Inactive',
              CANCELLED: 'Annulée',
            }}
            canEdit={canEditOrg && Boolean(detailSource)}
            canToggle={canToggleOrg && Boolean(partnerId)}
            canInvite={canInvite && Boolean(detailSource)}
            canResend={canResend}
            canCancel={canCancelInvite}
            canToggleUser={canToggleUser}
            actionBusy={detailBusy}
            onEdit={() => {
              if (detailSource) openEditModal(detailSource);
            }}
            onToggle={() => void handleTogglePartner()}
            onDecide={(decision) => void handleDecideDeactivation(decision)}
            onDecideUser={(requestId, decision) => void handleDecideCorrespondent(requestId, decision)}
            onInvite={() => {
              if (detailSource) openInvite(detailSource);
            }}
            onResend={(id) => void handleResendInvite(id)}
            onCancelInvite={(id) => void handleCancelInvite(id)}
            onToggleUser={(userId, active) => void handleToggleCorrespondent(userId, active)}
            variant="modal"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(inviteTarget)} onOpenChange={(open) => !open && !inviteBusy && setInviteTarget(null)}>
        <DialogContent className="ref-modal-dialog max-w-md">
          <div className="ref-modal-header">
            <div className="flex items-center gap-3">
              <div className="ref-modal-header-icon ref-modal-header-icon--org">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="ref-modal-title">Inviter un correspondant</DialogTitle>
                <DialogDescription className="ref-modal-desc">
                  L’invitation est rattachée à {inviteTarget?.name}. Le nom de l’organisation n’est pas saisi.
                </DialogDescription>
              </div>
            </div>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleInviteCorrespondent();
            }}
          >
            <div className="ref-modal-body">
              <div className="ref-form-group">
                <label className="ref-form-label" htmlFor="ref-invite-org">
                  <span>Organisation</span>
                </label>
                <input id="ref-invite-org" className="ref-form-input" value={inviteTarget?.name ?? ''} readOnly tabIndex={-1} />
              </div>
              <div className="ref-form-group">
                <label className="ref-form-label" htmlFor="ref-invite-email">
                  <span>Adresse e-mail <span className="text-red-500">*</span></span>
                </label>
                <input
                  id="ref-invite-email"
                  type="email"
                  required
                  className="ref-form-input"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="correspondant@organisation.gn"
                  autoFocus
                />
              </div>
              <p className="ref-invite-expiry">
                Date d’expiration :{' '}
                <strong>
                  {format(new Date(Date.now() + expiryHours * 60 * 60 * 1000), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                </strong>
              </p>
            </div>
            <div className="ref-modal-footer">
              <button type="button" className="ref-btn-cancel" disabled={inviteBusy} onClick={() => setInviteTarget(null)}>
                Annuler
              </button>
              <button type="submit" className="ref-btn-submit" disabled={inviteBusy || !inviteEmail.includes('@')}>
                {inviteBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                <span>Envoyer l’invitation</span>
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmation Mise en Corbeille */}
      <AdminConfirmDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title="Mettre en corbeille ?"
        message={
          <p>
            L’élément « <span className="font-bold text-[#0b1f14] dark:text-[#f0fdf4]">{archiveTarget?.name}</span> » sera temporairement retiré de la liste active et placé dans la corbeille.
          </p>
        }
        confirmLabel="Mettre en corbeille"
        intent="archive"
        loading={isArchiving}
        onConfirm={handleArchive}
      />

      {/* Modal Confirmation Suppression Définitive */}
      <AdminConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Supprimer définitivement ?"
        message={
          <p>
            L’élément « <span className="font-bold text-red-600 dark:text-red-400">{deleteTarget?.name}</span> » sera définitivement effacé de la base de données.
          </p>
        }
        confirmLabel="Supprimer définitivement"
        intent="destructive"
        loading={isDeleting}
        onConfirm={handlePermanentDelete}
      />

      {/* Modal Confirmation Vider la Corbeille */}
      <AdminConfirmDialog
        open={emptyTrashDialogOpen}
        onOpenChange={setEmptyTrashDialogOpen}
        title="Vider la corbeille ?"
        message={
          <p>
            Tous les <span className="font-bold text-red-600 dark:text-red-400">{trashItems.length} élément{trashItems.length > 1 ? 's' : ''}</span> présents dans la corbeille seront <span className="font-semibold text-foreground">définitivement supprimés</span> de la base de données.
          </p>
        }
        confirmLabel="Vider la corbeille"
        intent="destructive"
        loading={isEmptyingTrash}
        onConfirm={handleEmptyTrash}
      />
    </div>
  );
}
