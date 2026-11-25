'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { decryptSignalement } from '@/lib/csirt/decrypt-signalement';
import { cachedGet } from '@/lib/client/cached-get';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Archive,
  ArrowUp,
  ArrowUpRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Flame,
  Hash,
  Inbox,
  Loader2,
  Lock,
  KeyRound,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Phone,
  PieChart as PieChartIcon,
  Printer,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Download,
  FileDown,
  FileSpreadsheet,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trash2,
  User,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import {
  AnalystEmailMultiSelect,
  type AnalystOption,
} from '@/components/admin/incidents/analyst-email-multi-select';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { FrenchDateField } from '@/components/ui/french-datetime-fields';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CSIRT_DECLARANT_TYPES, CSIRT_INCIDENT_TYPES } from '@/lib/csirt/signalement';
import { listExchangeMessages } from '@/lib/csirt/incident-exchange';
import type { SignalementNature } from '@/lib/csirt/signalement-natures';
import { DEFAULT_NATURES_SIGNALEMENT_SEED } from '@/lib/seed/referentials-default';
import {
  INCIDENT_SEVERITY_META,
  INCIDENT_STATUS_META,
  INCIDENT_TLP_META,
  getIncidentSeverityMeta,
  getIncidentStatusMeta,
  getIncidentTlpMeta,
  type CsirtIncident,
  type IncidentFilterStatus,
  type IncidentSeverity,
  type IncidentStats,
  type IncidentStatus,
  type IncidentTlp,
} from '@/lib/types/incident';
import { openTablePdfInTab, type PdfInsights } from '@/lib/export/download-table-pdf';
import { renderPilotagePng } from '@/lib/export/pilotage-png';
import { cn } from '@/lib/utils';
import '@/components/admin/incidents/incident-management.css';

const WORKFLOW_STEPS: Array<{
  status: IncidentStatus;
  stepNumber: number;
  label: string;
  sub: string;
}> = [
  { status: 'NOUVEAU', stepNumber: 1, label: '1. Réception', sub: 'Signalement reçu' },
  { status: 'INVESTIGATION', stepNumber: 2, label: '2. Investigation', sub: 'Analyse & Preuves' },
  { status: 'RESOLU', stepNumber: 3, label: '3. Résolu', sub: 'Clôture & Synthèse' },
];

/** Statuts retirés du workflow UI — mappés vers l’étape la plus proche. */
function toSelectableIncidentStatus(status: IncidentStatus): IncidentStatus {
  if (status === 'EN_COURS' || status === 'CONTENU') return 'INVESTIGATION';
  return status;
}

function plainSection(text: string, label: 'Cible' | 'Mesures déjà prises') {
  if (!text.trim()) return ''
  if (label === 'Cible') {
    return text.match(/(?:^|\n\n)Cible : ([^\n]+)/)?.[1]?.trim() || ''
  }
  return (
    text.match(
      /(?:^|\n\n)Mesures déjà prises :\n([\s\S]*?)(?=\n\n(?:Cible :|Fonction :)|$)/
    )?.[1]?.trim() || ''
  )
}

