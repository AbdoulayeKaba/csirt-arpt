'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Eye, Loader2, MessageSquare, Paperclip, Send } from 'lucide-react'
import { getIncidentSeverityMeta, getIncidentStatusMeta, type IncidentStatus } from '@/lib/types/incident'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Item = {
  id: string
  reference: string
  status: string
  createdAt: string
  typeLabels: string[]
  messageCount: number
}

type Detail = {
  id: string
  reference: string
  status: string
  createdAt: string
  updatedAt: string
  declarantTypeName: string
  fullName: string
  organization: string
  email: string
  phone: string
  typeLabels: string[]
  severity: string
  description: string
  measures: string
  target: string
  reported: 'yes' | 'no'
  resolutionSummary: string
  attachments: Array<{ id: string; name: string; size: number; mimeType: string }>
}

type ChatMessage = {
  id: string
  from: 'correspondent' | 'admin'
  author: string
  content: string
  createdAt: string
}

function formatWhen(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
}

export function CsirtSignalementHistory() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [threadLoading, setThreadLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [threadError, setThreadError] = useState('')
  const [detail, setDetail] = useState<Detail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')

  useEffect(() => {
    let cancelled = false
    void fetch('/api/signalement/historique', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setItems(Array.isArray(json.items) ? json.items : [])
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const openThread = async (id: string) => {
    if (openId === id) {
      setOpenId(null)
      return
    }
    setOpenId(id)
    setDraft('')
    setThreadError('')
    setMessages([])
    setThreadLoading(true)
    try {
      const res = await fetch(`/api/signalement/historique/${encodeURIComponent(id)}/messages`, {
        cache: 'no-store',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setThreadError('Impossible de charger les messages.')
        return
      }
      setMessages(Array.isArray(json.messages) ? json.messages : [])
    } catch {
      setThreadError('Impossible de charger les messages.')
    } finally {
      setThreadLoading(false)
    }
  }

  const openDetail = async (id: string) => {
    setDetailOpen(true)
    setDetail(null)
    setDetailError('')
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/signalement/historique/${encodeURIComponent(id)}`, { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.incident) {
        setDetailError('Impossible d’afficher ce signalement.')
        return
      }
      setDetail(json.incident as Detail)
    } catch {
      setDetailError('Impossible d’afficher ce signalement.')
    } finally {
      setDetailLoading(false)
    }
  }

  const sendMessage = async (event: FormEvent<HTMLFormElement>, id: string) => {
    event.preventDefault()
    const content = draft.trim()
    if (content.length < 2) {
      setThreadError('Écrivez au moins quelques mots.')
      return
    }
    setSending(true)
    setThreadError('')
    try {
      const res = await fetch(`/api/signalement/historique/${encodeURIComponent(id)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.message) {
        setThreadError('Envoi impossible. Réessayez.')
        return
      }
      setMessages((current) => [...current, json.message as ChatMessage])
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, messageCount: item.messageCount + 1 } : item))
      )
      setDraft('')
    } catch {
      setThreadError('Envoi impossible. Réessayez.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="sig-history" aria-labelledby="sig-history-title">
      <div className="sig-history__wrap">
        <header className="sig-history__head">
          <h2 id="sig-history-title">Vos signalements</h2>
          <p>Suivez l’avancement et écrivez à l’équipe CSIRT-ARPT si vous avez un complément.</p>
        </header>
        {loading ? (
          <p className="sig-history__empty">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Chargement de l’historique…
          </p>
        ) : items.length === 0 ? (
          <p className="sig-history__empty">Aucun signalement pour ce compte.</p>
        ) : (
          <ul>
            {items.map((item) => {
              const meta = getIncidentStatusMeta(item.status as IncidentStatus)
              const open = openId === item.id
              const typeLabel = item.typeLabels.filter(Boolean).join(', ') || 'Incident'
              return (
                <li key={item.id} className={open ? 'is-open' : undefined}>
                  <div className="sig-case">
                    <div className="sig-case__id">
                      <strong>{item.reference}</strong>
                      <span>{typeLabel}</span>
                    </div>
                    <time dateTime={item.createdAt}>{formatWhen(item.createdAt)}</time>
                    <em className={`sig-case__status is-${meta.tone}`}>{meta.label}</em>
                    <div className="sig-case__actions">
                      <button
                        type="button"
                        className="sig-case__icon"
                        aria-label={`Voir le détail de ${item.reference}`}
                        onClick={() => void openDetail(item.id)}
                      >
                        <Eye aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="sig-case__chat"
                        aria-expanded={open}
                        onClick={() => void openThread(item.id)}
                      >
                        <MessageSquare aria-hidden />
                        {item.messageCount > 0
                          ? `Messages (${item.messageCount})`
                          : 'Écrire à l’administrateur'}
                      </button>
                    </div>
                  </div>
                  {open ? (
                    <div className="sig-chat" aria-label={`Messages pour ${item.reference}`}>
                      {threadLoading ? (
                        <p className="sig-chat__empty">
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Chargement…
                        </p>
                      ) : messages.length === 0 ? (
                        <p className="sig-chat__empty">
                          Aucun échange pour le moment. Votre message sera lu par l’équipe CSIRT-ARPT.
                        </p>
                      ) : (
                        <ol>
                          {messages.map((message) => (
                            <li key={message.id} className={message.from === 'correspondent' ? 'is-self' : 'is-admin'}>
                              <span>
                                {message.author}
                                <time dateTime={message.createdAt}>{formatWhen(message.createdAt)}</time>
                              </span>
                              <p>{message.content}</p>
                            </li>
                          ))}
                        </ol>
                      )}
                      <form onSubmit={(event) => void sendMessage(event, item.id)}>
                        <label htmlFor={`sig-chat-${item.id}`}>Message à l’administrateur</label>
                        <textarea
                          id={`sig-chat-${item.id}`}
                          rows={3}
                          maxLength={2000}
                          value={draft}
                          placeholder="Précision, pièce manquante ou question sur ce signalement…"
                          onChange={(event) => setDraft(event.target.value)}
                        />
                        {threadError ? (
                          <p className="sig-chat__error" role="alert">
                            {threadError}
                          </p>
                        ) : null}
                        <button type="submit" disabled={sending || draft.trim().length < 2}>
                          {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send aria-hidden />}
                          Envoyer
                        </button>
                      </form>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sig-detail">
          <DialogHeader>
            <DialogTitle>{detail?.reference ?? 'Détail du signalement'}</DialogTitle>
            <DialogDescription>
              {detail
                ? `Déposé le ${formatWhen(detail.createdAt)}`
                : 'Contenu du signalement que vous avez transmis.'}
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <p className="sig-detail__state">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Chargement…
            </p>
          ) : detailError ? (
            <p className="sig-detail__state is-error" role="alert">
              {detailError}
            </p>
          ) : detail ? (
            <DetailBody detail={detail} />
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  )
}

function DetailBody({ detail }: { detail: Detail }) {
  const status = getIncidentStatusMeta(detail.status as IncidentStatus)
  const rows = [
    ['Déclarant', detail.fullName],
    ['Organisation', detail.organization],
    ['Type d’organisation', detail.declarantTypeName],
    ['E-mail', detail.email],
    ['Téléphone', detail.phone],
    ['Nature', detail.typeLabels.filter(Boolean).join(', ')],
    ['Gravité', getIncidentSeverityMeta(detail.severity).label],
    ['Cible', detail.target],
    ['Déjà signalé ailleurs', detail.reported === 'yes' ? 'Oui' : 'Non'],
    ['Dernière mise à jour', formatWhen(detail.updatedAt)],
  ].filter(([, value]) => String(value ?? '').trim())

  return (
    <div className="sig-detail__body">
      <p className={`sig-case__status is-${status.tone}`}>{status.label}</p>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className={label === 'Gravité' ? `is-sev is-${String(detail.severity).toLowerCase()}` : undefined}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <section>
        <h3>Description</h3>
        {detail.description.includes('-----BEGIN PGP MESSAGE-----') ? (
          <p>Ce signalement a été chiffré avec la clé publique du CSIRT-ARPT.</p>
        ) : (
          <p>{detail.description}</p>
        )}
      </section>
      {detail.measures.trim() ? (
        <section>
          <h3>Mesures déjà prises</h3>
          <p>{detail.measures}</p>
        </section>
      ) : null}
      {detail.resolutionSummary.trim() ? (
        <section>
          <h3>Synthèse de clôture</h3>
          <p>{detail.resolutionSummary}</p>
        </section>
      ) : null}
      {detail.attachments.length > 0 ? (
        <section>
          <h3>Pièces jointes</h3>
          <ul>
            {detail.attachments.map((file) => (
              <li key={file.id}>
                <Paperclip aria-hidden />
                <a
                  href={`/api/signalement/historique/${encodeURIComponent(detail.id)}/attachments/${encodeURIComponent(file.id)}`}
                >
                  {file.name}
                </a>
                <span>{formatSize(file.size)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function formatSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}
