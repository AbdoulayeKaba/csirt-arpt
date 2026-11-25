'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ArchiveRestore,
  CalendarClock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Loader2,
  Mail,
  MailPlus,
  Megaphone,
  Paperclip,
  RefreshCw,
  Repeat2,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
  XCircle,
  MousePointerClick,
} from 'lucide-react'
import { AdminConfirmDialog } from '@/components/admin/admin-confirm-dialog'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { NewsletterAnalytics } from '@/components/admin/newsletter-analytics'
import { NewsletterPopupSettings } from '@/components/admin/newsletter-popup-settings'
import { NewsletterRichEditor } from '@/components/admin/newsletter-rich-editor-lazy'
import { newsletterBodyPlainText } from '@/components/admin/newsletter-rich-editor'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FrenchDateField, FrenchTimeField } from '@/components/ui/french-datetime-fields'
import { toast } from '@/hooks/use-toast'
import { DG_SITE_ROUTES } from '@/lib/dg/site-routes'
import { downloadTablePdf } from '@/lib/export/download-table-pdf'
import { cn } from '@/lib/utils'
import '@/components/admin/admin-edit-dialog.css'

type Subscriber = {
  id: string
  email: string
  fullName: string
  reference: string
  subscribedAt: string
  archivedAt?: string | null
}

type Campaign = {
  id: string
  subject: string
  previewText: string
  body: string
  recipientMode: 'all' | 'selected'
  recipientIds?: string[]
  recipientCount: number
  sentCount: number
  failedCount: number
  ccEmails?: string[]
  attachments?: Array<{
    filename: string
    contentType: string
    size: number
    storedName: string
  }>
  status: 'scheduled' | 'sent' | 'cancelled' | 'failed'
  scheduledAt?: string | null
  sentAt: string
  sentByName?: string
}

type CampaignForm = {
  subject: string
  previewText: string
  body: string
  ccEmails: string
  scheduleAt: string
}

type TabKey = 'subscribers' | 'trash' | 'campaigns' | 'popup'

type ConfirmAction =
  | { type: 'archive'; ids: string[] }
  | { type: 'purge'; ids: string[] }
  | { type: 'empty-trash' }
  | { type: 'cancel-campaign'; campaignId: string }
  | { type: 'delete-campaign'; campaignId: string }

const EMPTY_CAMPAIGN: CampaignForm = {
  subject: '',
  previewText: '',
  body: '',
  ccEmails: '',
  scheduleAt: '',
}

const STATUS_LABELS: Record<Campaign['status'], string> = {
  scheduled: 'Planifiée',
  sent: 'Envoyée',
  cancelled: 'Annulée',
  failed: 'Échec',
}

async function copyText(value: string, success: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast({ title: success })
  } catch {
    toast({ variant: 'destructive', title: 'Copie impossible' })
  }
}

function parseCcEmails(raw: string): string[] {
  return raw
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function isFutureSchedule(value: string): boolean {
  if (!value.trim()) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date.getTime() > Date.now() + 30_000
}

function splitSchedule(value: string): { date: string; time: string } {
  const trimmed = value.trim()
  if (!trimmed) return { date: '', time: '' }
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/)
  if (match) return { date: match[1], time: match[2] }
  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return { date: '', time: '' }
  return {
    date: format(parsed, 'yyyy-MM-dd'),
    time: format(parsed, 'HH:mm'),
  }
}

function joinSchedule(date: string, time: string): string {
  if (!date.trim()) return ''
  return `${date.trim()}T${(time.trim() || '09:00').slice(0, 5)}`
}

const ATTACH_ACCEPT =
  '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.gif,.txt,.csv,.zip'
const ATTACH_MAX_FILES = 5
const ATTACH_MAX_BYTES = 8 * 1024 * 1024

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function campaignDraftFrom(campaign: Campaign): CampaignForm {
  return {
    subject: campaign.subject,
    previewText: '',
    body: campaign.body,
    ccEmails: (campaign.ccEmails ?? []).join(', '),
    scheduleAt: '',
  }
}

function campaignDateLabel(campaign: Campaign): string {
  if (campaign.status === 'scheduled' && campaign.scheduledAt) {
    return format(new Date(campaign.scheduledAt), 'dd/MM/yyyy HH:mm', { locale: fr })
  }
  return format(new Date(campaign.sentAt), 'dd/MM/yyyy HH:mm', { locale: fr })
}

