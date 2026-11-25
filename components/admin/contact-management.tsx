'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Archive,
  ArchiveRestore,
  CheckCheck,
  ExternalLink,
  Eye,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react'
import { AdminConfirmDialog } from '@/components/admin/admin-confirm-dialog'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { resolveContactMap } from '@/lib/csirt/contact-map'
import { cn } from '@/lib/utils'

type ContactSettings = {
  institutionOfficialEmail: string
  institutionPhone: string
  institutionAddress: string
  institutionMapUrl: string
  institutionHours: string
  institutionWebsite: string
}

type ContactMessage = {
  id: string
  fullName: string
  email: string
  organization: string
  subject: string
  body: string
  createdAt: string
  readAt?: string | null
  archivedAt?: string | null
}

type ListView = 'inbox' | 'trash'

type ConfirmState =
  | { type: 'archive'; ids: string[] }
  | { type: 'purge'; ids: string[] }
  | { type: 'empty-trash' }

function readStoredContact(body: string) {
  let phone = ''
  let role = ''
  let attachments = ''
  const rest: string[] = []
  let meta = true

  for (const raw of body.split('\n')) {
    const line = raw.trim()
    if (meta) {
      if (!line) continue
      const phoneMatch = /^Téléphone\s*:\s*(.+)$/i.exec(line)
      const roleMatch = /^Fonction\s*:\s*(.+)$/i.exec(line)
      const filesMatch = /^Pièces jointes indiquées\s*:\s*(.+)$/i.exec(line)
      if (phoneMatch) phone = phoneMatch[1].trim()
      else if (roleMatch) role = roleMatch[1].trim()
      else if (filesMatch) attachments = filesMatch[1].trim()
      else {
        meta = false
        rest.push(raw)
      }
      continue
    }
    rest.push(raw)
  }

  const message = rest.join('\n').trim()
  return { phone, role, attachments, message: message || body }
}

const EMPTY: ContactSettings = {
  institutionOfficialEmail: '',
  institutionPhone: '',
  institutionAddress: '',
  institutionMapUrl: '',
  institutionHours: '',
  institutionWebsite: '',
}