export function IncidentManagement() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const openedFromMailRef = useRef<string | null>(null);
  const [items, setItems] = useState<CsirtIncident[]>([]);
  const [stats, setStats] = useState<IncidentStats>({
    total: 0,
    nouveaux: 0,
    enCours: 0,
    investigation: 0,
    critiques: 0,
    resolus: 0,
    rejetes: 0,
    archived: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtres
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<IncidentFilterStatus>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Incident sélectionné pour le détail / traitement
  const [selectedIncident, setSelectedIncident] = useState<CsirtIncident | null>(null);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [detailTab, setDetailTab] = useState<'info' | 'workflow' | 'notes' | 'reply' | 'history'>('info');
  const [infoSectionOpen, setInfoSectionOpen] = useState<
    'declarant' | 'params' | 'description' | 'measures' | 'attachments' | null
  >(null);
  const [decryptOpen, setDecryptOpen] = useState(false);
  const [privateKey, setPrivateKey] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [needsPassphrase, setNeedsPassphrase] = useState(false);
  const [decryptedText, setDecryptedText] = useState('');
  const [sensitiveOpen, setSensitiveOpen] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState('');

  const clearDecrypt = useCallback(() => {
    setDecryptOpen(false);
    setPrivateKey('');
    setPassphrase('');
    setNeedsPassphrase(false);
    setDecryptedText('');
    setSensitiveOpen(false);
    setDecrypting(false);
    setDecryptError('');
    setInfoSectionOpen(null);
  }, []);

  useEffect(() => {
    clearDecrypt();
    setDetailTab('info');
  }, [selectedIncident?.id, clearDecrypt]);

  const revealSignalement = async () => {
    if (!selectedIncident || decrypting) return;
    setDecrypting(true);
    setDecryptError('');
    try {
      const text = await decryptSignalement(
        selectedIncident.description || '',
        privateKey,
        passphrase
      );
      setDecryptedText(text);
      setSensitiveOpen(true);
      setPrivateKey('');
      setPassphrase('');
      setNeedsPassphrase(false);
      setInfoSectionOpen('description');
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'PASSPHRASE') {
        setNeedsPassphrase(true);
        setDecryptError('Cette clé privée est protégée. Indiquez sa phrase secrète.');
      } else {
        setDecryptError(message || 'Déchiffrement impossible.');
      }
    } finally {
      setDecrypting(false);
    }
  };
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(new Date());

  // Formulaire de modification de workflow
  const [editStatus, setEditStatus] = useState<IncidentStatus>('NOUVEAU');
  const [editSeverity, setEditSeverity] = useState<IncidentSeverity>('MOYEN');
  const [editTlp, setEditTlp] = useState<IncidentTlp>('AMBER');
  const [editAssignedName, setEditAssignedName] = useState('');
  const [editAssignedEmail, setEditAssignedEmail] = useState('');
  const [selectedAssigneeEmails, setSelectedAssigneeEmails] = useState<string[]>([]);
  const [analystOptions, setAnalystOptions] = useState<AnalystOption[]>([]);
  const [loadingAnalysts, setLoadingAnalysts] = useState(false);
  const [editResolution, setEditResolution] = useState('');
  const [savingWorkflow, setSavingWorkflow] = useState(false);

  // Formulaire d'ajout de note
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Formulaire d'envoi de message au déclarant
  const [replySubject, setReplySubject] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Modal Nouveau signalement manuel
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    identify: 'yes' as 'yes' | 'no',
    declarantType: 'particulier',
    fullName: '',
    organization: '',
    email: '',
    phone: '',
    types: ['reseau'] as string[],
    description: '',
    measures: '',
    target: '',
    reported: 'no' as 'yes' | 'no',
  });
  const [creating, setCreating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showLift, setShowLift] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const [incidentTypeOptions, setIncidentTypeOptions] = useState<SignalementNature[]>(() =>
    DEFAULT_NATURES_SIGNALEMENT_SEED.length > 0
      ? DEFAULT_NATURES_SIGNALEMENT_SEED.map((item) => ({
          id: item.value || item.name,
          label: item.name,
        }))
      : CSIRT_INCIDENT_TYPES.map((item) => ({ id: item.id, label: item.label }))
  );

  useEffect(() => {
    if (!exportMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!exportMenuRef.current?.contains(event.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExportMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [exportMenuOpen]);

  useEffect(() => {
    const onScroll = () => setShowLift(window.scrollY > 420);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const liftToTop = () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  };

  useEffect(() => {
    let mounted = true;
    cachedGet<{ items?: Array<{ id: string; value?: string; name: string }> }>(
      '/api/admin/referentials/natures_signalement?archived=0',
      30000
    )
      .then((data) => {
        if (!mounted || !data?.items?.length) return;
        setIncidentTypeOptions(
          data.items.map((item: { id: string; value?: string; name: string }) => ({
            id: item.value || item.id,
            label: item.name,
          }))
        );
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const fetchIncidents = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      if (activeTab !== 'ALL') params.set('status', activeTab);
      if (severityFilter !== 'ALL') params.set('severity', severityFilter);
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);

      const res = await fetch(`/api/admin/incidents?${params.toString()}`);
      if (!res.ok) throw new Error('Erreur lors du chargement des incidents.');
      const data = await res.json();
      setItems(data.items || []);
      if (data.stats) setStats(data.stats);
      setLastSyncedAt(new Date());
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Impossible de récupérer les incidents.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, dateFrom, dateTo, search, severityFilter, toast]);

  const handleCopy = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedRef(text);
    toast({ title: 'Copié dans le presse-papier', description: text });
    setTimeout(() => setCopiedRef(null), 2000);
  };

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  useEffect(() => {
    const openKey = searchParams.get('open')?.trim();
    if (!openKey || loading || items.length === 0) return;
    if (openedFromMailRef.current === openKey) return;
    const found = items.find(
      (item) => item.id === openKey || item.reference.toLowerCase() === openKey.toLowerCase()
    );
    if (!found) return;
    openedFromMailRef.current = openKey;
    setSelectedIncident(found);
    setDetailTab('workflow');
    setInfoSectionOpen('declarant');
  }, [items, loading, searchParams]);

  useEffect(() => {
    if (!selectedIncident?.id) return;
    setInfoSectionOpen('declarant');
  }, [selectedIncident?.id]);

  // Données analytiques pour les graphes CSIRT
  const statusPieData = useMemo(() => [
    { name: 'Nouveaux', value: stats.nouveaux, color: '#ef4444' },
    { name: 'En cours', value: stats.enCours, color: '#f59e0b' },
    { name: 'Investigation', value: stats.investigation, color: '#3b82f6' },
    { name: 'Résolus', value: stats.resolus, color: '#10b981' },
    { name: 'Rejetés', value: stats.rejetes, color: '#94a3b8' },
  ].filter((d) => d.value > 0), [stats]);

  const severityBarData = useMemo(() => {
    const counts = {
      CRITIQUE: items.filter((i) => i.severity === 'CRITIQUE').length,
      ELEVE: items.filter((i) => i.severity === 'ELEVE').length,
      MOYEN: items.filter((i) => i.severity === 'MOYEN').length,
      FAIBLE: items.filter((i) => i.severity === 'FAIBLE').length,
    };
    return [
      { level: 'Critique (P1)', count: counts.CRITIQUE, color: '#dc2626' },
      { level: 'Élevé (P2)', count: counts.ELEVE, color: '#ea580c' },
      { level: 'Moyen (P3)', count: counts.MOYEN, color: '#2563eb' },
      { level: 'Faible (P4)', count: counts.FAIBLE, color: '#059669' },
    ];
  }, [items]);

  // Synchroniser le formulaire d'édition lorsque l'incident sélectionné change
  useEffect(() => {
    if (selectedIncident) {
      setEditStatus(toSelectableIncidentStatus(selectedIncident.status));
      setEditSeverity(selectedIncident.severity);
      setEditTlp(selectedIncident.tlp);
      const emails = (selectedIncident.assignedTo?.email || '')
        .split(/[,;]+/)
        .map((value) => value.trim())
        .filter(Boolean);
      setSelectedAssigneeEmails(emails);
      setEditAssignedName(selectedIncident.assignedTo?.name || '');
      setEditAssignedEmail(emails.join(', '));
      setEditResolution(selectedIncident.resolutionSummary || '');
      setReplySubject(`Prise en charge du signalement ${selectedIncident.reference}`);
      setReplyMessage(
        `Bonjour,\n\nVotre signalement d'incident référencé ${selectedIncident.reference} a bien été analysé par le CSIRT-ARPT.\n\n`
      );
    }
  }, [selectedIncident]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoadingAnalysts(true);
      try {
        const json = await cachedGet<{ items?: AnalystOption[] }>(
          '/api/admin/incidents/assignees',
          30000
        );
        if (cancelled) return;
        const items = Array.isArray(json.items) ? json.items : [];
        setAnalystOptions(items);
      } catch {
        /* liste optionnelle */
      } finally {
        if (!cancelled) setLoadingAnalysts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Enrichit les noms dès que le catalogue analystes est disponible
  useEffect(() => {
    if (!analystOptions.length || selectedAssigneeEmails.length === 0) return;
    const selected = selectedAssigneeEmails
      .map((email) =>
        analystOptions.find((opt) => opt.email.toLowerCase() === email.toLowerCase())
      )
      .filter((item): item is AnalystOption => Boolean(item));
    if (selected.length === 0 || selected.length !== selectedAssigneeEmails.length) return;
    setEditAssignedName(selected.map((item) => item.fullName).join(', '));
    setEditAssignedEmail(selected.map((item) => item.email).join(', '));
  }, [analystOptions, selectedAssigneeEmails]);

  function applyAssigneeSelection(selected: AnalystOption[]) {
    const emails = selected.map((item) => item.email);
    setSelectedAssigneeEmails(emails);
    setEditAssignedEmail(emails.join(', '));
    setEditAssignedName(selected.map((item) => item.fullName).join(', '));
  }

  const handleSaveWorkflow = async () => {
    if (!selectedIncident) return;
    setSavingWorkflow(true);
    try {
      const payload = {
        status: editStatus,
        severity: editSeverity,
        tlp: editTlp,
        assignedTo: selectedAssigneeEmails.length
          ? {
              id: selectedAssigneeEmails.map((email) => {
                const match = analystOptions.find(
                  (opt) => opt.email.toLowerCase() === email.toLowerCase()
                );
                return match?.id || email;
              }).join(','),
              name: editAssignedName.trim(),
              email: selectedAssigneeEmails.join(', '),
            }
          : null,
        resolutionSummary: editResolution.trim(),
      };

      const res = await fetch(`/api/admin/incidents/${selectedIncident.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.error === 'CORRESPONDANT_NOT_ASSIGNABLE'
            ? 'Un correspondant d’organisation ne peut pas être assigné comme analyste.'
            : 'Erreur lors de la mise à jour de l’incident.'
        );
      }
      setSelectedIncident(data.incident);
      const mailed = Array.isArray(data.assignmentMail?.sent) ? data.assignmentMail.sent.length : 0;
      const mailFailed = Array.isArray(data.assignmentMail?.failed)
        ? data.assignmentMail.failed.length
        : 0;
      const statusMailed = Array.isArray(data.statusMail?.sent) ? data.statusMail.sent.length : 0;
      const statusMailFailed = Array.isArray(data.statusMail?.failed)
        ? data.statusMail.failed.length
        : 0;

      let description = 'Le statut et le traitement de l’incident ont été mis à jour.';
      if (statusMailed > 0 && mailed > 0) {
        description = `Traitement enregistré. Notification de statut envoyée à ${statusMailed} destinataire${statusMailed > 1 ? 's' : ''} ; assignation notifiée à ${mailed} analyste${mailed > 1 ? 's' : ''}.`;
      } else if (statusMailed > 0) {
        description = `Traitement enregistré. Notification de statut envoyée à ${statusMailed} destinataire${statusMailed > 1 ? 's' : ''} (analyste / demandeur).`;
      } else if (mailed > 0) {
        description = `Traitement enregistré. Notification d’assignation envoyée à ${mailed} analyste${mailed > 1 ? 's' : ''}.`;
      } else if (statusMailFailed > 0 || mailFailed > 0) {
        description = 'Traitement enregistré, mais l’envoi e-mail a échoué pour certains destinataires.';
      }

      toast({
        title: 'Succès',
        description,
      });
      fetchIncidents(true);
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Impossible de mettre à jour.',
        variant: 'destructive',
      });
    } finally {
      setSavingWorkflow(false);
    }
  };

  const handleQuickStatusTransition = async (targetStatus: IncidentStatus) => {
    if (!selectedIncident) return;
    setSavingWorkflow(true);
    try {
      const res = await fetch(`/api/admin/incidents/${selectedIncident.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });
      if (!res.ok) throw new Error('Erreur lors du changement de statut.');
      const data = await res.json();
      setSelectedIncident(data.incident);
      setEditStatus(targetStatus);
      const statusMailed = Array.isArray(data.statusMail?.sent) ? data.statusMail.sent.length : 0;
      const statusMailFailed = Array.isArray(data.statusMail?.failed)
        ? data.statusMail.failed.length
        : 0;
      toast({
        title: 'Étape mise à jour',
        description:
          statusMailed > 0
            ? `Statut : ${getIncidentStatusMeta(targetStatus).label}. Notification envoyée à ${statusMailed} destinataire${statusMailed > 1 ? 's' : ''} (analyste / demandeur).`
            : statusMailFailed > 0
              ? `Statut : ${getIncidentStatusMeta(targetStatus).label}. L’envoi e-mail a échoué.`
              : `L'incident est maintenant à l'étape : ${getIncidentStatusMeta(targetStatus).label}`,
      });
      fetchIncidents(true);
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Impossible de changer le statut.',
        variant: 'destructive',
      });
    } finally {
      setSavingWorkflow(false);
    }
  };

  const handleAddNote = async () => {
    if (!selectedIncident || !newNote.trim()) return;
    setAddingNote(true);
    try {
      const res = await fetch(`/api/admin/incidents/${selectedIncident.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote.trim(), isInternal: true }),
      });
      if (!res.ok) throw new Error('Erreur lors de l’ajout de la note.');
      const data = await res.json();
      setSelectedIncident((prev) =>
        prev
          ? {
              ...prev,
              notes: [data.note, ...prev.notes],
              activityLog: [
                {
                  id: `act-${Date.now()}`,
                  actorName: 'Vous',
                  action: 'Note d’investigation ajoutée',
                  details: newNote.trim().slice(0, 100),
                  createdAt: new Date().toISOString(),
                },
                ...prev.activityLog,
              ],
            }
          : null
      );
      setNewNote('');
      toast({ title: 'Note ajoutée', description: 'La note d’investigation a été consignée.' });
      fetchIncidents(true);
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Impossible d’ajouter la note.',
        variant: 'destructive',
      });
    } finally {
      setAddingNote(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedIncident || replyMessage.trim().length < 2) return;
    setSendingReply(true);
    try {
      const res = await fetch(`/api/admin/incidents/${selectedIncident.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: replySubject.trim() || `Réponse — ${selectedIncident.reference}`,
          message: replyMessage.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l’envoi.');
      }
      if (data.note) {
        setSelectedIncident((prev) =>
          prev
            ? {
                ...prev,
                notes: [data.note, ...prev.notes.filter((note) => note.id !== data.note.id)],
              }
            : prev
        );
      }
      toast({
        title: 'Réponse envoyée',
        description: data.mailed
          ? `Le correspondant ${selectedIncident.email} a reçu le message.`
          : `Le message est dans l’échange. L’e-mail n’a pas pu être envoyé.`,
      });
      setReplyMessage('');
      fetchIncidents(true);
    } catch (err) {
      toast({
        title: 'Erreur d’envoi',
        description: err instanceof Error ? err.message : 'Impossible d’envoyer le message.',
        variant: 'destructive',
      });
    } finally {
      setSendingReply(false);
    }
  };

  const handleArchive = async (incident: CsirtIncident) => {
    try {
      const res = await fetch(`/api/admin/incidents/${incident.id}/archive`, { method: 'POST' });
      if (!res.ok) throw new Error('Impossible d’archiver cet incident.');
      toast({ title: 'Incident archivé', description: `L’incident ${incident.reference} est dans la corbeille.` });
      if (selectedIncident?.id === incident.id) setSelectedIncident(null);
      fetchIncidents(true);
    } catch (err) {
      toast({ title: 'Erreur', description: String(err), variant: 'destructive' });
    }
  };

  const handleRestore = async (incident: CsirtIncident) => {
    try {
      const res = await fetch(`/api/admin/incidents/${incident.id}/restore`, { method: 'POST' });
      if (!res.ok) throw new Error('Impossible de restaurer cet incident.');
      toast({ title: 'Incident restauré', description: `L’incident ${incident.reference} a été restauré.` });
      if (selectedIncident?.id === incident.id) setSelectedIncident(null);
      fetchIncidents(true);
    } catch (err) {
      toast({ title: 'Erreur', description: String(err), variant: 'destructive' });
    }
  };

  const handleDeletePermanent = async (incident: CsirtIncident) => {
    if (!confirm(`Confirmer la suppression DÉFINITIVE de l'incident ${incident.reference} ?`)) return;
    try {
      const res = await fetch(`/api/admin/incidents/${incident.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Impossible de supprimer définitivement.');
      toast({ title: 'Supprimé', description: `L’incident ${incident.reference} a été supprimé définitivement.` });
      if (selectedIncident?.id === incident.id) setSelectedIncident(null);
      fetchIncidents(true);
    } catch (err) {
      toast({ title: 'Erreur', description: String(err), variant: 'destructive' });
    }
  };

  const checkedInView = items.filter((item) => checkedIds.includes(item.id));
  const allChecked = items.length > 0 && checkedInView.length === items.length;
  const someChecked = checkedInView.length > 0 && !allChecked;

  const toggleChecked = (id: string) => {
    setCheckedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const toggleAllChecked = () => {
    const ids = items.map((item) => item.id);
    setCheckedIds((current) => {
      if (ids.every((id) => current.includes(id))) {
        return current.filter((id) => !ids.includes(id));
      }
      return [...new Set([...current, ...ids])];
    });
  };

  const runOnChecked = async (action: 'archive' | 'restore') => {
    const chosen = checkedInView;
    if (chosen.length === 0) return;
    let done = 0;
    for (const incident of chosen) {
      const res = await fetch(`/api/admin/incidents/${incident.id}/${action}`, { method: 'POST' });
      if (res.ok) done += 1;
    }
    setCheckedIds([]);
    if (selectedIncident && chosen.some((item) => item.id === selectedIncident.id)) {
      setSelectedIncident(null);
    }
    toast({
      title: action === 'archive' ? 'Incidents archivés' : 'Incidents restaurés',
      description: `${done} signalement${done > 1 ? 's' : ''}.`,
    });
    fetchIncidents(true);
  };

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.description.trim() || createForm.types.length === 0) {
      toast({ title: 'Champs requis', description: 'Veuillez renseigner la description et au moins un type.', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      if (!res.ok) throw new Error('Erreur lors de la création manuelle.');
      const data = await res.json();
      toast({ title: 'Signalement créé', description: `Incident enregistré sous la référence ${data.incident.reference}.` });
      setCreateOpen(false);
      setCreateForm({
        identify: 'yes',
        declarantType: 'particulier',
        fullName: '',
        organization: '',
        email: '',
        phone: '',
        types: ['reseau'],
        description: '',
        measures: '',
        target: '',
        reported: 'no',
      });
      fetchIncidents(true);
    } catch (err) {
      toast({ title: 'Erreur', description: String(err), variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const buildIncidentExportRows = useCallback(() => {
    return items.map((inc) => [
      inc.reference,
      getIncidentStatusMeta(inc.status).label,
      getIncidentSeverityMeta(inc.severity).label,
      inc.tlp || 'AMBER',
      inc.fullName || '—',
      inc.organization || '—',
      inc.declarantTypeName || '—',
      format(new Date(inc.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr }),
      inc.target || '—',
      inc.assignedTo?.name || 'Non assigné',
      (inc.typeLabels || []).join(', ') || '—',
    ])
  }, [items])

  const exportHeaders = [
    'Référence',
    'Statut',
    'Gravité',
    'TLP',
    'Déclarant',
    'Organisation',
    'Type',
    'Signalé le',
    'Cible',
    'Analyste',
    'Catégories',
  ]

  const buildPilotageInsights = (): PdfInsights => {
    const color = (hex: string): [number, number, number] => {
      const n = hex.replace('#', '')
      return [
        Number.parseInt(n.slice(0, 2), 16) / 255,
        Number.parseInt(n.slice(2, 4), 16) / 255,
        Number.parseInt(n.slice(4, 6), 16) / 255,
      ]
    }
    return {
      eyebrow: 'Pilotage CSIRT',
      title: 'Indicateurs des signalements',
      donutTitle: 'Pipeline des incidents',
      donutCaption: 'Répartition par statut',
      centerValue: String(stats.total),
      centerLabel: 'Actifs',
      slices: [
        { label: 'Nouveaux', value: stats.nouveaux, rgb: color('#ef4444') },
        { label: 'Investigation', value: stats.investigation, rgb: color('#3b82f6') },
        { label: 'En cours', value: stats.enCours, rgb: color('#f59e0b') },
        { label: 'Résolus', value: stats.resolus, rgb: color('#10b981') },
        ...(stats.rejetes > 0
          ? [{ label: 'Rejetés', value: stats.rejetes, rgb: color('#94a3b8') }]
          : []),
      ],
      barTitle: 'Évaluation des menaces',
      barCaption: 'Distribution par gravité',
      barBadge: `${stats.critiques} Critique(s) P1`,
      bars: severityBarData.map((item) => ({
        label: item.level,
        value: item.count,
        rgb: color(item.color),
      })),
    }
  }

  const handleExportPdf = () => {
    if (!items.length) {
      toast({ variant: 'destructive', title: 'Rien à exporter', description: 'Aucun signalement dans la vue actuelle.' })
      return
    }
    const opened = openTablePdfInTab({
      filename: `incidents-csirt-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`,
      title: 'CSIRT-ARPT — Signalements & Incidents',
      subtitle: format(new Date(), "dd/MM/yyyy 'à' HH:mm", { locale: fr }),
      headers: exportHeaders,
      rows: buildIncidentExportRows(),
      insights: buildPilotageInsights(),
    })
    if (!opened) {
      toast({
        variant: 'destructive',
        title: 'Aperçu bloqué',
        description: 'Autorisez les pop-ups pour visualiser le PDF dans un nouvel onglet.',
      })
      return
    }
    toast({ title: 'PDF ouvert dans un nouvel onglet', description: 'Utilisez le téléchargement du navigateur si besoin.' })
  }

  const handleExportExcel = async () => {
    if (!items.length) {
      toast({ variant: 'destructive', title: 'Rien à exporter', description: 'Aucun signalement dans la vue actuelle.' })
      return
    }
    setExporting(true)
    try {
      const ExcelJS = (await import('@/lib/exceljs')).default
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'CSIRT-ARPT'
      workbook.created = new Date()
      const insights = buildPilotageInsights()
      const pilotagePng = renderPilotagePng(insights)
      const pilotage = workbook.addWorksheet('Pilotage CSIRT')
      pilotage.getCell('A1').value = 'Indicateurs des signalements'
      pilotage.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF174F2C' } }
      pilotage.getRow(1).height = 22
      if (pilotagePng) {
        const imageId = workbook.addImage({ base64: pilotagePng, extension: 'png' })
        pilotage.addImage(imageId, {
          tl: { col: 0, row: 1 },
          ext: { width: 920, height: 250 },
        })
      }
      const sheet = workbook.addWorksheet('Incidents', {
        views: [{ state: 'frozen', ySplit: 1 }],
      })
      sheet.columns = exportHeaders.map((header, index) => ({
        header,
        key: `c${index}`,
        width: index === 0 || index === 10 ? 22 : 16,
      }))
      const headerRow = sheet.getRow(1)
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F6B42' },
      }
      headerRow.alignment = { vertical: 'middle' }
      buildIncidentExportRows().forEach((row) => {
        sheet.addRow(Object.fromEntries(row.map((value, index) => [`c${index}`, value])))
      })
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `incidents-csirt-${format(new Date(), 'yyyyMMdd-HHmm')}.xlsx`
      link.click()
      URL.revokeObjectURL(url)
      toast({ title: `${items.length} signalement(s) exporté(s) en Excel` })
    } catch (err) {
      console.error(err)
      toast({ variant: 'destructive', title: 'Export Excel impossible' })
    } finally {
      setExporting(false)
    }
  };

  return (
    <div className="incident-mgmt-root">
      <AdminPageHeader
        title="Centre de réponse & Gestion des incidents"
        description="Réception des signalements visiteurs, qualification technique, investigation SOC/CERT et coordination des réponses."
        badge={`${stats.total} signalements actifs`}
        actions={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="incident-header-btn incident-header-btn--outline"
              onClick={() => fetchIncidents(true)}
              disabled={refreshing || loading}
            >
              <RefreshCw className={cn('h-3 w-3', refreshing && 'animate-spin')} />
              <span>Actualiser</span>
            </button>
            <div className="incident-export-menu" ref={exportMenuRef}>
              <button
                type="button"
                id="incident-export-trigger"
                className="incident-header-btn incident-header-btn--primary"
                aria-haspopup="menu"
                aria-expanded={exportMenuOpen}
                aria-controls="incident-export-menu"
                disabled={exporting || loading || items.length === 0}
                onClick={() => setExportMenuOpen((open) => !open)}
              >
                {exporting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Download className="h-3 w-3" />
                )}
                <span>Exporter la liste</span>
              </button>
              {exportMenuOpen ? (
                <div
                  id="incident-export-menu"
                  role="menu"
                  aria-labelledby="incident-export-trigger"
                  className="incident-export-menu__panel"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="incident-export-menu__item"
                    disabled={exporting || items.length === 0}
                    onClick={() => {
                      setExportMenuOpen(false);
                      void handleExportExcel();
                    }}
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                    Excel (.xlsx)
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="incident-export-menu__item"
                    disabled={exporting || items.length === 0}
                    onClick={() => {
                      setExportMenuOpen(false);
                      handleExportPdf();
                    }}
                  >
                    <FileDown className="h-3.5 w-3.5 text-red-600" />
                    PDF
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        }
      />

      {/* SECTION ANALYTIQUE CSIRT / GRAPHIQUES */}
      <section
        className={cn('incident-insights', showAnalytics && 'is-open')}
        aria-label="Indicateurs CSIRT"
      >
        <div className="incident-insights__bar">
          <div className="incident-insights__identity">
            <span className="incident-insights__mark" aria-hidden>
              <BarChart3 className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="incident-insights__eyebrow">Pilotage CSIRT</p>
              <h2 className="incident-insights__title">Indicateurs des signalements</h2>
            </div>
          </div>

          <label className="incident-insights__search">
            <Search className="incident-insights__search-icon" aria-hidden />
            <Input
              placeholder="Réf., cible, déclarant…"
              className="incident-insights__search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Rechercher un signalement"
            />
          </label>

          <button
            type="button"
            className="incident-insights__toggle"
            aria-expanded={showAnalytics}
            aria-controls="incident-insights-panel"
            onClick={() => setShowAnalytics((open) => !open)}
          >
            {showAnalytics ? 'Masquer' : 'Afficher'}
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>

        <div
          id="incident-insights-panel"
          className="incident-insights__panel"
          hidden={!showAnalytics}
        >
          <div className="incident-analytics-grid">
            <div className="incident-chart-card">
              <div className="incident-chart-header">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="incident-chart-icon bg-emerald-500/10 text-emerald-600">
                    <PieChartIcon aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-foreground truncate">
                      Pipeline des incidents
                    </h3>
                    <p className="text-[11px] text-muted-foreground truncate">
                      Répartition par statut
                    </p>
                  </div>
                </div>
                <span className="incident-chart-pill text-emerald-700 bg-emerald-500/10 border border-emerald-500/20">
                  {stats.total} total
                </span>
              </div>

              <div className="incident-chart-body">
                <div className="incident-chart-donut">
                  <ResponsiveContainer width={72} height={72}>
                    <PieChart>
                      <Pie
                        data={
                          statusPieData.length > 0
                            ? statusPieData
                            : [{ name: 'Aucun', value: 1, color: '#e2e8f0' }]
                        }
                        cx="50%"
                        cy="50%"
                        innerRadius={20}
                        outerRadius={32}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {(statusPieData.length > 0
                          ? statusPieData
                          : [{ name: 'Aucun', value: 1, color: '#e2e8f0' }]
                        ).map((entry, index) => (
                          <Cell key={`pie-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          background: 'hsl(var(--card))',
                          borderColor: 'hsl(var(--border))',
                          fontSize: '10px',
                          borderRadius: '6px',
                          padding: '3px 6px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="incident-chart-donut__value">
                    <strong>{stats.total}</strong>
                    <span>Actifs</span>
                  </div>
                </div>

                <div className="incident-chart-legend">
                  <div className="incident-chart-legend__item is-new">
                    <i aria-hidden />
                    <em>Nouveaux</em>
                    <strong>{stats.nouveaux}</strong>
                  </div>
                  <div className="incident-chart-legend__item is-invest">
                    <i aria-hidden />
                    <em>Investigation</em>
                    <strong>{stats.investigation}</strong>
                  </div>
                  <div className="incident-chart-legend__item is-progress">
                    <i aria-hidden />
                    <em>En cours</em>
                    <strong>{stats.enCours}</strong>
                  </div>
                  <div className="incident-chart-legend__item is-done">
                    <i aria-hidden />
                    <em>Résolus</em>
                    <strong>{stats.resolus}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="incident-chart-card">
              <div className="incident-chart-header">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="incident-chart-icon bg-rose-500/10 text-rose-600">
                    <BarChart3 aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-foreground truncate">
                      Évaluation des menaces
                    </h3>
                    <p className="text-[11px] text-muted-foreground truncate">
                      Distribution par gravité
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    'incident-chart-pill border',
                    stats.critiques > 0
                      ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
                      : 'bg-muted text-muted-foreground border-transparent'
                  )}
                >
                  {stats.critiques} Critique(s) P1
                </span>
              </div>

              <div className="incident-chart-body">
                <div className="incident-severity-list">
                  {severityBarData.map((item) => {
                    const maxCount = Math.max(...severityBarData.map((d) => d.count), 1);
                    const percent = Math.round((item.count / maxCount) * 100);

                    return (
                      <div key={item.level} className="incident-severity-row">
                        <span className="incident-severity-row__label">{item.level}</span>
                        <div className="incident-severity-row__track">
                          <div
                            className="incident-severity-row__bar"
                            style={{
                              width: `${item.count > 0 ? Math.max(percent, 8) : 0}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                        <span
                          className={cn(
                            'incident-severity-row__count',
                            item.count === 0 && 'is-empty'
                          )}
                        >
                          {item.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Toolbar & Filters */}
      <div className="incident-toolbar">
        <div className="incident-tabs" role="tablist" aria-label="Filtrer les signalements">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'ALL'}
            className={cn('incident-tab-btn', activeTab === 'ALL' && 'is-active')}
            onClick={() => setActiveTab('ALL')}
          >
            <Inbox className="h-3 w-3" aria-hidden />
            Tous
            <span className="incident-tab-badge">{stats.total}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'NOUVEAU'}
            className={cn('incident-tab-btn', activeTab === 'NOUVEAU' && 'is-active')}
            onClick={() => setActiveTab('NOUVEAU')}
          >
            <Sparkles className="h-3 w-3" aria-hidden />
            Nouveaux
            <span
              className={cn(
                'incident-tab-badge',
                stats.nouveaux > 0 && 'incident-tab-badge--alert'
              )}
            >
              {stats.nouveaux}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'INVESTIGATION'}
            className={cn('incident-tab-btn', activeTab === 'INVESTIGATION' && 'is-active')}
            onClick={() => setActiveTab('INVESTIGATION')}
          >
            <Activity className="h-3 w-3" aria-hidden />
            Investigation
            <span className="incident-tab-badge">{stats.investigation}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'RESOLU'}
            className={cn('incident-tab-btn', activeTab === 'RESOLU' && 'is-active')}
            onClick={() => setActiveTab('RESOLU')}
          >
            <CheckCircle2 className="h-3 w-3" aria-hidden />
            Résolus
            <span className="incident-tab-badge">{stats.resolus}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'TRASH'}
            className={cn(
              'incident-tab-btn',
              'incident-tab-btn--trash',
              activeTab === 'TRASH' && 'is-active'
            )}
            onClick={() => setActiveTab('TRASH')}
          >
            <Trash2 className="h-3 w-3" aria-hidden />
            Corbeille
            <span className="incident-tab-badge">{stats.archived}</span>
          </button>
        </div>

        <div className="incident-toolbar__filters">
          <div className="incident-toolbar__dates" role="group" aria-label="Intervalle de dates">
            <Label htmlFor="incident-date-from">Du</Label>
            <FrenchDateField
              id="incident-date-from"
              variant="compact"
              value={dateFrom}
              max={dateTo || undefined}
              placeholder="Début"
              className="incident-toolbar__date"
              popoverClassName="incident-date-popover"
              onChange={setDateFrom}
            />
            <Label htmlFor="incident-date-to">Au</Label>
            <FrenchDateField
              id="incident-date-to"
              variant="compact"
              value={dateTo}
              min={dateFrom || undefined}
              placeholder="Fin"
              className="incident-toolbar__date"
              popoverClassName="incident-date-popover"
              onChange={setDateTo}
            />
            {dateFrom || dateTo ? (
              <button
                type="button"
                className="incident-toolbar__dates-clear"
                aria-label="Effacer l’intervalle de dates"
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
              >
                <X aria-hidden />
              </button>
            ) : null}
          </div>

          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="incident-toolbar__select">
              <Flame className="incident-toolbar__select-icon" aria-hidden />
              <SelectValue placeholder="Gravité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toute gravité</SelectItem>
              <SelectItem value="CRITIQUE">Critique (P1)</SelectItem>
              <SelectItem value="ELEVE">Élevé (P2)</SelectItem>
              <SelectItem value="MOYEN">Moyen (P3)</SelectItem>
              <SelectItem value="FAIBLE">Faible (P4)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Incident List Table */}
      <div className="incident-table-wrap">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <p className="text-sm font-medium">Chargement des signalements d’incidents...</p>
          </div>
        ) : items.length === 0 ? (
          activeTab === 'archived' ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-1.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-0.5">
                <Trash2 className="h-5 w-5" />
              </div>
              <p className="text-sm font-bold text-foreground">La corbeille est vide</p>
              <p className="text-xs text-muted-foreground max-w-sm text-center">
                Aucun incident n’a été archivé. Les éléments en corbeille sont conservés pendant 3 mois avant suppression définitive automatique.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <div className="p-3 rounded-full bg-muted/60 text-muted-foreground">
                <ShieldCheck className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">Aucun signalement d’incident trouvé</p>
              <p className="text-xs text-muted-foreground max-w-sm text-center">
                {dateFrom || dateTo
                  ? 'Aucun signalement ne correspond à cet intervalle de dates.'
                  : 'Les signalements reçus via le formulaire du portail public ou créés manuellement apparaîtront ici.'}
              </p>
            </div>
          )
          ) : (
          <>
          {checkedInView.length > 0 ? (
            <div className="incident-bulk">
              <span>
                {checkedInView.length} sélectionné{checkedInView.length > 1 ? 's' : ''}
              </span>
              <button type="button" onClick={() => setCheckedIds([])}>
                Annuler
              </button>
              {activeTab === 'archived' ? (
                <button type="button" onClick={() => void runOnChecked('restore')}>
                  Restaurer
                </button>
              ) : (
                <button type="button" className="is-danger" onClick={() => void runOnChecked('archive')}>
                  Corbeille
                </button>
              )}
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="incident-table">
              <thead>
                <tr>
                  <th className="incident-check-col" scope="col">
                    <label className="incident-check">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        ref={(node) => {
                          if (node) node.indeterminate = someChecked
                        }}
                        onChange={toggleAllChecked}
                        aria-label="Sélectionner tous les signalements affichés"
                      />
                      <span />
                    </label>
                  </th>
                  <th className="incident-num-col" scope="col">
                    <span className="th-content">#</span>
                  </th>
                  <th>
                    <span className="th-content">
                      <Hash className="h-3 w-3" /> Référence
                    </span>
                  </th>
                  <th>
                    <span className="th-content">
                      <Clock className="h-3 w-3" /> Signalé le
                    </span>
                  </th>
                  <th>
                    <span className="th-content">
                      <User className="h-3 w-3" /> Déclarant
                    </span>
                  </th>
                  <th>
                    <span className="th-content">
                      <Flame className="h-3 w-3" /> Gravité
                    </span>
                  </th>
                  <th>
                    <span className="th-content">
                      <Lock className="h-3 w-3" /> TLP
                    </span>
                  </th>
                  <th>
                    <span className="th-content">
                      <Activity className="h-3 w-3" /> Statut CSIRT
                    </span>
                  </th>
                  <th>
                    <span className="th-content">
                      <UserCheck className="h-3 w-3" /> Analyste
                    </span>
                  </th>
                  <th className="text-right">
                    <span className="th-content justify-end">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((inc, index) => {
                  const sevMeta = getIncidentSeverityMeta(inc.severity);
                  const statusMeta = getIncidentStatusMeta(inc.status);
                  const isAnonymous = inc.identify === 'no';
                  const initials = isAnonymous
                    ? '?'
                    : inc.fullName
                        .split(' ')
                        .filter(Boolean)
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase() || 'V';

                  return (
                    <tr
                      key={inc.id}
                      onClick={() => {
                        setSelectedIncident(inc);
                        setDetailTab('info');
                        setInfoSectionOpen('declarant');
                      }}
                      className={cn(
                        checkedIds.includes(inc.id) && 'is-checked',
                        inc.severity === 'CRITIQUE' && inc.status === 'NOUVEAU' && 'bg-red-500/[0.04]'
                      )}
                    >
                      <td className="incident-check-col" onClick={(event) => event.stopPropagation()}>
                        <label className="incident-check">
                          <input
                            type="checkbox"
                            checked={checkedIds.includes(inc.id)}
                            onChange={() => toggleChecked(inc.id)}
                            aria-label={`Sélectionner ${inc.reference}`}
                          />
                          <span />
                        </label>
                      </td>
                      <td className="incident-num-col">{index + 1}</td>
                      {/* 1. Référence */}
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => handleCopy(inc.reference, e)}
                            className="incident-ref-tag group"
                            title="Cliquer pour copier la référence"
                          >
                            <span>{inc.reference}</span>
                            {copiedRef === inc.reference ? (
                              <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3 opacity-40 group-hover:opacity-100 transition-opacity" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* 2. Date & Heure */}
                      <td>
                        <div className="flex flex-col leading-tight">
                          <span className="font-semibold text-foreground whitespace-nowrap text-[0.68rem]">
                            {format(new Date(inc.createdAt), 'dd/MM/yyyy', { locale: fr })}
                          </span>
                          <span className="text-[0.58rem] font-mono text-muted-foreground whitespace-nowrap">
                            {format(new Date(inc.createdAt), 'HH:mm:ss')}
                          </span>
                        </div>
                      </td>

                      {/* 3. Déclarant */}
                      <td>
                        <div className="flex items-center gap-1.5 max-w-[190px]">
                          <div
                            className={cn(
                              'w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-[9px] border',
                              isAnonymous
                                ? 'bg-muted text-muted-foreground border-border'
                                : 'bg-primary/10 text-primary border-primary/20'
                            )}
                          >
                            {isAnonymous ? <UserX className="h-2.5 w-2.5" /> : initials}
                          </div>
                          <div className="flex flex-col min-w-0 leading-tight">
                            <span className="font-semibold text-foreground text-[0.68rem] truncate">
                              {isAnonymous ? (
                                <span className="text-muted-foreground italic">Anonyme</span>
                              ) : (
                                inc.fullName
                              )}
                            </span>
                            <span
                              className="text-[0.55rem] text-muted-foreground truncate"
                              title={inc.organization || inc.declarantTypeName}
                            >
                              {inc.organization || inc.declarantTypeName}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Gravité */}
                      <td>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border shadow-2xs whitespace-nowrap',
                            sevMeta.badgeClass
                          )}
                        >
                          <span
                            className={cn(
                              'w-1.5 h-1.5 rounded-full shrink-0',
                              inc.severity === 'CRITIQUE' && 'status-dot-pulse'
                            )}
                            style={{ backgroundColor: sevMeta.color }}
                          />
                          {sevMeta.label}
                        </span>
                      </td>

                      {/* 7. TLP */}
                      <td>
                        <span className={cn('incident-tlp-tag', `incident-tlp-${inc.tlp}`)}>
                          <Lock className="h-2.5 w-2.5" />
                          {inc.tlp}
                        </span>
                      </td>

                      {/* 8. Statut CSIRT */}
                      <td>
                        <span
                          className={cn(
                            'incident-status-pill shadow-2xs',
                            inc.status === 'NOUVEAU' && 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/25 font-bold',
                            inc.status === 'INVESTIGATION' && 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25',
                            inc.status === 'EN_COURS' && 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25',
                            inc.status === 'CONTENU' && 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/25',
                            inc.status === 'RESOLU' && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
                            inc.status === 'REJETE' && 'bg-muted text-muted-foreground border-border'
                          )}
                        >
                          <span
                            className={cn(
                              'w-1.5 h-1.5 rounded-full shrink-0',
                              inc.status === 'NOUVEAU' && 'bg-red-500 status-dot-pulse',
                              inc.status === 'INVESTIGATION' && 'bg-blue-500 status-dot-pulse',
                              inc.status === 'EN_COURS' && 'bg-amber-500',
                              inc.status === 'CONTENU' && 'bg-purple-500',
                              inc.status === 'RESOLU' && 'bg-emerald-500',
                              inc.status === 'REJETE' && 'bg-slate-400'
                            )}
                          />
                          {statusMeta.label}
                        </span>
                      </td>

                      {/* 9. Analyste assigné */}
                      <td>
                        {inc.assignedTo ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground whitespace-nowrap bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            <UserCheck className="h-3 w-3 text-emerald-600" />
                            {inc.assignedTo.name.split(' ')[0]}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/70 italic px-1.5 py-0.5 rounded border border-dashed border-border/80 whitespace-nowrap">
                            Non assigné
                          </span>
                        )}
                      </td>

                      {/* 10. Actions rapides */}
                      <td className="incident-actions-col" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="incident-more" aria-label={`Actions pour ${inc.reference}`}>
                            <MoreHorizontal aria-hidden />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52 text-xs">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedIncident(inc);
                                setDetailTab('info');
                                setInfoSectionOpen('declarant');
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" /> Détails
                            </DropdownMenuItem>
                            {inc.archived ? (
                              <>
                                <DropdownMenuItem onClick={() => handleRestore(inc)}>
                                  <RotateCcw className="h-3.5 w-3.5" /> Restaurer
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeletePermanent(inc)}
                                  variant="destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Supprimer définitivement
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleArchive(inc)}
                                variant="destructive"
                              >
                                <Archive className="h-3.5 w-3.5" /> Déplacer en corbeille
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pied de tableau / Synthèse de vue */}
            <div className="incident-table-footer">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">
                  {items.length} signalement{items.length > 1 ? 's' : ''} affiché{items.length > 1 ? 's' : ''}
                </span>
                <span>•</span>
                <span>Total base : {stats.total}</span>
                {activeTab !== 'ALL' && (
                  <>
                    <span>•</span>
                    <span className="text-primary font-medium">Filtre actif : {activeTab}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <Radio className="h-3 w-3 text-emerald-500 animate-pulse" />
                <span suppressHydrationWarning>Synchronisé à {format(lastSyncedAt, 'HH:mm:ss')}</span>
              </div>
            </div>
          </div>
          </>
        )}
      </div>

      {/* MODAL FICHE DÉTAILLÉE DE TRAITEMENT D'INCIDENT */}
      {selectedIncident && (
        <Dialog open={Boolean(selectedIncident)} onOpenChange={(open) => {
          if (!open) {
            setSelectedIncident(null);
            clearDecrypt();
          }
        }}>
          <DialogContent
            showCloseButton={false}
            className="incident-detail-modal max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 bg-card"
          >
            <DialogHeader className="sr-only">
              <DialogTitle>Fiche de traitement - {selectedIncident.reference}</DialogTitle>
              <DialogDescription>
                Détail du signalement, qualification technique, notes d’investigation et réponse au déclarant.
              </DialogDescription>
            </DialogHeader>

            <div className="incident-detail-chrome">
              <div className="incident-detail-chrome__top">
                <div className="incident-detail-chrome__meta">
                  <span className="incident-ref-tag incident-detail-ref">{selectedIncident.reference}</span>
                  <span
                    className={cn(
                      'incident-detail-chip',
                      getIncidentSeverityMeta(selectedIncident.severity).badgeClass
                    )}
                  >
                    <span
                      className="incident-detail-chip__dot"
                      style={{ backgroundColor: getIncidentSeverityMeta(selectedIncident.severity).color }}
                    />
                    {getIncidentSeverityMeta(selectedIncident.severity).label}
                  </span>
                  <span className={cn('incident-tlp-tag', `incident-tlp-${selectedIncident.tlp || 'AMBER'}`)}>
                    TLP:{selectedIncident.tlp || 'AMBER'}
                  </span>
                  <span className="incident-detail-chrome__when">
                    Reçu le {format(new Date(selectedIncident.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                  </span>
                </div>
                <div className="incident-detail-chrome__actions">
                  <Button
                    variant="outline"
                    size="sm"
                    className="incident-detail-print-btn"
                    onClick={handlePrint}
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Imprimer</span>
                  </Button>
                  <DialogClose asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="incident-detail-close-btn"
                      aria-label="Fermer"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </DialogClose>
                </div>
              </div>

              {(() => {
                const pipelineStatus = toSelectableIncidentStatus(selectedIncident.status);
                const currentStepIndex = WORKFLOW_STEPS.findIndex((s) => s.status === pipelineStatus);
                const isRejected = selectedIncident.status === 'REJETE';
                return (
                  <div
                    className={cn('incident-workflow-stepper', isRejected && 'is-rejected-case')}
                    role="list"
                    aria-label="Pipeline de traitement"
                  >
                    {WORKFLOW_STEPS.map((step, idx) => {
                      const isDone = !isRejected && currentStepIndex > idx && currentStepIndex !== -1;
                      const isCurrent = !isRejected && pipelineStatus === step.status;
                      return (
                        <button
                          key={step.status}
                          type="button"
                          role="listitem"
                          disabled={savingWorkflow}
                          onClick={() => handleQuickStatusTransition(step.status)}
                          className={cn(
                            'incident-step-item',
                            isDone && 'is-done',
                            isCurrent && 'is-current'
                          )}
                          title={`Passer à : ${step.label} — ${step.sub}`}
                        >
                          <span className="incident-step-num" aria-hidden>
                            {isDone ? <CheckCircle2 className="h-3 w-3" /> : step.stepNumber}
                          </span>
                          <span className="incident-step-copy">
                            <span className="incident-step-title">{step.label.replace(/^\d+\.\s*/, '')}</span>
                            <span className="incident-step-sub">{step.sub}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              <nav className="incident-detail-tabs" aria-label="Sections de la fiche">
                {(
                  [
                    { id: 'info' as const, label: 'Signalement', icon: FileText },
                    { id: 'workflow' as const, label: 'Qualification', icon: ShieldAlert },
                    {
                      id: 'notes' as const,
                      label: `Notes (${selectedIncident.notes.filter((note) => note.isInternal).length})`,
                      icon: MessageSquare,
                    },
                    ...(sensitiveOpen && selectedIncident.email
                      ? [
                          {
                            id: 'reply' as const,
                            label: `Échange (${listExchangeMessages(selectedIncident).length})`,
                            icon: Mail,
                          },
                        ]
                      : []),
                    { id: 'history' as const, label: 'Historique', icon: Activity },
                  ] satisfies Array<{
                    id: typeof detailTab
                    label: string
                    icon: typeof FileText
                  }>
                ).map((tab) => {
                  const Icon = tab.icon
                  const locked = tab.id !== 'info' && !sensitiveOpen
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      className={cn(
                        'incident-detail-tab',
                        detailTab === tab.id && 'is-active',
                        locked && 'is-locked'
                      )}
                      disabled={locked}
                      title={locked ? 'Déchiffrez le signalement pour ouvrir cet onglet' : undefined}
                      onClick={() => {
                        if (locked) return
                        setDetailTab(tab.id)
                      }}
                      aria-current={detailTab === tab.id ? 'page' : undefined}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>

            <div className="incident-detail-body">
              {/* TAB 1: INFORMATIONS DU SIGNALEMENT */}
              {detailTab === 'info' && (
                <div className="incident-detail-panel incident-detail-panel--signalement">
                  <div className="incident-signal-summary">
                    <div className="incident-signal-summary__identity">
                      <span className="incident-signal-summary__mark" aria-hidden>
                        <FileText className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <p className="incident-signal-summary__eyebrow">Synthèse du signalement</p>
                        <p className="incident-signal-summary__title">
                          {sensitiveOpen
                            ? `${
                                selectedIncident.identify === 'yes'
                                  ? selectedIncident.fullName || 'Déclarant identifié'
                                  : 'Signalement anonyme'
                              }${
                                selectedIncident.organization
                                  ? ` · ${selectedIncident.organization}`
                                  : ''
                              }`
                            : 'Contenu chiffré'}
                        </p>
                      </div>
                    </div>
                    <div className="incident-signal-summary__chips">
                      {sensitiveOpen ? (
                        <>
                          {selectedIncident.typeLabels.slice(0, 2).map((lbl) => (
                            <span key={lbl} className="incident-signal-summary__chip">
                              {lbl}
                            </span>
                          ))}
                          {selectedIncident.typeLabels.length > 2 ? (
                            <span className="incident-signal-summary__chip is-muted">
                              +{selectedIncident.typeLabels.length - 2}
                            </span>
                          ) : null}
                          {selectedIncident.attachments?.length ? (
                            <span className="incident-signal-summary__chip is-file">
                              <Paperclip className="h-3 w-3" aria-hidden />
                              {selectedIncident.attachments.length} PJ
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span className="incident-sealed">Chiffré</span>
                      )}
                    </div>
                  </div>

                  <div className="incident-decrypt">
                    {!decryptOpen && !sensitiveOpen ? (
                      <button
                        type="button"
                        className="incident-decrypt__toggle"
                        onClick={() => setDecryptOpen(true)}
                      >
                        <KeyRound className="h-3.5 w-3.5" aria-hidden />
                        Déchiffrer le signalement
                      </button>
                    ) : (
                      <form
                        className="incident-decrypt__form"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void revealSignalement();
                        }}
                      >
                        <div className="incident-decrypt__head">
                          <KeyRound className="h-3.5 w-3.5" aria-hidden />
                          <strong>Déchiffrer le signalement</strong>
                        </div>
                        {sensitiveOpen ? (
                          <p className="incident-decrypt__done">Contenu déchiffré. La clé privée a été effacée de cet écran.</p>
                        ) : (
                          <>
                            <label>
                              <span>Clé privée</span>
                              <textarea
                                value={privateKey}
                                spellCheck={false}
                                autoComplete="off"
                                rows={4}
                                placeholder="-----BEGIN PGP PRIVATE KEY BLOCK-----"
                                onChange={(event) => setPrivateKey(event.target.value)}
                              />
                            </label>
                            {needsPassphrase ? (
                              <label>
                                <span>Phrase secrète</span>
                                <input
                                  type="password"
                                  value={passphrase}
                                  autoComplete="off"
                                  onChange={(event) => setPassphrase(event.target.value)}
                                />
                              </label>
                            ) : null}
                            {decryptError ? <p className="incident-decrypt__error">{decryptError}</p> : null}
                            <div className="incident-decrypt__actions">
                              <button
                                type="submit"
                                className="incident-decrypt__go"
                                disabled={decrypting || !privateKey.trim()}
                              >
                                {decrypting ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Lock className="h-3.5 w-3.5" aria-hidden />}
                                Déchiffrer
                              </button>
                              <button type="button" className="incident-decrypt__cancel" onClick={clearDecrypt}>
                                Annuler
                              </button>
                            </div>
                          </>
                        )}
                      </form>
                    )}
                  </div>

                  <div className="incident-signal-stack" role="list">
                  {(
                    [
                      {
                        id: 'declarant' as const,
                        title: 'Identité du déclarant',
                        icon: User,
                        preview: sensitiveOpen
                          ? selectedIncident.identify === 'yes'
                            ? selectedIncident.fullName || 'Identifié'
                            : 'Anonyme'
                          : 'Chiffré',
                      },
                      {
                        id: 'params' as const,
                        title: 'Paramètres du signalement',
                        icon: AlertTriangle,
                        preview: sensitiveOpen
                          ? selectedIncident.target ||
                            plainSection(decryptedText, 'Cible') ||
                            selectedIncident.typeLabels[0] ||
                            'Paramètres'
                          : 'Chiffré',
                      },
                      {
                        id: 'description' as const,
                        title: 'Description',
                        icon: FileText,
                        preview: sensitiveOpen
                          ? (decryptedText || selectedIncident.description || 'Sans description').slice(0, 72)
                          : 'Chiffré',
                      },
                      {
                        id: 'measures' as const,
                        title: 'Mesures déjà prises',
                        icon: ShieldCheck,
                        preview: sensitiveOpen
                          ? (
                              selectedIncident.measures ||
                              plainSection(decryptedText, 'Mesures déjà prises') ||
                              'Aucune mesure renseignée'
                            ).slice(0, 72)
                          : 'Chiffré',
                      },
                      {
                        id: 'attachments' as const,
                        title: sensitiveOpen
                          ? `Pièces jointes (${selectedIncident.attachments?.length || 0})`
                          : 'Pièces jointes',
                        icon: Paperclip,
                        preview: sensitiveOpen
                          ? selectedIncident.attachments?.[0]?.name || 'Aucun fichier'
                          : 'Chiffré',
                      },
                    ] as const
                  ).map((section) => {
                    const Icon = section.icon
                    const isOpen = sensitiveOpen && infoSectionOpen === section.id
                    const panelId = `incident-signal-${section.id}`
                    return (
                      <section
                        key={section.id}
                        className={cn(
                          'incident-signal-accordion',
                          isOpen && 'is-open',
                          !sensitiveOpen && 'is-sealed'
                        )}
                        role="listitem"
                      >
                        <button
                          type="button"
                          className="incident-signal-accordion__trigger"
                          aria-expanded={isOpen}
                          aria-controls={panelId}
                          onClick={() => {
                            if (!sensitiveOpen) {
                              setDecryptOpen(true)
                              return
                            }
                            setInfoSectionOpen((current) =>
                              current === section.id ? null : section.id
                            )
                          }}
                        >
                          <span className="incident-signal-accordion__icon" aria-hidden>
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="incident-signal-accordion__copy">
                            <span className="incident-signal-accordion__title">{section.title}</span>
                            {!isOpen ? (
                              <span
                                className={cn(
                                  'incident-signal-accordion__preview',
                                  section.preview === 'Chiffré' && 'is-sealed'
                                )}
                              >
                                {section.preview}
                                {section.preview.length >= 72 ? '…' : ''}
                              </span>
                            ) : null}
                          </span>
                          <ChevronDown className="incident-signal-accordion__chevron" aria-hidden />
                        </button>

                        {isOpen ? (
                          <div id={panelId} className="incident-signal-accordion__body">
                            {section.id === 'declarant' ? (
                              sensitiveOpen ? (
                              <dl className="incident-detail-dl">
                                <div className="incident-detail-dl__row">
                                  <dt>Mode</dt>
                                  <dd>
                                    <span
                                      className={cn(
                                        'incident-detail-soft-pill',
                                        selectedIncident.identify === 'yes'
                                          ? 'is-identified'
                                          : 'is-anonymous'
                                      )}
                                    >
                                      {selectedIncident.identify === 'yes'
                                        ? 'Identité communiquée'
                                        : 'Signalement anonyme'}
                                    </span>
                                  </dd>
                                </div>
                                <div className="incident-detail-dl__row">
                                  <dt>Nom & Prénom</dt>
                                  <dd>{selectedIncident.fullName || '—'}</dd>
                                </div>
                                <div className="incident-detail-dl__row">
                                  <dt>Organisation</dt>
                                  <dd>{selectedIncident.organization || '—'}</dd>
                                </div>
                                <div className="incident-detail-dl__row">
                                  <dt>Type</dt>
                                  <dd>
                                    <code className="incident-detail-code">
                                      {selectedIncident.declarantTypeName}
                                    </code>
                                  </dd>
                                </div>
                                <div className="incident-detail-dl__row">
                                  <dt>E-mail</dt>
                                  <dd>
                                    {selectedIncident.email ? (
                                      <a
                                        href={`mailto:${selectedIncident.email}`}
                                        className="incident-detail-mail"
                                      >
                                        {selectedIncident.email}
                                      </a>
                                    ) : (
                                      '—'
                                    )}
                                  </dd>
                                </div>
                                <div className="incident-detail-dl__row">
                                  <dt>Téléphone</dt>
                                  <dd className="is-mono">{selectedIncident.phone || '—'}</dd>
                                </div>
                              </dl>
                              ) : (
                                <p className="incident-sealed">Chiffré</p>
                              )
                            ) : null}

                            {section.id === 'params' ? (
                              <>
                                <dl className="incident-detail-dl">
                                  <div className="incident-detail-dl__row">
                                    <dt>Date de soumission</dt>
                                    <dd>
                                      {format(
                                        new Date(selectedIncident.createdAt),
                                        'dd MMMM yyyy à HH:mm:ss',
                                        { locale: fr }
                                      )}
                                    </dd>
                                  </div>
                                  <div className="incident-detail-dl__row">
                                    <dt>Cible (URL / IP)</dt>
                                    <dd>
                                      {sensitiveOpen ? (
                                        <code className="incident-detail-code">
                                          {selectedIncident.target ||
                                            plainSection(decryptedText, 'Cible') ||
                                            'Non spécifiée'}
                                        </code>
                                      ) : (
                                        <span className="incident-sealed">Chiffré</span>
                                      )}
                                    </dd>
                                  </div>
                                </dl>
                                <div className="incident-detail-categories">
                                  <span className="incident-detail-categories__label">
                                    Catégories d’attaque
                                  </span>
                                  <div className="incident-detail-categories__list">
                                    {sensitiveOpen ? (
                                      selectedIncident.typeLabels.map((lbl) => (
                                        <span key={lbl} className="incident-attack-chip">
                                          {lbl}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="incident-sealed">Chiffré</span>
                                    )}
                                  </div>
                                </div>
                              </>
                            ) : null}

                            {section.id === 'description' ? (
                              sensitiveOpen ? (
                                <div className="incident-detail-prose is-revealed">
                                  {decryptedText || selectedIncident.description || '—'}
                                </div>
                              ) : (
                                <p className="incident-sealed">Chiffré</p>
                              )
                            ) : null}

                            {section.id === 'measures' ? (
                              sensitiveOpen ? (
                                <div className="incident-detail-prose is-muted">
                                  {selectedIncident.measures ||
                                    plainSection(decryptedText, 'Mesures déjà prises') ||
                                    'Aucune mesure renseignée.'}
                                </div>
                              ) : (
                                <p className="incident-sealed">Chiffré</p>
                              )
                            ) : null}

                            {section.id === 'attachments' ? (
                              sensitiveOpen ? (
                                selectedIncident.attachments?.length ? (
                                  <ul className="incident-detail-attachments">
                                    {selectedIncident.attachments.map((att) => {
                                      const href =
                                        att.url && att.url !== '#'
                                          ? att.url
                                          : `/api/admin/incidents/${selectedIncident.id}/attachments/${att.id}`
                                      return (
                                        <li key={att.id}>
                                          <a
                                            href={href}
                                            download={att.name}
                                            className="incident-detail-attachments__link"
                                            title={`Télécharger ${att.name}`}
                                          >
                                            <span className="incident-detail-attachments__name">
                                              {att.name}
                                            </span>
                                            <span className="incident-detail-attachments__meta">
                                              <span className="incident-detail-attachments__size">
                                                {att.size
                                                  ? `${(att.size / 1024).toFixed(1)} Ko`
                                                  : 'Fichier'}
                                              </span>
                                              <Download className="h-3 w-3" aria-hidden />
                                              <span className="sr-only">Télécharger</span>
                                            </span>
                                          </a>
                                        </li>
                                      )
                                    })}
                                  </ul>
                                ) : (
                                  <p className="incident-detail-prose is-muted">Aucune pièce jointe.</p>
                                )
                              ) : (
                                <p className="incident-sealed">Chiffré</p>
                              )
                            ) : null}
                          </div>
                        ) : null}
                      </section>
                    )
                  })}
                  </div>
                </div>
              )}

              {/* TAB 2: QUALIFICATION & WORKFLOW CSIRT */}
              {detailTab === 'workflow' && (
                <div className="incident-detail-panel">
                  <section className="incident-drawer-section incident-workflow-form">
                    <header className="incident-section-head">
                      <span className="incident-section-head__icon" aria-hidden>
                        <ShieldAlert className="h-3.5 w-3.5" />
                      </span>
                      <h4>Qualification & traitement</h4>
                      <span className="incident-workflow-status-hint">
                        {getIncidentStatusMeta(editStatus).desc}
                      </span>
                    </header>

                    <div className="incident-workflow-block">
                      <p className="incident-workflow-block__label">Classification</p>
                      <div className="incident-detail-form-grid-3">
                        <div className="incident-workflow-field">
                          <Label>Statut</Label>
                          <Select
                            value={editStatus}
                            onValueChange={(val) => setEditStatus(val as IncidentStatus)}
                          >
                            <SelectTrigger className="incident-workflow-control">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NOUVEAU">Nouveau (en attente)</SelectItem>
                              <SelectItem value="INVESTIGATION">Investigation technique</SelectItem>
                              <SelectItem value="RESOLU">Résolu / Clôturé</SelectItem>
                              <SelectItem value="REJETE">Rejeté (Faux positif)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="incident-workflow-field">
                          <Label>Gravité</Label>
                          <Select
                            value={editSeverity}
                            onValueChange={(val) => setEditSeverity(val as IncidentSeverity)}
                          >
                            <SelectTrigger className="incident-workflow-control">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CRITIQUE">Critique (P1)</SelectItem>
                              <SelectItem value="ELEVE">Élevé (P2)</SelectItem>
                              <SelectItem value="MOYEN">Moyen (P3)</SelectItem>
                              <SelectItem value="FAIBLE">Faible (P4)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="incident-workflow-field">
                          <Label>TLP</Label>
                          <Select
                            value={editTlp}
                            onValueChange={(val) => setEditTlp(val as IncidentTlp)}
                          >
                            <SelectTrigger className="incident-workflow-control">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CLEAR">CLEAR — Public</SelectItem>
                              <SelectItem value="GREEN">GREEN — Communauté</SelectItem>
                              <SelectItem value="AMBER">AMBER — Restreint</SelectItem>
                              <SelectItem value="RED">RED — CSIRT seul</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="incident-workflow-block">
                      <p className="incident-workflow-block__label">Assignation</p>
                      <div className="incident-detail-form-grid-2">
                        <div className="incident-workflow-field">
                          <Label>Analystes (e-mail)</Label>
                          <AnalystEmailMultiSelect
                            options={analystOptions}
                            selectedEmails={selectedAssigneeEmails}
                            loading={loadingAnalysts}
                            onChange={applyAssigneeSelection}
                          />
                        </div>
                        <div className="incident-workflow-field">
                          <Label>Responsable affiché</Label>
                          <Input
                            className="incident-workflow-control is-readonly"
                            placeholder="Rempli automatiquement"
                            value={editAssignedName}
                            readOnly
                            aria-readonly="true"
                          />
                          <p className="incident-workflow-help">
                            Multi-sélection — les noms sont déduits des e-mails.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="incident-workflow-block">
                      <p className="incident-workflow-block__label">Remédiation & clôture</p>
                      <div className="incident-workflow-field">
                        <Label>Synthèse technique</Label>
                        <Textarea
                          className="incident-workflow-textarea"
                          placeholder="Actions menées, IOCs partagés, conclusions…"
                          value={editResolution}
                          onChange={(e) => setEditResolution(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="incident-workflow-footer">
                      <Button
                        onClick={handleSaveWorkflow}
                        disabled={savingWorkflow}
                        size="sm"
                        className="incident-workflow-save"
                      >
                        {savingWorkflow ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enregistrement…
                          </>
                        ) : (
                          'Enregistrer'
                        )}
                      </Button>
                    </div>
                  </section>
                </div>
              )}

              {/* TAB 3: NOTES D'INVESTIGATION */}
              {detailTab === 'notes' && (
                <div className="incident-detail-panel">
                  <section className="incident-drawer-section incident-notes-form">
                    <header className="incident-section-head">
                      <span className="incident-section-head__icon" aria-hidden>
                        <MessageSquare className="h-3.5 w-3.5" />
                      </span>
                      <h4>Nouvelle note</h4>
                      <span className="incident-workflow-status-hint">Journal d’investigation</span>
                    </header>

                    <div className="incident-workflow-field">
                      <Textarea
                        className="incident-notes-composer"
                        placeholder="Ex. : analyse pcap, IP source confirmée, blacklist FAI…"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                      />
                    </div>

                    <div className="incident-workflow-footer">
                      <Button
                        size="sm"
                        disabled={addingNote || !newNote.trim()}
                        onClick={handleAddNote}
                        className="incident-workflow-save"
                      >
                        {addingNote ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enregistrement…
                          </>
                        ) : (
                          'Consigner'
                        )}
                      </Button>
                    </div>
                  </section>

                  <section className="incident-drawer-section incident-notes-history">
                    <header className="incident-section-head">
                      <h4>
                        Historique ({selectedIncident.notes.filter((note) => note.isInternal).length})
                      </h4>
                      <span className="incident-workflow-status-hint">Réservé à l’équipe, invisible du correspondant</span>
                    </header>
                    {selectedIncident.notes.filter((note) => note.isInternal).length === 0 ? (
                      <p className="incident-notes-empty">
                        Aucune note interne. Les messages du correspondant sont dans l’onglet Échange.
                      </p>
                    ) : (
                      <div className="incident-notes-list">
                        {selectedIncident.notes
                          .filter((note) => note.isInternal)
                          .map((note) => (
                          <article key={note.id} className="incident-note-card">
                            <div className="incident-note-card__meta">
                              <span className="incident-note-card__author">{note.authorName}</span>
                              <time dateTime={note.createdAt}>
                                {format(new Date(note.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                              </time>
                            </div>
                            <p>{note.content}</p>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}

              {/* TAB 4: RÉPONDRE AU DÉCLARANT */}
              {detailTab === 'reply' && (
                <div className="incident-detail-panel">
                  <div className="incident-reply-banner">
                    <p>
                      Échange avec <strong>{selectedIncident.email}</strong>
                      {selectedIncident.assignedTo?.name
                        ? ` · assigné à ${selectedIncident.assignedTo.name}`
                        : ' · pas encore assigné'}
                      . Visible par l’administrateur et par le spécialiste assigné. Le correspondant voit la réponse dans son espace.
                    </p>
                  </div>

                  <section className="incident-drawer-section incident-exchange">
                    {listExchangeMessages(selectedIncident).length === 0 ? (
                      <p className="incident-notes-empty">Aucun message du correspondant pour le moment.</p>
                    ) : (
                      <ol className="incident-exchange__list">
                        {listExchangeMessages(selectedIncident).map((message) => (
                          <li
                            key={message.id}
                            className={
                              message.from === 'correspondent'
                                ? 'incident-exchange__bubble is-correspondent'
                                : 'incident-exchange__bubble is-staff'
                            }
                          >
                            <span>
                              {message.authorName}
                              <time dateTime={message.createdAt}>
                                {format(new Date(message.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                              </time>
                            </span>
                            <p>{message.content}</p>
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>

                  <section className="incident-drawer-section incident-reply-form">
                    <header className="incident-section-head">
                      <span className="incident-section-head__icon" aria-hidden>
                        <Send className="h-3.5 w-3.5" />
                      </span>
                      <h4>Répondre au correspondant</h4>
                    </header>

                    <div className="incident-workflow-field">
                      <Label htmlFor="incident-exchange-reply">Message</Label>
                      <Textarea
                        id="incident-exchange-reply"
                        className="incident-reply-textarea"
                        placeholder="Réponse visible par le correspondant…"
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                      />
                    </div>

                    <div className="incident-workflow-footer">
                      <Button
                        size="sm"
                        onClick={handleSendReply}
                        disabled={sendingReply || replyMessage.trim().length < 2}
                        className="incident-workflow-save"
                      >
                        {sendingReply ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Envoi…
                          </>
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5" /> Répondre
                          </>
                        )}
                      </Button>
                    </div>
                  </section>
                </div>
              )}

              {/* TAB 5: JOURNAL D'ACTIVITÉ */}
              {detailTab === 'history' && (
                <div className="incident-detail-panel">
                  <section className="incident-drawer-section incident-history-panel">
                    <header className="incident-section-head">
                      <span className="incident-section-head__icon" aria-hidden>
                        <Activity className="h-3.5 w-3.5" />
                      </span>
                      <h4>Historique</h4>
                      <span className="incident-workflow-status-hint">
                        {selectedIncident.activityLog.length} événement
                        {selectedIncident.activityLog.length > 1 ? 's' : ''}
                      </span>
                    </header>
                    {selectedIncident.activityLog.length === 0 ? (
                      <p className="incident-notes-empty">Aucun événement enregistré.</p>
                    ) : (
                      <ol className="incident-activity-log">
                        {selectedIncident.activityLog.map((act) => (
                          <li key={act.id}>
                            <span className="incident-activity-log__action">{act.action}</span>
                            <span className="incident-activity-log__detail" title={act.details || undefined}>
                              {act.details || '—'}
                            </span>
                            <span className="incident-activity-log__meta">
                              <span className="incident-activity-log__actor" title={act.actorName}>
                                {act.actorName}
                              </span>
                              <time dateTime={act.createdAt}>
                                {format(new Date(act.createdAt), 'dd/MM HH:mm', { locale: fr })}
                              </time>
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL CRÉATION MANUELLE D'INCIDENT */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent
          showCloseButton
          className="incident-create-modal w-[96vw] max-w-none sm:max-w-3xl md:max-w-4xl lg:max-w-5xl max-h-[86vh] overflow-hidden flex flex-col p-0 gap-0"
        >
          <DialogHeader className="incident-create-header">
            <DialogTitle>Consigner un signalement</DialogTitle>
            <DialogDescription>
              Saisie manuelle — téléphone, e-mail direct ou intervention terrain.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateManual} className="incident-create-form">
            <div className="incident-create-body">
              <section className="incident-create-block">
                <p className="incident-create-block__label">Identité du déclarant</p>
                <div className="incident-create-grid-2">
                  <div className="incident-workflow-field">
                    <Label>Type de déclarant</Label>
                    <Select
                      value={createForm.declarantType}
                      onValueChange={(val) => setCreateForm((f) => ({ ...f, declarantType: val }))}
                    >
                      <SelectTrigger className="incident-workflow-control">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CSIRT_DECLARANT_TYPES.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="incident-workflow-field">
                    <Label>Nom & Prénom</Label>
                    <Input
                      className="incident-workflow-control"
                      placeholder="Ex. : Thierno Diallo"
                      value={createForm.fullName}
                      onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))}
                    />
                  </div>

                  <div className="incident-workflow-field">
                    <Label>Organisation</Label>
                    <Input
                      className="incident-workflow-control"
                      placeholder="Ex. : Ministère du Budget"
                      value={createForm.organization}
                      onChange={(e) => setCreateForm((f) => ({ ...f, organization: e.target.value }))}
                    />
                  </div>

                  <div className="incident-workflow-field">
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      className="incident-workflow-control"
                      placeholder="contact@organisation.gn"
                      value={createForm.email}
                      onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>

                  <div className="incident-workflow-field">
                    <Label>Téléphone</Label>
                    <Input
                      className="incident-workflow-control"
                      placeholder="+224 6xx xx xx xx"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>

                  <div className="incident-workflow-field">
                    <Label>Cible / système</Label>
                    <Input
                      className="incident-workflow-control"
                      placeholder="IP, URL, hostname…"
                      value={createForm.target}
                      onChange={(e) => setCreateForm((f) => ({ ...f, target: e.target.value }))}
                    />
                  </div>
                </div>
              </section>

              <section className="incident-create-block">
                <p className="incident-create-block__label">
                  Catégories d’incident <span aria-hidden>*</span>
                </p>
                <div className="incident-create-cats">
                  {incidentTypeOptions.map((t) => {
                    const checked = createForm.types.includes(t.id)
                    return (
                      <label
                        key={t.id}
                        className={cn('incident-create-cat', checked && 'is-checked')}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setCreateForm((f) => ({
                              ...f,
                              types: checked
                                ? f.types.filter((id) => id !== t.id)
                                : [...f.types, t.id],
                            }))
                          }}
                        />
                        <span>{t.label}</span>
                      </label>
                    )
                  })}
                </div>
              </section>

              <section className="incident-create-block">
                <p className="incident-create-block__label">Description</p>
                <div className="incident-create-grid-2">
                  <div className="incident-workflow-field incident-create-desc-main">
                    <Label>
                      Faits constatés <span aria-hidden>*</span>
                    </Label>
                    <Textarea
                      required
                      className="incident-create-textarea"
                      placeholder="Symptômes, chronologie, impacts…"
                      value={createForm.description}
                      onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <div className="incident-workflow-field">
                    <Label>Mesures déjà appliquées</Label>
                    <Textarea
                      className="incident-create-textarea is-short"
                      placeholder="Ex. : serveur isolé, comptes révoqués…"
                      value={createForm.measures}
                      onChange={(e) => setCreateForm((f) => ({ ...f, measures: e.target.value }))}
                    />
                  </div>
                </div>
              </section>
            </div>

            <DialogFooter className="incident-create-footer">
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={creating}
                className="incident-workflow-save"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enregistrement…
                  </>
                ) : (
                  'Enregistrer'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <button
        type="button"
        className={cn('incident-lift', showLift && 'is-visible')}
        aria-label="Remonter en haut"
        tabIndex={showLift ? 0 : -1}
        onClick={liftToTop}
      >
        <ArrowUp aria-hidden />
        <span>Haut</span>
      </button>
    </div>
  );
}