export function NewsletterManagement() {
  const [items, setItems] = useState<Subscriber[]>([])
  const [trash, setTrash] = useState<Subscriber[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [trashTotal, setTrashTotal] = useState(0)
  const [scheduledTotal, setScheduledTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabKey>('subscribers')
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [trashSelectedIds, setTrashSelectedIds] = useState<string[]>([])
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [campaignOpen, setCampaignOpen] = useState(false)
  const [campaignForm, setCampaignForm] = useState<CampaignForm>(EMPTY_CAMPAIGN)
  const [campaignMode, setCampaignMode] = useState<'all' | 'selected'>('all')
  const [campaignFiles, setCampaignFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ fullName: '', email: '' })
  const [adding, setAdding] = useState(false)
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState<Campaign | null>(null)
  const [exportPreview, setExportPreview] = useState<Subscriber[] | null>(null)
  const [deduping, setDeduping] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/newsletter')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Chargement impossible',
          description: String(json.error ?? `Erreur ${res.status}`),
        })
        return
      }
      const nextItems = (json.items ?? []) as Subscriber[]
      const nextTrash = (json.trash ?? []) as Subscriber[]
      const nextCampaigns = (json.campaigns ?? []) as Campaign[]
      setItems(nextItems)
      setTrash(nextTrash)
      setCampaigns(nextCampaigns)
      setTrashTotal(Number(json.trashTotal ?? nextTrash.length) || 0)
      setScheduledTotal(
        Number(
          json.scheduledTotal ??
            nextCampaigns.filter((item) => item.status === 'scheduled').length
        ) || 0
      )
      setSelectedIds((prev) => prev.filter((id) => nextItems.some((item) => item.id === id)))
      setTrashSelectedIds((prev) =>
        prev.filter((id) => nextTrash.some((item) => item.id === id))
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (item) =>
        item.fullName.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.reference.toLowerCase().includes(q)
    )
  }, [items, query])

  const filteredTrash = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return trash
    return trash.filter(
      (item) =>
        item.fullName.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.reference.toLowerCase().includes(q)
    )
  }, [trash, query])

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(item.id)),
    [items, selectedIds]
  )

  const duplicateEmails = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of items) {
      const key = item.email.toLowerCase()
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return counts
  }, [items])

  const duplicateCount = useMemo(
    () => Array.from(duplicateEmails.values()).filter((n) => n > 1).length,
    [duplicateEmails]
  )

  const willSchedule = isFutureSchedule(campaignForm.scheduleAt)

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((item) => selectedIds.includes(item.id))
  const allTrashFilteredSelected =
    filteredTrash.length > 0 &&
    filteredTrash.every((item) => trashSelectedIds.includes(item.id))

  const openCampaign = (
    mode: 'all' | 'selected',
    draft?: CampaignForm,
    idsOverride?: string[]
  ) => {
    const effectiveSelected = idsOverride ?? selectedIds
    if (mode === 'selected' && effectiveSelected.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Aucune sélection',
        description: 'Sélectionnez au moins un abonné pour cibler la campagne.',
      })
      return
    }
    if (items.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Aucun abonné',
        description: 'Impossible d’envoyer une campagne sans destinataires.',
      })
      return
    }
    if (idsOverride) setSelectedIds(idsOverride)
    setCampaignMode(mode)
    setCampaignForm(draft ?? EMPTY_CAMPAIGN)
    setCampaignFiles([])
    setCampaignOpen(true)
  }

  const addCampaignFiles = (list: FileList | null) => {
    if (!list?.length) return
    const incoming = Array.from(list)
    setCampaignFiles((prev) => {
      const next = [...prev]
      for (const file of incoming) {
        if (next.length >= ATTACH_MAX_FILES) {
          toast({
            variant: 'destructive',
            title: 'Limite atteinte',
            description: `Maximum ${ATTACH_MAX_FILES} fichiers.`,
          })
          break
        }
        if (file.size > ATTACH_MAX_BYTES) {
          toast({
            variant: 'destructive',
            title: 'Fichier trop volumineux',
            description: `« ${file.name} » dépasse 8 Mo.`,
          })
          continue
        }
        if (next.some((item) => item.name === file.name && item.size === file.size)) continue
        next.push(file)
      }
      return next
    })
  }

  const toggleAllFiltered = () => {
    if (allFilteredSelected) {
      const filteredIds = new Set(filtered.map((item) => item.id))
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.has(id)))
      return
    }
    setSelectedIds((prev) => Array.from(new Set([...prev, ...filtered.map((item) => item.id)])))
  }

  const toggleAllTrashFiltered = () => {
    if (allTrashFilteredSelected) {
      const filteredIds = new Set(filteredTrash.map((item) => item.id))
      setTrashSelectedIds((prev) => prev.filter((id) => !filteredIds.has(id)))
      return
    }
    setTrashSelectedIds((prev) =>
      Array.from(new Set([...prev, ...filteredTrash.map((item) => item.id)]))
    )
  }

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleTrashOne = (id: string) => {
    setTrashSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const openExportPreview = (source: Subscriber[]) => {
    if (!source.length) {
      toast({ variant: 'destructive', title: 'Rien à exporter' })
      return
    }
    setExportPreview(source)
  }

  const downloadExportPreviewPdf = () => {
    if (!exportPreview?.length) return
    downloadTablePdf({
      filename: `abonnes-newsletter-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`,
      title: 'CSIRT-ARPT — Abonnés newsletter',
      subtitle: format(new Date(), "dd/MM/yyyy 'à' HH:mm", { locale: fr }),
      headers: ['Nom', 'E-mail', 'Référence', 'Date'],
      rows: exportPreview.map((item) => [
        item.fullName,
        item.email,
        item.reference,
        format(new Date(item.subscribedAt), 'dd/MM/yyyy HH:mm', { locale: fr }),
      ]),
    })
    toast({ title: `${exportPreview.length} abonné(s) exporté(s) en PDF` })
    setExportPreview(null)
  }

  const runConfirm = async () => {
    if (!confirm) return
    setConfirming(true)
    try {
      let res: Response
      if (confirm.type === 'archive') {
        res = await fetch('/api/admin/newsletter', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'archive', ids: confirm.ids }),
        })
      } else if (confirm.type === 'purge') {
        res = await fetch('/api/admin/newsletter', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'purge', ids: confirm.ids }),
        })
      } else if (confirm.type === 'empty-trash') {
        res = await fetch('/api/admin/newsletter', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'empty-trash' }),
        })
      } else if (confirm.type === 'cancel-campaign') {
        res = await fetch('/api/admin/newsletter', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'cancel-campaign',
            campaignId: confirm.campaignId,
          }),
        })
      } else {
        res = await fetch('/api/admin/newsletter', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete-campaign',
            campaignId: confirm.campaignId,
          }),
        })
      }

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Action impossible',
          description: String(json.message ?? json.error ?? `Erreur ${res.status}`),
        })
        return
      }

      if (confirm.type === 'archive') {
        toast({
          title:
            confirm.ids.length > 1
              ? `${json.removed ?? confirm.ids.length} abonnés désabonnés`
              : 'Abonné désabonné',
        })
        setSelectedIds([])
      } else if (confirm.type === 'purge') {
        toast({
          title:
            confirm.ids.length > 1
              ? `${json.purged ?? confirm.ids.length} abonnés purgés`
              : 'Abonné purgé définitivement',
        })
        setTrashSelectedIds([])
      } else if (confirm.type === 'empty-trash') {
        toast({
          title: json.purged
            ? `Corbeille vidée (${json.purged})`
            : 'Corbeille déjà vide',
        })
        setTrashSelectedIds([])
      } else if (confirm.type === 'cancel-campaign') {
        toast({ title: 'Campagne annulée' })
        setPreview(null)
      } else {
        toast({ title: 'Campagne retirée de l’historique' })
        setPreview(null)
      }

      setConfirm(null)
      await load()
    } finally {
      setConfirming(false)
    }
  }

  const restoreSubscribers = async (ids: string[]) => {
    if (!ids.length) return
    const res = await fetch('/api/admin/newsletter', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restore', ids }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast({
        variant: 'destructive',
        title: 'Restauration impossible',
        description: String(json.error ?? `Erreur ${res.status}`),
      })
      return
    }
    toast({
      title:
        ids.length > 1
          ? `${json.restored ?? ids.length} abonnés restaurés`
          : 'Abonné restauré',
    })
    setTrashSelectedIds((prev) => prev.filter((id) => !ids.includes(id)))
    await load()
  }

  const dedupe = async () => {
    setDeduping(true)
    try {
      const res = await fetch('/api/admin/newsletter', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dedupe' }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Déduplication impossible',
          description: String(json.error ?? `Erreur ${res.status}`),
        })
        return
      }
      toast({
        title: json.removed ? `${json.removed} doublon(s) retiré(s)` : 'Aucun doublon trouvé',
      })
      await load()
    } finally {
      setDeduping(false)
    }
  }

  const addSubscriber = async () => {
    const fullName = addForm.fullName.trim()
    const email = addForm.email.trim().toLowerCase()
    if (fullName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        variant: 'destructive',
        title: 'Formulaire incomplet',
        description: 'Indiquez un nom et une adresse e-mail valides.',
      })
      return
    }
    setAdding(true)
    try {
      const res = await fetch('/api/admin/newsletter', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add-subscriber', fullName, email }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Ajout impossible',
          description: String(json.message ?? json.error ?? `Erreur ${res.status}`),
        })
        return
      }
      toast({ title: 'Abonné ajouté' })
      setAddOpen(false)
      setAddForm({ fullName: '', email: '' })
      await load()
    } finally {
      setAdding(false)
    }
  }

  const downloadImportTemplate = async () => {
    const ExcelJS = (await import('@/lib/exceljs')).default
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Abonnés')
    sheet.columns = [
      { header: 'Nom complet', key: 'fullName', width: 28 },
      { header: 'Email', key: 'email', width: 36 },
    ]
    sheet.addRow({ fullName: 'Fanta Traoré', email: 'fanta.traore@exemple.gn' })
    sheet.addRow({ fullName: 'Abdoulaye Kaba', email: 'abdoulaye.kaba@exemple.gn' })
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'modele-abonnes-newsletter.xlsx'
    link.click()
    URL.revokeObjectURL(url)
  }

  const importSubscribersFromExcel = async (file: File | null) => {
    if (!file) return
    setImporting(true)
    try {
      const formData = new FormData()
      formData.set('file', file)
      const res = await fetch('/api/admin/newsletter/import', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Import impossible',
          description: String(json.message ?? json.error ?? `Erreur ${res.status}`),
        })
        return
      }
      const created = Number(json.created ?? 0)
      const restored = Number(json.restored ?? 0)
      const skipped = Number(json.skipped ?? 0)
      const invalid = Number(json.invalid ?? 0)
      toast({
        title: 'Import terminé',
        description: `${created} créé(s), ${restored} restauré(s), ${skipped} ignoré(s)${invalid ? `, ${invalid} invalide(s)` : ''}.`,
      })
      setAddOpen(false)
      setAddForm({ fullName: '', email: '' })
      await load()
    } finally {
      setImporting(false)
    }
  }

  const sendCampaign = async () => {
    const subject = campaignForm.subject.trim()
    const body = campaignForm.body.trim()
    const plainBody = newsletterBodyPlainText(body)
    if (subject.length < 3) {
      toast({
        variant: 'destructive',
        title: 'Objet trop court',
        description: 'Indiquez un objet d’au moins 3 caractères.',
      })
      return
    }
    if (plainBody.length < 10) {
      toast({
        variant: 'destructive',
        title: 'Message trop court',
        description: 'Rédigez un contenu d’au moins 10 caractères.',
      })
      return
    }

    const ccEmails = parseCcEmails(campaignForm.ccEmails)
    const scheduleAt = campaignForm.scheduleAt.trim() || undefined

    setSending(true)
    try {
      const formData = new FormData()
      formData.set('subject', subject)
      formData.set('previewText', '')
      formData.set('body', body)
      if (campaignMode === 'selected') {
        formData.set('recipientIds', JSON.stringify(selectedIds))
      }
      if (ccEmails.length) formData.set('ccEmails', ccEmails.join(', '))
      if (scheduleAt) formData.set('scheduleAt', scheduleAt)
      for (const file of campaignFiles) {
        formData.append('files', file)
      }

      const res = await fetch('/api/admin/newsletter', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: willSchedule ? 'Planification impossible' : 'Envoi impossible',
          description: String(json.message ?? json.error ?? `Erreur ${res.status}`),
        })
        return
      }

      if (json.scheduled || json.delivery === 'scheduled') {
        toast({
          title: 'Campagne planifiée',
          description: scheduleAt
            ? `Envoi prévu le ${format(new Date(scheduleAt), 'dd/MM/yyyy HH:mm', { locale: fr })}.`
            : undefined,
        })
      } else {
        const delivery = String(json.delivery ?? '')
        toast({
          title: 'Campagne envoyée',
          description:
            delivery === 'mock' || delivery === 'simulated'
              ? `${json.sent} destinataire(s) traités (mode simulation).`
              : `${json.sent} e-mail(s) envoyé(s)${json.failed ? `, ${json.failed} échec(s)` : ''}.`,
        })
      }
      setCampaignOpen(false)
      setCampaignForm(EMPTY_CAMPAIGN)
      setCampaignFiles([])
      setTab('campaigns')
      await load()
    } finally {
      setSending(false)
    }
  }

  const recipientLabel =
    campaignMode === 'selected'
      ? `${selectedIds.length} abonné${selectedIds.length > 1 ? 's' : ''} sélectionné${selectedIds.length > 1 ? 's' : ''}`
      : `${items.length} abonné${items.length > 1 ? 's' : ''} (tous)`

  const confirmTitle = (() => {
    if (!confirm) return ''
    if (confirm.type === 'archive') {
      return confirm.ids.length > 1
        ? `Désabonner ${confirm.ids.length} abonnés ?`
        : 'Désabonner cet abonné ?'
    }
    if (confirm.type === 'purge') {
      return confirm.ids.length > 1
        ? `Purger définitivement ${confirm.ids.length} abonnés ?`
        : 'Purger définitivement cet abonné ?'
    }
    if (confirm.type === 'empty-trash') return 'Vider la corbeille ?'
    if (confirm.type === 'cancel-campaign') return 'Annuler cette campagne planifiée ?'
    return 'Supprimer cette campagne ?'
  })()

  const confirmMessage = (() => {
    if (!confirm) return ''
    if (confirm.type === 'archive') {
      return 'L’abonné ne recevra plus les alertes. Vous pourrez le restaurer depuis la corbeille.'
    }
    if (confirm.type === 'purge') {
      return 'Les abonnés seront définitivement supprimés. Cette action est irréversible.'
    }
    if (confirm.type === 'empty-trash') {
      return 'Tous les éléments de la corbeille seront définitivement supprimés. Cette action est irréversible.'
    }
    if (confirm.type === 'cancel-campaign') {
      return 'La campagne planifiée ne sera pas envoyée. Vous pourrez la relancer manuellement plus tard.'
    }
    return 'La campagne sera retirée de l’historique. Les e-mails déjà envoyés ne seront pas annulés.'
  })()

  const confirmLabel = (() => {
    if (!confirm) return 'Confirmer'
    if (confirm.type === 'archive') return 'Désabonner'
    if (confirm.type === 'purge') return 'Purger définitivement'
    if (confirm.type === 'empty-trash') return 'Vider la corbeille'
    if (confirm.type === 'cancel-campaign') return 'Annuler la campagne'
    return 'Supprimer'
  })()

  const confirmIntent =
    confirm?.type === 'archive'
      ? 'archive'
      : confirm?.type === 'cancel-campaign'
        ? 'action'
        : 'destructive'

  return (
    <div className="admin-newsletter">
      <AdminPageHeader
        variant="flat"
        title="Newsletter"
        description="Gérez les abonnés et diffusez vos campagnes d’alertes officielles."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="admin-appt-header-btn" onClick={() => void load()}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Actualiser
            </button>
            <Link href={DG_SITE_ROUTES.footer} className="admin-appt-header-btn">
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              Bandeau public
            </Link>
            <button
              type="button"
              className="admin-appt-header-btn"
              onClick={() => setAddOpen(true)}
            >
              <UserPlus className="h-3.5 w-3.5" aria-hidden />
              Ajouter un abonné
            </button>
            <button
              type="button"
              className="admin-appt-header-btn admin-appt-header-btn--primary"
              onClick={() => openCampaign(selectedIds.length > 0 ? 'selected' : 'all')}
              disabled={items.length === 0}
            >
              <Megaphone className="h-3.5 w-3.5" aria-hidden />
              Nouvelle campagne
            </button>
          </div>
        }
      />

      <NewsletterAnalytics
        subscribers={items}
        campaigns={campaigns}
        scheduledTotal={scheduledTotal}
      />

      <div className="admin-newsletter-tabs" role="tablist" aria-label="Sections newsletter">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'subscribers'}
          className={cn(tab === 'subscribers' && 'is-active')}
          onClick={() => setTab('subscribers')}
        >
          Abonnés
          <span>{items.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'trash'}
          className={cn('admin-newsletter-tab--trash', tab === 'trash' && 'is-active')}
          onClick={() => setTab('trash')}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          Corbeille
          <span>{trashTotal}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'campaigns'}
          className={cn(tab === 'campaigns' && 'is-active')}
          onClick={() => setTab('campaigns')}
        >
          Campagnes
          <span>{campaigns.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'popup'}
          className={cn(tab === 'popup' && 'is-active')}
          onClick={() => setTab('popup')}
        >
          <MousePointerClick className="h-3.5 w-3.5" aria-hidden />
          Pop-up
        </button>
      </div>

      {tab === 'subscribers' ? (
        <section className="admin-newsletter-panel" aria-labelledby="nl-subscribers-title">
          <div className="admin-newsletter-panel-head">
            <div className="admin-newsletter-panel-title">
              <h2 id="nl-subscribers-title">Abonnés</h2>
              <p>Inscriptions aux alertes du portail public</p>
            </div>
            <div className="admin-newsletter-toolbar">
              <label className="admin-newsletter-search">
                <Search className="h-3.5 w-3.5" aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher…"
                  aria-label="Rechercher un abonné"
                />
              </label>

              <div className="admin-newsletter-tool-group" role="group" aria-label="Outils">
                <button
                  type="button"
                  className="admin-newsletter-icon-btn"
                  onClick={() =>
                    openExportPreview(selectedItems.length ? selectedItems : filtered)
                  }
                  disabled={filtered.length === 0}
                  title="Exporter PDF"
                  aria-label="Exporter PDF"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  className="admin-newsletter-icon-btn"
                  onClick={() =>
                    void copyText(
                      (selectedItems.length ? selectedItems : filtered)
                        .map((item) => item.email)
                        .join('; '),
                      'Adresses copiées'
                    )
                  }
                  disabled={filtered.length === 0}
                  title="Copier les e-mails"
                  aria-label="Copier les e-mails"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  className="admin-newsletter-icon-btn"
                  onClick={() => void dedupe()}
                  disabled={deduping || duplicateCount === 0}
                  title={
                    duplicateCount
                      ? `Dédupliquer (${duplicateCount})`
                      : 'Aucun doublon'
                  }
                  aria-label={
                    duplicateCount
                      ? `Dédupliquer ${duplicateCount} doublon${duplicateCount > 1 ? 's' : ''}`
                      : 'Dédupliquer'
                  }
                >
                  {deduping ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Repeat2 className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {duplicateCount > 0 ? (
                    <span className="admin-newsletter-icon-badge">{duplicateCount}</span>
                  ) : null}
                </button>
              </div>

              <button
                type="button"
                className="admin-appt-header-btn admin-appt-header-btn--primary"
                onClick={() => openCampaign('all')}
                disabled={items.length === 0}
              >
                <MailPlus className="h-3.5 w-3.5" aria-hidden />
                Envoyer à tous
              </button>
            </div>
          </div>

          {selectedIds.length > 0 ? (
            <div className="admin-newsletter-selection-bar" role="status">
              <span className="admin-newsletter-selection-count">
                {selectedIds.length} sélectionné{selectedIds.length > 1 ? 's' : ''}
              </span>
              <div className="admin-newsletter-selection-actions">
                <button
                  type="button"
                  className="admin-newsletter-sel-btn admin-newsletter-sel-btn--primary"
                  onClick={() => openCampaign('selected')}
                >
                  <Send className="h-3.5 w-3.5" aria-hidden />
                  <span>Envoyer</span>
                </button>
                <button
                  type="button"
                  className="admin-newsletter-sel-btn"
                  onClick={() =>
                    void copyText(
                      selectedItems.map((item) => item.email).join('; '),
                      'Adresses copiées'
                    )
                  }
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                  <span>Copier</span>
                </button>
                <button
                  type="button"
                  className="admin-newsletter-sel-btn admin-newsletter-sel-btn--danger"
                  onClick={() => setConfirm({ type: 'archive', ids: selectedIds })}
                >
                  <UserMinus className="h-3.5 w-3.5" aria-hidden />
                  <span>Désabonner</span>
                </button>
              </div>
            </div>
          ) : null}

          <div className="admin-table-shell admin-newsletter-table-shell">
            <div className="overflow-x-auto">
              <table className="admin-newsletter-table">
                <thead>
                  <tr>
                    <th className="admin-newsletter-check-col" scope="col">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={toggleAllFiltered}
                        aria-label="Sélectionner tous les abonnés visibles"
                        disabled={filtered.length === 0}
                      />
                    </th>
                    <th className="admin-newsletter-num-col" scope="col">
                      #
                    </th>
                    <th scope="col">Nom</th>
                    <th scope="col">E-mail</th>
                    <th scope="col">Référence</th>
                    <th scope="col">Inscription</th>
                    <th className="admin-newsletter-actions-col" scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="admin-newsletter-table-empty">
                        Chargement des abonnés…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="admin-newsletter-table-empty">
                        {items.length === 0
                          ? 'Aucun abonné enregistré pour le moment.'
                          : 'Aucun résultat pour cette recherche.'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((item, index) => {
                      const checked = selectedIds.includes(item.id)
                      const isDup = (duplicateEmails.get(item.email.toLowerCase()) ?? 0) > 1
                      const initials = item.fullName
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0]?.toUpperCase() ?? '')
                        .join('')
                      return (
                        <tr
                          key={item.id}
                          className={cn(checked && 'is-selected')}
                        >
                          <td className="admin-newsletter-check-col">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleOne(item.id)}
                              aria-label={`Sélectionner ${item.fullName}`}
                            />
                          </td>
                          <td className="admin-newsletter-num-col">{index + 1}</td>
                          <td>
                            <div className="admin-newsletter-identity">
                              <span className="admin-newsletter-avatar" aria-hidden>
                                {initials || '·'}
                              </span>
                              <div className="admin-newsletter-identity-text">
                                <strong>{item.fullName}</strong>
                                {isDup ? (
                                  <span className="admin-newsletter-dup">Doublon</span>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td>
                            <a href={`mailto:${item.email}`} className="admin-newsletter-mail">
                              {item.email}
                            </a>
                          </td>
                          <td>
                            <code className="admin-newsletter-ref">{item.reference}</code>
                          </td>
                          <td className="admin-newsletter-date">
                            {format(new Date(item.subscribedAt), 'dd/MM/yyyy HH:mm', {
                              locale: fr,
                            })}
                          </td>
                          <td className="admin-newsletter-actions-col">
                            <div className="admin-newsletter-row-actions">
                              <button
                                type="button"
                                className="admin-newsletter-action"
                                onClick={() => void copyText(item.email, 'E-mail copié')}
                                aria-label={`Copier ${item.email}`}
                                title="Copier l’e-mail"
                              >
                                <Copy className="h-3.5 w-3.5" aria-hidden />
                              </button>
                              <button
                                type="button"
                                className="admin-newsletter-action"
                                onClick={() => openCampaign('selected', undefined, [item.id])}
                                aria-label={`Envoyer une campagne à ${item.email}`}
                                title="Envoyer une campagne"
                              >
                                <Send className="h-3.5 w-3.5" aria-hidden />
                              </button>
                              <button
                                type="button"
                                className="admin-newsletter-delete"
                                onClick={() => setConfirm({ type: 'archive', ids: [item.id] })}
                                aria-label={`Désabonner ${item.email}`}
                                title="Désabonner"
                              >
                                <UserMinus className="h-3.5 w-3.5" aria-hidden />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {tab === 'trash' ? (
        <section className="admin-newsletter-panel" aria-labelledby="nl-trash-title">
          <div className="admin-newsletter-panel-head">
            <div className="admin-newsletter-panel-title">
              <h2 id="nl-trash-title">Corbeille</h2>
              <p>Abonnés archivés — restauration ou purge définitive</p>
            </div>
            <div className="admin-newsletter-toolbar">
              <label className="admin-newsletter-search">
                <Search className="h-3.5 w-3.5" aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher…"
                  aria-label="Rechercher dans la corbeille"
                />
              </label>
              <div className="admin-newsletter-tool-group" role="group" aria-label="Actions corbeille">
                <button
                  type="button"
                  className="admin-newsletter-icon-btn"
                  onClick={() => void restoreSubscribers(trashSelectedIds)}
                  disabled={trashSelectedIds.length === 0}
                  title="Restaurer la sélection"
                  aria-label={`Restaurer ${trashSelectedIds.length} sélectionné${trashSelectedIds.length > 1 ? 's' : ''}`}
                >
                  <ArchiveRestore className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  className="admin-newsletter-icon-btn admin-newsletter-icon-btn--danger"
                  onClick={() => setConfirm({ type: 'purge', ids: trashSelectedIds })}
                  disabled={trashSelectedIds.length === 0}
                  title="Purger la sélection"
                  aria-label="Purger la sélection"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
              <button
                type="button"
                className="admin-appt-header-btn admin-newsletter-danger-btn"
                onClick={() => setConfirm({ type: 'empty-trash' })}
                disabled={trash.length === 0}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Vider
              </button>
            </div>
          </div>

          {trashSelectedIds.length > 0 ? (
            <div className="admin-newsletter-selection-bar" role="status">
              <span className="admin-newsletter-selection-count">
                {trashSelectedIds.length} sélectionné{trashSelectedIds.length > 1 ? 's' : ''}
              </span>
              <div className="admin-newsletter-selection-actions">
                <button
                  type="button"
                  className="admin-newsletter-sel-btn"
                  onClick={() => void restoreSubscribers(trashSelectedIds)}
                >
                  <ArchiveRestore className="h-3.5 w-3.5" aria-hidden />
                  <span>Restaurer</span>
                </button>
                <button
                  type="button"
                  className="admin-newsletter-sel-btn admin-newsletter-sel-btn--danger"
                  onClick={() => setConfirm({ type: 'purge', ids: trashSelectedIds })}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  <span>Purger</span>
                </button>
              </div>
            </div>
          ) : null}

          <div className="admin-table-shell admin-newsletter-table-shell">
            <div className="overflow-x-auto">
              <table className="admin-newsletter-table">
                <thead>
                  <tr>
                    <th className="admin-newsletter-check-col" scope="col">
                      <input
                        type="checkbox"
                        checked={allTrashFilteredSelected}
                        onChange={toggleAllTrashFiltered}
                        aria-label="Sélectionner tous les éléments visibles de la corbeille"
                        disabled={filteredTrash.length === 0}
                      />
                    </th>
                    <th className="admin-newsletter-num-col" scope="col">
                      #
                    </th>
                    <th scope="col">Nom</th>
                    <th scope="col">E-mail</th>
                    <th scope="col">Référence</th>
                    <th scope="col">Archivé le</th>
                    <th className="admin-newsletter-actions-col" scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="admin-newsletter-table-empty">
                        Chargement de la corbeille…
                      </td>
                    </tr>
                  ) : filteredTrash.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="admin-newsletter-table-empty">
                        <div className="admin-newsletter-trash-empty">
                          <Trash2 className="h-5 w-5" aria-hidden />
                          <p>
                            {trash.length === 0
                              ? 'La corbeille est vide.'
                              : 'Aucun résultat pour cette recherche.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTrash.map((item, index) => {
                      const checked = trashSelectedIds.includes(item.id)
                      const initials = item.fullName
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0]?.toUpperCase() ?? '')
                        .join('')
                      return (
                        <tr key={item.id} className={cn(checked && 'is-selected')}>
                          <td className="admin-newsletter-check-col">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleTrashOne(item.id)}
                              aria-label={`Sélectionner ${item.fullName}`}
                            />
                          </td>
                          <td className="admin-newsletter-num-col">{index + 1}</td>
                          <td>
                            <div className="admin-newsletter-identity">
                              <span className="admin-newsletter-avatar admin-newsletter-avatar--muted" aria-hidden>
                                {initials || '·'}
                              </span>
                              <div className="admin-newsletter-identity-text">
                                <strong>{item.fullName}</strong>
                              </div>
                            </div>
                          </td>
                          <td>
                            <a href={`mailto:${item.email}`} className="admin-newsletter-mail">
                              {item.email}
                            </a>
                          </td>
                          <td>
                            <code className="admin-newsletter-ref">{item.reference}</code>
                          </td>
                          <td className="admin-newsletter-date">
                            {item.archivedAt
                              ? format(new Date(item.archivedAt), 'dd/MM/yyyy HH:mm', {
                                  locale: fr,
                                })
                              : '—'}
                          </td>
                          <td className="admin-newsletter-actions-col">
                            <div className="admin-newsletter-row-actions">
                              <button
                                type="button"
                                className="admin-newsletter-action"
                                onClick={() => void restoreSubscribers([item.id])}
                                aria-label={`Restaurer ${item.email}`}
                                title="Restaurer"
                              >
                                <ArchiveRestore className="h-3.5 w-3.5" aria-hidden />
                              </button>
                              <button
                                type="button"
                                className="admin-newsletter-delete"
                                onClick={() => setConfirm({ type: 'purge', ids: [item.id] })}
                                aria-label={`Purger définitivement ${item.email}`}
                                title="Purger définitivement"
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {tab === 'campaigns' ? (
        <section className="admin-newsletter-panel" aria-labelledby="nl-campaigns-title">
          <div className="admin-newsletter-panel-head">
            <div className="admin-newsletter-panel-title">
              <h2 id="nl-campaigns-title">Campagnes</h2>
              <p>
                {campaigns.length} campagne{campaigns.length > 1 ? 's' : ''} — historique et planifiées
              </p>
            </div>
            <div className="admin-newsletter-toolbar">
              <button
                type="button"
                className="admin-appt-header-btn admin-appt-header-btn--primary"
                onClick={() => openCampaign(selectedIds.length > 0 ? 'selected' : 'all')}
                disabled={items.length === 0}
              >
                <Megaphone className="h-3.5 w-3.5" aria-hidden />
                Nouvelle campagne
              </button>
            </div>
          </div>

          <div className="admin-table-shell admin-newsletter-table-shell">
            <div className="overflow-x-auto">
              <table className="admin-newsletter-table admin-newsletter-table--campaigns">
                <thead>
                  <tr>
                    <th className="admin-newsletter-num-col" scope="col">
                      #
                    </th>
                    <th scope="col">Campagne</th>
                    <th scope="col">Statut</th>
                    <th scope="col">Audience</th>
                    <th scope="col">Résultat</th>
                    <th scope="col">Date</th>
                    <th scope="col">Auteur</th>
                    <th className="admin-newsletter-actions-col" scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="admin-newsletter-table-empty">
                        Chargement de l’historique…
                      </td>
                    </tr>
                  ) : campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="admin-newsletter-table-empty">
                        <div className="admin-newsletter-trash-empty">
                          <Megaphone className="h-5 w-5" aria-hidden />
                          <p>Aucune campagne pour le moment.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    campaigns.map((campaign, index) => (
                      <tr key={campaign.id}>
                        <td className="admin-newsletter-num-col">{index + 1}</td>
                        <td>
                          <div className="admin-newsletter-campaign-subject">
                            <strong>{campaign.subject}</strong>
                            {campaign.previewText ? <span>{campaign.previewText}</span> : null}
                            {campaign.attachments?.length ? (
                              <span className="admin-newsletter-attach-meta">
                                <Paperclip className="h-3 w-3" aria-hidden />
                                {campaign.attachments.length} pièce
                                {campaign.attachments.length > 1 ? 's' : ''} jointe
                                {campaign.attachments.length > 1 ? 's' : ''}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <span
                            className={cn(
                              'admin-newsletter-status',
                              `admin-newsletter-status--${campaign.status}`
                            )}
                          >
                            {STATUS_LABELS[campaign.status]}
                          </span>
                        </td>
                        <td>
                          <div className="admin-newsletter-audience">
                            <strong>{campaign.recipientCount}</strong>
                            <span>
                              {campaign.recipientMode === 'all' ? 'Tous' : 'Sélection'}
                              {campaign.ccEmails?.length
                                ? ` · CC ${campaign.ccEmails.length}`
                                : ''}
                            </span>
                          </div>
                        </td>
                        <td>
                          {campaign.status === 'scheduled' ? (
                            <span className="admin-newsletter-result admin-newsletter-result--pending">
                              En attente
                            </span>
                          ) : (
                            <span className="admin-newsletter-result">
                              {campaign.sentCount} envoyé{campaign.sentCount > 1 ? 's' : ''}
                              {campaign.failedCount > 0
                                ? ` · ${campaign.failedCount} échec(s)`
                                : ''}
                            </span>
                          )}
                        </td>
                        <td className="admin-newsletter-date">{campaignDateLabel(campaign)}</td>
                        <td className="admin-newsletter-author">{campaign.sentByName || '—'}</td>
                        <td className="admin-newsletter-actions-col">
                          <div className="admin-newsletter-row-actions">
                            <button
                              type="button"
                              className="admin-newsletter-action"
                              onClick={() => setPreview(campaign)}
                              title="Aperçu"
                              aria-label={`Aperçu de ${campaign.subject}`}
                            >
                              <Eye className="h-3.5 w-3.5" aria-hidden />
                            </button>
                            <button
                              type="button"
                              className="admin-newsletter-action"
                              onClick={() => void copyText(campaign.subject, 'Objet copié')}
                              title="Copier l’objet"
                              aria-label="Copier l’objet"
                            >
                              <Copy className="h-3.5 w-3.5" aria-hidden />
                            </button>
                            <button
                              type="button"
                              className="admin-newsletter-action"
                              onClick={() =>
                                openCampaign(
                                  campaign.recipientMode === 'selected' &&
                                    (campaign.recipientIds?.length ?? 0) > 0
                                    ? 'selected'
                                    : 'all',
                                  campaignDraftFrom(campaign),
                                  campaign.recipientMode === 'selected'
                                    ? campaign.recipientIds
                                    : undefined
                                )
                              }
                              title="Relancer cette campagne"
                              aria-label="Relancer cette campagne"
                            >
                              <Repeat2 className="h-3.5 w-3.5" aria-hidden />
                            </button>
                            {campaign.status === 'scheduled' ? (
                              <button
                                type="button"
                                className="admin-newsletter-action"
                                onClick={() =>
                                  setConfirm({
                                    type: 'cancel-campaign',
                                    campaignId: campaign.id,
                                  })
                                }
                                title="Annuler la planification"
                                aria-label="Annuler la planification"
                              >
                                <XCircle className="h-3.5 w-3.5" aria-hidden />
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="admin-newsletter-delete"
                              onClick={() =>
                                setConfirm({
                                  type: 'delete-campaign',
                                  campaignId: campaign.id,
                                })
                              }
                              title="Supprimer de l’historique"
                              aria-label="Supprimer de l’historique"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {tab === 'popup' ? <NewsletterPopupSettings /> : null}

      <Dialog
        open={campaignOpen}
        onOpenChange={(open) => {
          if (!sending) {
            setCampaignOpen(open)
            if (!open) setCampaignFiles([])
          }
        }}
      >
        <DialogContent className="admin-newsletter-campaign-dialog admin-newsletter-campaign-dialog--pro gap-0 border-0 p-0 overflow-hidden">
          <header className="admin-newsletter-campaign-head">
            <div className="admin-newsletter-campaign-head-top">
              <span className="admin-newsletter-campaign-kicker">Diffusion CSIRT</span>
              <div className="admin-newsletter-campaign-meta">
                <Megaphone className="h-3.5 w-3.5" aria-hidden />
                <span>Destinataires : {recipientLabel}</span>
              </div>
            </div>
            <DialogHeader className="space-y-0 p-0 text-left">
              <DialogTitle className="admin-newsletter-campaign-title">
                Nouvelle campagne newsletter
              </DialogTitle>
              <DialogDescription className="admin-newsletter-campaign-desc">
                Composez l’alerte, ajoutez des copies et planifiez l’envoi si besoin.
              </DialogDescription>
            </DialogHeader>
          </header>

          <div className="admin-newsletter-campaign-body">
            <label className="admin-newsletter-field">
              <span>Objet</span>
              <input
                type="text"
                value={campaignForm.subject}
                onChange={(e) => setCampaignForm((prev) => ({ ...prev, subject: e.target.value }))}
                placeholder="Alerte CSIRT-ARPT — titre de la campagne"
                maxLength={180}
              />
            </label>

            <div className="admin-newsletter-field">
              <span>Message</span>
              <NewsletterRichEditor
                value={campaignForm.body}
                onChange={(html) => setCampaignForm((prev) => ({ ...prev, body: html }))}
                disabled={sending}
                placeholder="Rédigez l’alerte officielle avec mise en forme…"
              />
            </div>

            <div className="admin-newsletter-campaign-grid">
              <label className="admin-newsletter-field">
                <span>Copie (CC)</span>
                <input
                  type="text"
                  value={campaignForm.ccEmails}
                  onChange={(e) =>
                    setCampaignForm((prev) => ({ ...prev, ccEmails: e.target.value }))
                  }
                  placeholder="email1@exemple.gn, email2@exemple.gn"
                />
              </label>

              <div className="admin-newsletter-field">
                <span>Planifier l’envoi (optionnel)</span>
                <div className="admin-newsletter-schedule-row">
                  <FrenchDateField
                    value={splitSchedule(campaignForm.scheduleAt).date}
                    onChange={(date) => {
                      const { time } = splitSchedule(campaignForm.scheduleAt)
                      setCampaignForm((prev) => ({
                        ...prev,
                        scheduleAt: joinSchedule(date, time || '09:00'),
                      }))
                    }}
                    placeholder="jj/mm/aaaa"
                    disabled={sending}
                    variant="compact"
                    className="admin-newsletter-schedule-date"
                    popoverClassName="admin-newsletter-date-popover"
                  />
                  <FrenchTimeField
                    value={splitSchedule(campaignForm.scheduleAt).time}
                    onChange={(time) => {
                      const { date } = splitSchedule(campaignForm.scheduleAt)
                      if (!date) return
                      setCampaignForm((prev) => ({
                        ...prev,
                        scheduleAt: joinSchedule(date, time),
                      }))
                    }}
                    placeholder="hh:mm"
                    disabled={sending || !splitSchedule(campaignForm.scheduleAt).date}
                    stepMinutes={15}
                    variant="compact"
                    className="admin-newsletter-schedule-time"
                  />
                </div>
              </div>
            </div>

            <div className="admin-newsletter-field">
              <span>Pièces jointes (optionnel)</span>
              <div className="admin-newsletter-attach-row">
                <label className="admin-newsletter-attach-btn">
                  <Paperclip className="h-3.5 w-3.5" aria-hidden />
                  Joindre un fichier
                  <input
                    type="file"
                    multiple
                    accept={ATTACH_ACCEPT}
                    disabled={sending || campaignFiles.length >= ATTACH_MAX_FILES}
                    onChange={(e) => {
                      addCampaignFiles(e.target.files)
                      e.currentTarget.value = ''
                    }}
                  />
                </label>
                <span className="admin-newsletter-attach-hint">
                  PDF, Office, images, ZIP — max {ATTACH_MAX_FILES} fichiers / 8 Mo
                </span>
              </div>
              {campaignFiles.length ? (
                <ul className="admin-newsletter-attach-list">
                  {campaignFiles.map((file) => (
                    <li key={`${file.name}-${file.size}-${file.lastModified}`}>
                      <Paperclip className="h-3 w-3 shrink-0" aria-hidden />
                      <span className="truncate" title={file.name}>
                        {file.name}
                      </span>
                      <em>{formatFileSize(file.size)}</em>
                      <button
                        type="button"
                        aria-label={`Retirer ${file.name}`}
                        disabled={sending}
                        onClick={() =>
                          setCampaignFiles((prev) =>
                            prev.filter(
                              (item) =>
                                !(
                                  item.name === file.name &&
                                  item.size === file.size &&
                                  item.lastModified === file.lastModified
                                )
                            )
                          )
                        }
                      >
                        <X className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>

          <footer className="admin-newsletter-campaign-foot">
            <button
              type="button"
              className="admin-newsletter-sel-btn"
              onClick={() => setCampaignOpen(false)}
              disabled={sending}
            >
              <span>Annuler</span>
            </button>
            <button
              type="button"
              className="admin-newsletter-sel-btn admin-newsletter-sel-btn--primary"
              onClick={() => void sendCampaign()}
              disabled={sending}
            >
              {sending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  <span>{willSchedule ? 'Planification…' : 'Envoi…'}</span>
                </>
              ) : willSchedule ? (
                <>
                  <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                  <span>Planifier</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" aria-hidden />
                  <span>Envoyer</span>
                </>
              )}
            </button>
          </footer>
        </DialogContent>
      </Dialog>

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          if (!adding && !importing) setAddOpen(open)
        }}
      >
        <DialogContent className="admin-newsletter-campaign-dialog admin-newsletter-add-dialog gap-0 border-0 p-0 overflow-hidden">
          <header className="admin-newsletter-campaign-head">
            <div className="admin-newsletter-campaign-head-top">
              <span className="admin-newsletter-campaign-kicker">Liste d’alertes</span>
              <div className="admin-newsletter-campaign-meta">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                <span>Diffusion officielle CSIRT</span>
              </div>
            </div>
            <DialogHeader className="space-y-0 p-0 text-left">
              <DialogTitle className="admin-newsletter-campaign-title">
                Ajouter un abonné
              </DialogTitle>
              <DialogDescription className="admin-newsletter-campaign-desc">
                Inscription unitaire ou import Excel/CSV vers la liste des destinataires.
              </DialogDescription>
            </DialogHeader>
          </header>

          <div className="admin-newsletter-campaign-body admin-newsletter-add-body">
            <section className="admin-newsletter-add-section" aria-labelledby="nl-add-manual-title">
              <div className="admin-newsletter-add-section-head">
                <span className="admin-newsletter-add-section-icon" aria-hidden>
                  <UserPlus className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h3 id="nl-add-manual-title">Inscription manuelle</h3>
                  <p>Saisissez l’identité et l’adresse e-mail du destinataire.</p>
                </div>
              </div>

              <div className="admin-newsletter-campaign-grid">
                <label className="admin-newsletter-field">
                  <span>Nom complet</span>
                  <input
                    type="text"
                    value={addForm.fullName}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Prénom Nom"
                    autoComplete="name"
                    disabled={adding || importing}
                  />
                </label>
                <label className="admin-newsletter-field">
                  <span>E-mail</span>
                  <div className="admin-newsletter-input-with-icon">
                    <Mail className="admin-newsletter-input-icon" aria-hidden />
                    <input
                      type="email"
                      value={addForm.email}
                      onChange={(e) => setAddForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="prenom.nom@organisation.gn"
                      autoComplete="email"
                      disabled={adding || importing}
                    />
                  </div>
                </label>
              </div>
            </section>

            <div className="admin-newsletter-add-divider" role="separator">
              <span>ou</span>
            </div>

            <section className="admin-newsletter-add-import" aria-labelledby="nl-add-import-title">
              <div className="admin-newsletter-add-section-head">
                <span className="admin-newsletter-add-section-icon admin-newsletter-add-section-icon--sheet" aria-hidden>
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h3 id="nl-add-import-title">Import Excel / CSV</h3>
                  <p>
                    Colonnes attendues : <em>Nom complet</em> et <em>Email</em> · max 2000 lignes.
                  </p>
                </div>
              </div>

              <div className="admin-newsletter-add-import-actions">
                <button
                  type="button"
                  className="admin-newsletter-sel-btn"
                  onClick={() => void downloadImportTemplate()}
                  disabled={adding || importing}
                >
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  <span>Télécharger le modèle</span>
                </button>
                <label className={importing ? 'admin-newsletter-add-upload is-busy' : 'admin-newsletter-add-upload'}>
                  {importing ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Users className="h-4 w-4" aria-hidden />
                  )}
                  <span>{importing ? 'Import en cours…' : 'Importer un fichier'}</span>
                  <small>.xlsx · .xls · .csv</small>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                    disabled={adding || importing}
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null
                      e.currentTarget.value = ''
                      void importSubscribersFromExcel(file)
                    }}
                  />
                </label>
              </div>
            </section>
          </div>

          <footer className="admin-newsletter-campaign-foot admin-newsletter-add-foot">
            <p className="admin-newsletter-add-foot-hint">
              L’abonné recevra les prochaines campagnes d’alerte CSIRT-ARPT.
            </p>
            <div className="admin-newsletter-add-foot-actions">
              <button
                type="button"
                className="admin-newsletter-sel-btn"
                onClick={() => setAddOpen(false)}
                disabled={adding || importing}
              >
                Annuler
              </button>
              <button
                type="button"
                className="admin-newsletter-sel-btn admin-newsletter-sel-btn--primary"
                onClick={() => void addSubscriber()}
                disabled={adding || importing}
              >
                {adding ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    <span>Ajout…</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3.5 w-3.5" aria-hidden />
                    <span>Enregistrer l’abonné</span>
                  </>
                )}
              </button>
            </div>
          </footer>
        </DialogContent>
      </Dialog>

      <Dialog open={!!exportPreview} onOpenChange={(open) => !open && setExportPreview(null)}>
        <DialogContent className="admin-dialog admin-dialog-user-form admin-edit-dialog admin-newsletter-export-dialog gap-0 border-[var(--admin-border)] p-0 shadow-[0_24px_60px_-20px_rgba(15,60,40,0.35)]">
          <DialogHeader className="admin-dialog-header admin-create-user-header workspace-crud-dialog-header shrink-0 border-b border-border text-left">
            <DialogTitle>Aperçu — export PDF</DialogTitle>
            <DialogDescription>
              Vérifiez la liste avant téléchargement
              {exportPreview ? ` · ${exportPreview.length} abonné(s)` : ''}.
            </DialogDescription>
          </DialogHeader>
          {exportPreview ? (
            <div className="admin-dialog-body admin-newsletter-export-preview">
              <div className="admin-newsletter-export-sheet">
                <header className="admin-newsletter-export-sheet-head">
                  <p className="admin-newsletter-export-brand">CSIRT-ARPT</p>
                  <h3>Abonnés newsletter</h3>
                  <p>
                    {format(new Date(), "dd/MM/yyyy 'à' HH:mm", { locale: fr })} ·{' '}
                    {exportPreview.length} ligne
                    {exportPreview.length > 1 ? 's' : ''}
                  </p>
                </header>
                <div className="admin-newsletter-export-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Nom</th>
                        <th>E-mail</th>
                        <th>Référence</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exportPreview.map((item) => (
                        <tr key={item.id}>
                          <td>{item.fullName}</td>
                          <td>{item.email}</td>
                          <td>{item.reference}</td>
                          <td>
                            {format(new Date(item.subscribedAt), 'dd/MM/yyyy HH:mm', {
                              locale: fr,
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
          <footer className="admin-newsletter-campaign-foot">
            <button
              type="button"
              className="admin-newsletter-sel-btn"
              onClick={() => setExportPreview(null)}
            >
              Fermer
            </button>
            <button
              type="button"
              className="admin-newsletter-sel-btn admin-newsletter-sel-btn--primary"
              onClick={downloadExportPreviewPdf}
              disabled={!exportPreview?.length}
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              <span>Télécharger PDF</span>
            </button>
          </footer>
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="admin-newsletter-preview-dialog gap-0 border-0 p-0 overflow-hidden shadow-[0_28px_64px_-24px_rgba(6,40,28,0.55)]">
          {preview ? (
            <>
              <header className="admin-newsletter-preview-head">
                <div className="admin-newsletter-preview-head-top">
                  <span className="admin-newsletter-preview-kicker-label">Aperçu campagne</span>
                  <span
                    className={cn(
                      'admin-newsletter-status',
                      `admin-newsletter-status--${preview.status}`
                    )}
                  >
                    {STATUS_LABELS[preview.status]}
                  </span>
                </div>
                <DialogHeader className="space-y-0 text-left p-0">
                  <DialogTitle className="admin-newsletter-preview-title">
                    {preview.subject}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Aperçu de la campagne {preview.subject}
                  </DialogDescription>
                </DialogHeader>
                <ul className="admin-newsletter-preview-meta">
                  <li>
                    <strong>{preview.recipientCount}</strong>
                    destinataire{preview.recipientCount > 1 ? 's' : ''}
                    <em>
                      {preview.recipientMode === 'all' ? 'Tous' : 'Sélection'}
                    </em>
                  </li>
                  <li>{campaignDateLabel(preview)}</li>
                  {preview.sentByName ? <li>{preview.sentByName}</li> : null}
                </ul>
              </header>

              <div className="admin-newsletter-preview-sheet">
                <div className="admin-newsletter-preview-mailchrome">
                  <div>
                    <span>Objet</span>
                    <strong>{preview.subject}</strong>
                  </div>
                  {preview.ccEmails?.length ? (
                    <div>
                      <span>CC</span>
                      <strong>{preview.ccEmails.join(', ')}</strong>
                    </div>
                  ) : null}
                  {preview.attachments?.length ? (
                    <div>
                      <span>Pièces jointes</span>
                      <strong>
                        {preview.attachments.map((item) => item.filename).join(', ')}
                      </strong>
                    </div>
                  ) : null}
                </div>

                {preview.previewText ? (
                  <p className="admin-newsletter-preview-chapo">{preview.previewText}</p>
                ) : null}

                <div
                  className="admin-newsletter-preview-body admin-newsletter-preview-body--html"
                  dangerouslySetInnerHTML={{ __html: preview.body }}
                />
              </div>

              <footer className="admin-newsletter-preview-foot">
                <button
                  type="button"
                  className="admin-newsletter-sel-btn"
                  onClick={() => setPreview(null)}
                >
                  <span>Fermer</span>
                </button>
                <button
                  type="button"
                  className="admin-newsletter-sel-btn admin-newsletter-sel-btn--primary"
                  onClick={() => {
                    openCampaign(
                      preview.recipientMode === 'selected' &&
                        (preview.recipientIds?.length ?? 0) > 0
                        ? 'selected'
                        : 'all',
                      campaignDraftFrom(preview),
                      preview.recipientMode === 'selected' ? preview.recipientIds : undefined
                    )
                    setPreview(null)
                  }}
                >
                  <Repeat2 className="h-3.5 w-3.5" aria-hidden />
                  <span>Relancer</span>
                </button>
              </footer>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <AdminConfirmDialog
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={confirmLabel}
        intent={confirmIntent}
        onConfirm={() => void runConfirm()}
        loading={confirming}
      />
    </div>
  )
}