export function ContactManagement() {
  const [form, setForm] = useState<ContactSettings>(EMPTY)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState<ListView>('inbox')
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [trash, setTrash] = useState<ContactMessage[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [trashSelectedIds, setTrashSelectedIds] = useState<string[]>([])
  const [preview, setPreview] = useState<ContactMessage | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [busy, setBusy] = useState(false)

  const loadSettings = useCallback(async () => {
    setLoadingSettings(true)
    try {
      const res = await fetch('/api/admin/contact')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Chargement impossible',
          description: String(json.error ?? `Erreur ${res.status}`),
        })
        return
      }
      setForm({
        institutionOfficialEmail: json.institutionOfficialEmail ?? '',
        institutionPhone: json.institutionPhone ?? '',
        institutionAddress: json.institutionAddress ?? '',
        institutionMapUrl: json.institutionMapUrl ?? '',
        institutionHours: json.institutionHours ?? '',
        institutionWebsite: json.institutionWebsite ?? '',
      })
    } finally {
      setLoadingSettings(false)
    }
  }, [])

  const applyPayload = useCallback((json: {
    items?: ContactMessage[]
    trash?: ContactMessage[]
    unreadCount?: number
  }) => {
    setMessages(Array.isArray(json.items) ? json.items : [])
    setTrash(Array.isArray(json.trash) ? json.trash : [])
    setUnreadCount(Number(json.unreadCount) || 0)
    setSelectedIds([])
    setTrashSelectedIds([])
  }, [])

  const loadMessages = useCallback(async () => {
    setLoadingMessages(true)
    try {
      const res = await fetch('/api/admin/contact/messages')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Messages indisponibles',
          description: String(json.error ?? `Erreur ${res.status}`),
        })
        return
      }
      applyPayload(json)
    } finally {
      setLoadingMessages(false)
    }
  }, [applyPayload])

  useEffect(() => {
    void loadSettings()
    void loadMessages()
  }, [loadSettings, loadMessages])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/contact', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Enregistrement impossible',
          description: String(json.error ?? `Erreur ${res.status}`),
        })
        return
      }
      setForm({
        institutionOfficialEmail: json.institutionOfficialEmail ?? '',
        institutionPhone: json.institutionPhone ?? '',
        institutionAddress: json.institutionAddress ?? '',
        institutionMapUrl: json.institutionMapUrl ?? '',
        institutionHours: json.institutionHours ?? '',
        institutionWebsite: json.institutionWebsite ?? '',
      })
      toast({ title: 'Coordonnées enregistrées' })
    } finally {
      setSaving(false)
    }
  }

  const patchMessages = async (
    body: { action: 'read' | 'archive' | 'restore' | 'purge'; ids: string[] } | { action: 'empty-trash' }
  ) => {
    setBusy(true)
    try {
      const res = await fetch('/api/admin/contact/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'Action impossible',
          description: String(json.error ?? `Erreur ${res.status}`),
        })
        return false
      }
      applyPayload(json)
      return true
    } finally {
      setBusy(false)
    }
  }

  const openPreview = async (item: ContactMessage) => {
    setPreview(item)
    if (!item.readAt && !item.archivedAt) {
      await patchMessages({ action: 'read', ids: [item.id] })
      setPreview((prev) => (prev ? { ...prev, readAt: new Date().toISOString() } : prev))
    }
  }

  const restoreMessages = async (ids: string[]) => {
    if (!ids.length) return
    const ok = await patchMessages({ action: 'restore', ids })
    if (ok) {
      toast({
        title: ids.length > 1 ? `${ids.length} messages restaurés` : 'Message restauré',
      })
      if (preview && ids.includes(preview.id)) setPreview(null)
    }
  }

  const runConfirm = async () => {
    if (!confirm) return
    let ok = false
    if (confirm.type === 'archive') {
      ok = await patchMessages({ action: 'archive', ids: confirm.ids })
      if (ok) {
        toast({
          title: confirm.ids.length > 1 ? 'Messages déplacés dans la corbeille' : 'Message déplacé dans la corbeille',
        })
        if (preview && confirm.ids.includes(preview.id)) setPreview(null)
      }
    } else if (confirm.type === 'purge') {
      ok = await patchMessages({ action: 'purge', ids: confirm.ids })
      if (ok) {
        toast({
          title: confirm.ids.length > 1 ? 'Messages purgés' : 'Message purgé',
        })
        if (preview && confirm.ids.includes(preview.id)) setPreview(null)
      }
    } else {
      ok = await patchMessages({ action: 'empty-trash' })
      if (ok) toast({ title: 'Corbeille vidée' })
    }
    if (ok) setConfirm(null)
  }

  const allSelected = useMemo(
    () => messages.length > 0 && selectedIds.length === messages.length,
    [messages.length, selectedIds.length]
  )
  const allTrashSelected = useMemo(
    () => trash.length > 0 && trashSelectedIds.length === trash.length,
    [trash.length, trashSelectedIds.length]
  )

  const confirmTitle = (() => {
    if (!confirm) return ''
    if (confirm.type === 'archive') {
      return confirm.ids.length > 1
        ? `Mettre ${confirm.ids.length} messages à la corbeille ?`
        : 'Mettre ce message à la corbeille ?'
    }
    if (confirm.type === 'purge') {
      return confirm.ids.length > 1
        ? `Purger définitivement ${confirm.ids.length} messages ?`
        : 'Purger définitivement ce message ?'
    }
    return 'Vider la corbeille ?'
  })()

  const confirmMessage = (() => {
    if (!confirm) return ''
    if (confirm.type === 'archive') {
      return 'Le message sera déplacé dans la corbeille. Vous pourrez le restaurer ensuite.'
    }
    if (confirm.type === 'purge') {
      return 'Suppression définitive. Cette action est irréversible.'
    }
    return 'Tous les messages de la corbeille seront définitivement supprimés. Cette action est irréversible.'
  })()

  const confirmLabel = (() => {
    if (!confirm) return 'Confirmer'
    if (confirm.type === 'archive') return 'Mettre à la corbeille'
    if (confirm.type === 'purge') return 'Purger définitivement'
    return 'Vider la corbeille'
  })()

  const previewStored = preview ? readStoredContact(preview.body) : null

  return (
    <div className="admin-contact space-y-2.5">
      <AdminPageHeader
        variant="flat"
        title="Contact"
        description="Messages reçus via le formulaire public et coordonnées institutionnelles."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="admin-appt-header-btn"
              onClick={() => {
                void loadMessages()
                void loadSettings()
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Actualiser
            </button>
            <Link href="/contacts" target="_blank" className="admin-appt-header-btn">
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              Voir la page publique
            </Link>
          </div>
        }
      />

      <div className="admin-contact-layout">
        <div className="admin-contact-main">
          <div className="admin-contact-view-tabs" role="tablist" aria-label="Vues messages">
            <button
              type="button"
              role="tab"
              aria-selected={view === 'inbox'}
              className={cn(view === 'inbox' && 'is-active')}
              onClick={() => setView('inbox')}
            >
              Messages
              <span>{messages.length}</span>
              {unreadCount > 0 ? <em>{unreadCount}</em> : null}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'trash'}
              className={cn('admin-contact-tab--trash', view === 'trash' && 'is-active')}
              onClick={() => setView('trash')}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Corbeille
              <span>{trash.length}</span>
            </button>
          </div>

          {view === 'inbox' ? (
            <section className="admin-contact-panel" aria-labelledby="contact-messages-title">
              <div className="admin-contact-panel-head">
                <div>
                  <h2 id="contact-messages-title">Messages reçus</h2>
                  <p>Demandes envoyées depuis la page publique Contacts.</p>
                </div>
                <div className="admin-contact-toolbar">
                  <button
                    type="button"
                    className="admin-appt-header-btn"
                    disabled={busy || selectedIds.length === 0}
                    onClick={() => void patchMessages({ action: 'read', ids: selectedIds })}
                  >
                    <CheckCheck className="h-3.5 w-3.5" aria-hidden />
                    Marquer lu
                  </button>
                  <button
                    type="button"
                    className="admin-appt-header-btn admin-newsletter-danger-btn"
                    disabled={busy || selectedIds.length === 0}
                    onClick={() => setConfirm({ type: 'archive', ids: selectedIds })}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    Corbeille
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="admin-contact-table">
                  <thead>
                    <tr>
                      <th className="admin-contact-check-col">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          disabled={messages.length === 0}
                          onChange={(event) =>
                            setSelectedIds(
                              event.target.checked ? messages.map((item) => item.id) : []
                            )
                          }
                          aria-label="Sélectionner tous les messages"
                        />
                      </th>
                      <th className="admin-contact-num-col">#</th>
                      <th>Expéditeur</th>
                      <th>Objet</th>
                      <th>Reçu le</th>
                      <th className="admin-contact-actions-col">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingMessages ? (
                      <tr>
                        <td colSpan={6} className="admin-contact-table-empty">
                          Chargement des messages…
                        </td>
                      </tr>
                    ) : messages.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="admin-contact-table-empty">
                          Aucun message pour le moment.
                        </td>
                      </tr>
                    ) : (
                      messages.map((item, index) => {
                        const checked = selectedIds.includes(item.id)
                        const unread = !item.readAt
                        return (
                          <tr
                            key={item.id}
                            className={cn(unread && 'is-unread', checked && 'is-selected')}
                          >
                            <td className="admin-contact-check-col">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setSelectedIds((prev) =>
                                    prev.includes(item.id)
                                      ? prev.filter((id) => id !== item.id)
                                      : [...prev, item.id]
                                  )
                                }
                                aria-label={`Sélectionner ${item.subject}`}
                              />
                            </td>
                            <td className="admin-contact-num-col">{index + 1}</td>
                            <td>
                              <div className="admin-contact-sender">
                                <strong>{item.fullName}</strong>
                                <a href={`mailto:${item.email}`}>{item.email}</a>
                                {item.organization ? <span>{item.organization}</span> : null}
                              </div>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="admin-contact-subject"
                                onClick={() => void openPreview(item)}
                              >
                                {unread ? (
                                  <span className="admin-contact-dot" aria-hidden />
                                ) : null}
                                {item.subject}
                              </button>
                            </td>
                            <td className="admin-contact-date">
                              {format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm', {
                                locale: fr,
                              })}
                            </td>
                            <td className="admin-contact-actions-col">
                              <div className="admin-contact-row-actions">
                                <button
                                  type="button"
                                  className="admin-newsletter-action"
                                  onClick={() => void openPreview(item)}
                                  title="Ouvrir"
                                  aria-label={`Ouvrir ${item.subject}`}
                                >
                                  <Eye className="h-3.5 w-3.5" aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  className="admin-newsletter-delete"
                                  onClick={() => setConfirm({ type: 'archive', ids: [item.id] })}
                                  title="Mettre à la corbeille"
                                  aria-label={`Mettre ${item.subject} à la corbeille`}
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
            </section>
          ) : (
            <section className="admin-contact-panel" aria-labelledby="contact-trash-title">
              <div className="admin-contact-panel-head">
                <div>
                  <h2 id="contact-trash-title">Corbeille</h2>
                  <p>Messages archivés — restauration ou purge définitive.</p>
                </div>
                <div className="admin-contact-toolbar">
                  <button
                    type="button"
                    className="admin-appt-header-btn"
                    disabled={busy || trashSelectedIds.length === 0}
                    onClick={() => void restoreMessages(trashSelectedIds)}
                  >
                    <ArchiveRestore className="h-3.5 w-3.5" aria-hidden />
                    Restaurer
                  </button>
                  <button
                    type="button"
                    className="admin-appt-header-btn admin-newsletter-danger-btn"
                    disabled={busy || trashSelectedIds.length === 0}
                    onClick={() => setConfirm({ type: 'purge', ids: trashSelectedIds })}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    Purger
                  </button>
                  <button
                    type="button"
                    className="admin-appt-header-btn admin-newsletter-danger-btn"
                    disabled={busy || trash.length === 0}
                    onClick={() => setConfirm({ type: 'empty-trash' })}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    Vider
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="admin-contact-table">
                  <thead>
                    <tr>
                      <th className="admin-contact-check-col">
                        <input
                          type="checkbox"
                          checked={allTrashSelected}
                          disabled={trash.length === 0}
                          onChange={(event) =>
                            setTrashSelectedIds(
                              event.target.checked ? trash.map((item) => item.id) : []
                            )
                          }
                          aria-label="Sélectionner toute la corbeille"
                        />
                      </th>
                      <th className="admin-contact-num-col">#</th>
                      <th>Expéditeur</th>
                      <th>Objet</th>
                      <th>Archivé le</th>
                      <th className="admin-contact-actions-col">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingMessages ? (
                      <tr>
                        <td colSpan={6} className="admin-contact-table-empty">
                          Chargement de la corbeille…
                        </td>
                      </tr>
                    ) : trash.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="admin-contact-table-empty">
                          <div className="admin-contact-trash-empty">
                            <Trash2 className="h-5 w-5" aria-hidden />
                            <p>La corbeille est vide.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      trash.map((item, index) => {
                        const checked = trashSelectedIds.includes(item.id)
                        return (
                          <tr key={item.id} className={cn(checked && 'is-selected')}>
                            <td className="admin-contact-check-col">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setTrashSelectedIds((prev) =>
                                    prev.includes(item.id)
                                      ? prev.filter((id) => id !== item.id)
                                      : [...prev, item.id]
                                  )
                                }
                                aria-label={`Sélectionner ${item.subject}`}
                              />
                            </td>
                            <td className="admin-contact-num-col">{index + 1}</td>
                            <td>
                              <div className="admin-contact-sender">
                                <strong>{item.fullName}</strong>
                                <a href={`mailto:${item.email}`}>{item.email}</a>
                                {item.organization ? <span>{item.organization}</span> : null}
                              </div>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="admin-contact-subject"
                                onClick={() => void openPreview(item)}
                              >
                                {item.subject}
                              </button>
                            </td>
                            <td className="admin-contact-date">
                              {item.archivedAt
                                ? format(new Date(item.archivedAt), 'dd/MM/yyyy HH:mm', {
                                    locale: fr,
                                  })
                                : '—'}
                            </td>
                            <td className="admin-contact-actions-col">
                              <div className="admin-contact-row-actions">
                                <button
                                  type="button"
                                  className="admin-newsletter-action"
                                  onClick={() => void restoreMessages([item.id])}
                                  title="Restaurer"
                                  aria-label={`Restaurer ${item.subject}`}
                                >
                                  <ArchiveRestore className="h-3.5 w-3.5" aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  className="admin-newsletter-delete"
                                  onClick={() => setConfirm({ type: 'purge', ids: [item.id] })}
                                  title="Purger définitivement"
                                  aria-label={`Purger ${item.subject}`}
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
            </section>
          )}
        </div>

        <aside className="admin-contact-form-shell" aria-labelledby="contact-settings-title">
          <div className="admin-contact-settings-head">
            <h2 id="contact-settings-title">Coordonnées</h2>
            <p>
              E-mail, téléphone, adresse et carte s’affichent sur la page Contacts.
              La disponibilité s’affiche dans le pied de page.
            </p>
          </div>
          {loadingSettings ? (
            <p className="admin-contact-loading">Chargement des coordonnées…</p>
          ) : (
            <form
              className="admin-contact-form"
              onSubmit={(event) => {
                event.preventDefault()
                void save()
              }}
            >
              <label className="admin-contact-field">
                <span>E-mail officiel</span>
                <input
                  type="email"
                  value={form.institutionOfficialEmail}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, institutionOfficialEmail: event.target.value }))
                  }
                  placeholder="csirt@arpt.gov.gn"
                />
              </label>
              <label className="admin-contact-field">
                <span>Téléphone / standard</span>
                <input
                  type="text"
                  value={form.institutionPhone}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, institutionPhone: event.target.value }))
                  }
                  placeholder="Standard ARPT"
                />
              </label>
              <label className="admin-contact-field">
                <span>Adresse</span>
                <input
                  type="text"
                  value={form.institutionAddress}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, institutionAddress: event.target.value }))
                  }
                  placeholder="Kaloum, Conakry, République de Guinée"
                />
              </label>
              <label className="admin-contact-field">
                <span>Localisation (carte)</span>
                <input
                  type="text"
                  value={form.institutionMapUrl}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, institutionMapUrl: event.target.value }))
                  }
                  placeholder="Lien Google Maps, coordonnées ou lieu"
                />
                <small>Vide : la carte de la page Contacts suit l’adresse.</small>
              </label>
              <div className="admin-contact-map">
                <iframe
                  title="Aperçu de la carte"
                  src={resolveContactMap(form.institutionMapUrl, form.institutionAddress).embedSrc}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <label className="admin-contact-field">
                <span>Disponibilité</span>
                <input
                  type="text"
                  value={form.institutionHours}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, institutionHours: event.target.value }))
                  }
                  placeholder="Prise en charge 24h/24"
                />
              </label>
              <label className="admin-contact-field">
                <span>Site web</span>
                <input
                  type="url"
                  value={form.institutionWebsite}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, institutionWebsite: event.target.value }))
                  }
                  placeholder="https://csirt.arpt.gov.gn"
                />
              </label>
              <div className="admin-contact-actions">
                <button
                  type="submit"
                  className="admin-appt-header-btn admin-appt-header-btn--primary"
                  disabled={saving}
                >
                  <Save className="h-3.5 w-3.5" aria-hidden />
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          )}
        </aside>
      </div>

      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="admin-contact-preview-dialog gap-0 border-0 p-0 overflow-hidden">
          {preview ? (
            <>
              <header className="admin-contact-preview-head">
                <DialogHeader className="space-y-1 p-0 text-left">
                  <DialogTitle className="admin-contact-preview-title">
                    {preview.subject}
                  </DialogTitle>
                  <DialogDescription className="admin-contact-preview-when">
                    {format(new Date(preview.createdAt), "d MMM yyyy '·' HH:mm", {
                      locale: fr,
                    })}
                    {!preview.readAt && !preview.archivedAt ? ' · Non lu' : ''}
                    {preview.archivedAt
                      ? ` · Archivé le ${format(new Date(preview.archivedAt), 'd MMM yyyy', { locale: fr })}`
                      : ''}
                  </DialogDescription>
                </DialogHeader>
              </header>

              <dl className="admin-contact-preview-facts">
                <div>
                  <dt>Expéditeur</dt>
                  <dd>{preview.fullName}</dd>
                </div>
                <div>
                  <dt>E-mail</dt>
                  <dd>
                    <a href={`mailto:${preview.email}`}>{preview.email}</a>
                  </dd>
                </div>
                {previewStored?.phone ? (
                  <div>
                    <dt>Téléphone</dt>
                    <dd>{previewStored.phone}</dd>
                  </div>
                ) : null}
                {preview.organization ? (
                  <div>
                    <dt>Organisation</dt>
                    <dd>{preview.organization}</dd>
                  </div>
                ) : null}
                {previewStored?.role ? (
                  <div>
                    <dt>Fonction</dt>
                    <dd>{previewStored.role}</dd>
                  </div>
                ) : null}
                {previewStored?.attachments ? (
                  <div>
                    <dt>Fichiers</dt>
                    <dd>{previewStored.attachments}</dd>
                  </div>
                ) : null}
              </dl>

              <pre className="admin-contact-preview-body">{previewStored?.message}</pre>

              <footer className="admin-contact-preview-foot">
                <button
                  type="button"
                  className="admin-newsletter-sel-btn"
                  onClick={() => setPreview(null)}
                >
                  <span>Fermer</span>
                </button>
                {preview.archivedAt ? (
                  <>
                    <button
                      type="button"
                      className="admin-newsletter-sel-btn"
                      onClick={() => void restoreMessages([preview.id])}
                    >
                      <ArchiveRestore className="h-3.5 w-3.5" aria-hidden />
                      <span>Restaurer</span>
                    </button>
                    <button
                      type="button"
                      className="admin-newsletter-sel-btn admin-newsletter-sel-btn--danger"
                      onClick={() => setConfirm({ type: 'purge', ids: [preview.id] })}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      <span>Purger</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="admin-newsletter-sel-btn admin-newsletter-sel-btn--danger"
                    onClick={() => setConfirm({ type: 'archive', ids: [preview.id] })}
                  >
                    <Archive className="h-3.5 w-3.5" aria-hidden />
                    <span>Corbeille</span>
                  </button>
                )}
              </footer>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <AdminConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={confirmLabel}
        intent={confirm?.type === 'archive' ? 'archive' : 'destructive'}
        loading={busy}
        onConfirm={() => {
          void runConfirm()
        }}
      />
    </div>
  )
}
