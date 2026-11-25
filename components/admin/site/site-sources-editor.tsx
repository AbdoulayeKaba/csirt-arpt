'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  ExternalLink,
  FileText,
  Globe2,
  History,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Rss,
  Search,
  Trash2,
  Play,
  Code2,
} from 'lucide-react'
import { AdminConfirmDialog } from '@/components/admin/admin-confirm-dialog'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import {
  SiteSourceFormModal,
  type SourceFormValues,
} from '@/components/admin/site/site-source-form-modal'
import { useSiteEditor } from '@/components/admin/site/use-site-editor'
import {
  archiveNow,
  createEmptyNewsSource,
  getSiteSourceStatus,
  isArchivedFlag,
  resolveNewsTopics,
  type SiteNewsSource,
  type SiteSourceStatus,
} from '@/lib/site/news-sources'
import {
  getSyncFreshness,
  syncFreshnessLabel,
} from '@/lib/site/news-sync-schedule'
import type { SiteContent } from '@/lib/site/types'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { DG_SITE_ROUTES } from '@/lib/dg/site-routes'
import '@/components/admin/site/site-admin.css'
import '@/components/admin/site/site-news.css'

type ScopeTab = 'all' | 'active' | 'error' | 'trash'
type ConfirmState =
  | { type: 'scrape-all' }
  | { type: 'scrape-one'; source: SiteNewsSource }
  | { type: 'archive'; source: SiteNewsSource }
  | { type: 'purge'; source: SiteNewsSource }
  | null

type ScrapeReport = {
  ok: boolean
  added: number
  updatedSources: number
  errors: { sourceName: string; message: string }[]
  failureMessage?: string
  mode: 'all' | 'one'
  sourceName?: string
}

function formatSync(value?: string | null) {
  if (!value) return 'Jamais synchronisée'
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true, locale: fr })
  } catch {
    return value
  }
}

function hostLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url || '—'
  }
}

function scrapeFailureMessage(
  status: number,
  json: { error?: string; message?: string }
): string {
  if (json.message?.trim()) return json.message.trim()
  if (status === 401 || json.error === 'UNAUTHORIZED') {
    return 'Session expirée ou non reconnue. Reconnectez-vous puis relancez la collecte.'
  }
  if (status === 403 || json.error === 'FORBIDDEN') {
    return 'Vous n’avez pas la permission de lancer une collecte.'
  }
  if (json.error === 'SITE_SAVE_FAILED') {
    return 'La collecte a réussi mais l’enregistrement a échoué. Réessayez.'
  }
  return 'La collecte a échoué côté serveur.'
}

function faviconUrl(url: string) {
  try {
    const host = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`
  } catch {
    return null
  }
}

const AUTO_SYNC_POLL_MS = 5 * 60 * 1000

function TypeIcon({ type }: { type: SiteNewsSource['type'] }) {
  if (type === 'api') return <Code2 className="h-3.5 w-3.5" aria-hidden />
  if (type === 'html') return <Globe2 className="h-3.5 w-3.5" aria-hidden />
  return <Rss className="h-3.5 w-3.5" aria-hidden />
}

function typeLabel(type: SiteNewsSource['type']) {
  if (type === 'api') return 'API'
  if (type === 'html') return 'HTML'
  return 'RSS'
}

function StatusBadge({ status }: { status: SiteSourceStatus }) {
  const map = {
    active: { label: 'Actif', className: 'is-active' },
    inactive: { label: 'Inactif', className: 'is-inactive' },
    error: { label: 'Erreur', className: 'is-error' },
    trash: { label: 'Corbeille', className: 'is-trash' },
  } as const
  const meta = map[status]
  return <span className={cn('site-src-badge', meta.className)}>{meta.label}</span>
}

export function SiteSourcesEditor() {
  const { site, setSite, hydrateSite, loading, saving, dirty, canEdit, save } = useSiteEditor()
  const topics = useMemo(() => resolveNewsTopics(site?.newsTopics), [site?.newsTopics])
  const allSources = site?.newsSources ?? []
  const collected = site?.newsCollected ?? []

  const [scope, setScope] = useState<ScopeTab>('all')
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | SiteNewsSource['type']>('all')
  const [scraping, setScraping] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [scrapeReport, setScrapeReport] = useState<ScrapeReport | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<string | null>(null)
  const autoSyncBusy = useRef(false)

  const runAutoSync = useCallback(async () => {
    if (!canEdit || autoSyncBusy.current || dirty || scraping) return
    autoSyncBusy.current = true
    try {
      const res = await fetch('/api/admin/site/news/auto-sync', {
        method: 'POST',
        credentials: 'include',
      })
      const json = (await res.json().catch(() => ({}))) as {
        site?: SiteContent
        skipped?: boolean
        dueCount?: number
        added?: number
        errors?: { sourceName: string; message: string }[]
      }
      if (!res.ok) return
      if (json.site) hydrateSite(json.site)
      if (!json.skipped && (json.added ?? 0) > 0) {
        toast({
          title: 'Collecte automatique',
          description: `${json.added} nouvelle${json.added === 1 ? '' : 's'} actualité${json.added === 1 ? '' : 's'} dans l’historique.`,
        })
      }
    } finally {
      autoSyncBusy.current = false
    }
  }, [canEdit, dirty, hydrateSite, scraping])

  useEffect(() => {
    if (!canEdit || loading) return
    void runAutoSync()
    const id = window.setInterval(() => void runAutoSync(), AUTO_SYNC_POLL_MS)
    return () => window.clearInterval(id)
  }, [canEdit, loading, runAutoSync])

  const docsBySource = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of collected) {
      if (isArchivedFlag(item)) continue
      map.set(item.sourceId, (map.get(item.sourceId) ?? 0) + 1)
    }
    return map
  }, [collected])

  const liveSources = allSources.filter((s) => !isArchivedFlag(s))
  const trashSources = allSources.filter((s) => isArchivedFlag(s))
  const activeCount = liveSources.filter((s) => getSiteSourceStatus(s) === 'active').length
  const errorCount = liveSources.filter((s) => getSiteSourceStatus(s) === 'error').length
  const docsCount = collected.filter((i) => !isArchivedFlag(i)).length

  const visible = useMemo(() => {
    const pool =
      scope === 'trash'
        ? trashSources
        : scope === 'active'
          ? liveSources.filter((s) => getSiteSourceStatus(s) === 'active')
          : scope === 'error'
            ? liveSources.filter((s) => getSiteSourceStatus(s) === 'error')
            : liveSources

    const q = query.trim().toLowerCase()
    return pool.filter((s) => {
      if (typeFilter !== 'all' && s.type !== typeFilter) return false
      if (!q) return true
      return (
        s.name.toLowerCase().includes(q) ||
        s.url.toLowerCase().includes(q) ||
        (s.notes ?? '').toLowerCase().includes(q)
      )
    })
  }, [scope, trashSources, liveSources, typeFilter, query])

  const setSources = (next: SiteNewsSource[]) => {
    if (!site) return
    setSite({ ...site, newsSources: next })
  }

  const updateSource = (id: string, patch: Partial<SiteNewsSource>) => {
    setSources(allSources.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const editingSource = editingId
    ? allSources.find((s) => s.id === editingId) ?? null
    : null

  const openCreate = () => {
    setFormMode('create')
    setEditingId(null)
    setFormOpen(true)
  }

  const openEdit = (source: SiteNewsSource) => {
    setFormMode('edit')
    setEditingId(source.id)
    setFormOpen(true)
  }

  const submitForm = (values: SourceFormValues) => {
    const category = topics[0]?.id ?? 'BULLETINS'
    if (formMode === 'create') {
      const next = {
        ...createEmptyNewsSource(category, liveSources.length),
        name: values.name,
        url: values.url,
        type: values.type,
        frequency: values.frequency,
        country: values.country,
        themes: values.themes,
        category,
        enabled: true,
      }
      setSources([...allSources, next])
      setScope('all')
      toast({ title: 'Source ajoutée', description: 'Pensez à enregistrer vos modifications.' })
    } else if (editingId) {
      updateSource(editingId, {
        name: values.name,
        url: values.url,
        type: values.type,
        frequency: values.frequency,
        country: values.country,
        themes: values.themes,
      })
      toast({ title: 'Source mise à jour' })
    }
    setFormOpen(false)
    setEditingId(null)
  }

  const archiveSource = (source: SiteNewsSource) => {
    updateSource(source.id, {
      archived: true,
      archivedAt: archiveNow(),
      enabled: false,
    })
    toast({ title: 'Source mise en corbeille' })
  }

  const restoreSource = (source: SiteNewsSource) => {
    updateSource(source.id, { archived: false, archivedAt: null })
    toast({ title: 'Source restaurée' })
  }

  const purgeSource = (source: SiteNewsSource) => {
    setSources(allSources.filter((s) => s.id !== source.id))
    toast({ title: 'Source supprimée définitivement' })
  }

  const runScrape = async (sourceIds?: string[], meta?: { mode: 'all' | 'one'; sourceName?: string }) => {
    if (!canEdit) return
    const mode = meta?.mode ?? (sourceIds?.length === 1 ? 'one' : 'all')
    const sourceName = meta?.sourceName
    setScraping(true)
    try {
      if (dirty) {
        const ok = await save()
        if (!ok) {
          setScrapeReport({
            ok: false,
            added: 0,
            updatedSources: 0,
            errors: [],
            failureMessage: 'Enregistrement préalable impossible. La collecte n’a pas démarré.',
            mode,
            sourceName,
          })
          return
        }
      }
      const res = await fetch('/api/admin/site/news/scrape', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceIds }),
      })
      const json = (await res.json().catch(() => ({}))) as {
        site?: SiteContent
        added?: number
        updatedSources?: number
        errors?: { sourceName: string; message: string }[]
        error?: string
        message?: string
      }
      if (!res.ok || !json.site) {
        setScrapeReport({
          ok: false,
          added: json.added ?? 0,
          updatedSources: json.updatedSources ?? 0,
          errors: json.errors ?? [],
          failureMessage: scrapeFailureMessage(res.status, json),
          mode,
          sourceName,
        })
        return
      }
      hydrateSite(json.site)
      setScrapeReport({
        ok: true,
        added: json.added ?? 0,
        updatedSources: json.updatedSources ?? 0,
        errors: json.errors ?? [],
        mode,
        sourceName,
      })
    } catch {
      setScrapeReport({
        ok: false,
        added: 0,
        updatedSources: 0,
        errors: [],
        failureMessage: 'Une erreur réseau a interrompu la collecte.',
        mode,
        sourceName,
      })
    } finally {
      setScraping(false)
      setConfirm(null)
    }
  }

  const runConfirm = () => {
    if (!confirm) return
    if (confirm.type === 'scrape-all') {
      void runScrape(undefined, { mode: 'all' })
      return
    }
    if (confirm.type === 'scrape-one') {
      void runScrape([confirm.source.id], {
        mode: 'one',
        sourceName: confirm.source.name.trim() || 'Source sans nom',
      })
      return
    }
    if (confirm.type === 'archive') archiveSource(confirm.source)
    if (confirm.type === 'purge') purgeSource(confirm.source)
    setConfirm(null)
  }

  const scrapeBusy = scraping && (confirm?.type === 'scrape-all' || confirm?.type === 'scrape-one')
  const reportTone =
    !scrapeReport
      ? null
      : !scrapeReport.ok
        ? 'failed'
        : scrapeReport.errors.length > 0
          ? 'partial'
          : scrapeReport.added > 0
            ? 'success'
            : 'empty'

  return (
    <div className="site-admin site-sources-page">
      <AdminPageHeader
        variant="flat"
        title="Sources & Collecte"
        description="Collecte d’actualités par thématiques — publication contrôlée sur le site."
        actions={
          <div className="site-sources-header-actions">
            <Link href={DG_SITE_ROUTES.collected} className="site-btn site-btn-ghost site-btn-sm">
              <History className="h-3.5 w-3.5" aria-hidden />
              Historique
            </Link>
            <button
              type="button"
              className="site-btn site-btn-warn site-btn-sm"
              disabled={!canEdit || scraping}
              onClick={() => {
                if (activeCount === 0) {
                  toast({
                    variant: 'destructive',
                    title: 'Aucune source active',
                    description: 'Activez au moins une source avant de lancer une collecte.',
                  })
                  return
                }
                setConfirm({ type: 'scrape-all' })
              }}
            >
              {scraping ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Play className="h-3.5 w-3.5" aria-hidden />
              )}
              Collecte
            </button>
            <button
              type="button"
              className="site-btn site-btn-primary site-btn-sm"
              disabled={!canEdit}
              onClick={openCreate}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Nouvelle source
            </button>
            {dirty ? (
              <button
                type="button"
                className="site-btn site-btn-primary site-btn-sm"
                disabled={!canEdit || saving}
                onClick={() => void save()}
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : null}
                Enregistrer
              </button>
            ) : null}
          </div>
        }
      />

      {loading ? (
        <div className="site-loading">Chargement des sources…</div>
      ) : site ? (
        <div className="site-src-shell">
          <div className="site-src-kpis" role="list">
            <article className="site-src-kpi is-total" role="listitem">
              <span className="site-src-kpi__icon" aria-hidden>
                <Database className="h-3.5 w-3.5" />
              </span>
              <div className="site-src-kpi__body">
                <strong>{liveSources.length}</strong>
                <span>Totales</span>
              </div>
            </article>
            <article className="site-src-kpi is-active" role="listitem">
              <span className="site-src-kpi__icon" aria-hidden>
                <CheckCircle2 className="h-3.5 w-3.5" />
              </span>
              <div className="site-src-kpi__body">
                <strong>{activeCount}</strong>
                <span>Actives</span>
              </div>
            </article>
            <article className="site-src-kpi is-error" role="listitem">
              <span className="site-src-kpi__icon" aria-hidden>
                <AlertTriangle className="h-3.5 w-3.5" />
              </span>
              <div className="site-src-kpi__body">
                <strong>{errorCount}</strong>
                <span>Erreurs</span>
              </div>
            </article>
            <article className="site-src-kpi is-docs" role="listitem">
              <span className="site-src-kpi__icon" aria-hidden>
                <FileText className="h-3.5 w-3.5" />
              </span>
              <div className="site-src-kpi__body">
                <strong>{docsCount}</strong>
                <span>Actualités</span>
              </div>
            </article>
          </div>

          <section className="site-src-panel">
            <div className="site-src-toolbar">
              <div className="site-src-tabs" role="tablist" aria-label="Filtrer les sources">
                {(
                  [
                    ['all', 'Toutes', liveSources.length],
                    ['active', 'Actives', activeCount],
                    ['error', 'Erreurs', errorCount],
                    ['trash', 'Corbeille', trashSources.length],
                  ] as const
                ).map(([key, label, count]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={scope === key}
                    className={cn(
                      'site-src-tab',
                      key === 'trash' && 'is-trash-tab',
                      scope === key && 'is-active'
                    )}
                    onClick={() => setScope(key)}
                  >
                    {label}
                    <em>{count}</em>
                  </button>
                ))}
              </div>
              <label className="site-src-search">
                <Search className="h-3.5 w-3.5" aria-hidden />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher…"
                />
              </label>
              <select
                className="site-input site-src-type"
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter(e.target.value as 'all' | SiteNewsSource['type'])
                }
              >
                <option value="all">Tous types</option>
                <option value="rss">RSS</option>
                <option value="html">HTML</option>
                <option value="api">API</option>
              </select>
              <Link href={DG_SITE_ROUTES.collected} className="site-btn site-btn-primary site-btn-sm">
                Gérer les actualités
              </Link>
            </div>

            {visible.length === 0 ? (
              scope === 'trash' ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-1.5 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-0.5">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-bold text-foreground">La corbeille est vide</p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Aucune source n’est dans la corbeille. Les sources archivées sont conservées pendant 3 mois avant suppression définitive automatique.
                  </p>
                </div>
              ) : (
                <div className="site-src-empty">
                  <strong>Aucune source</strong>
                  <p>Ajoutez une source pour démarrer la veille.</p>
                  <button
                    type="button"
                    className="site-btn site-btn-primary site-btn-sm"
                    disabled={!canEdit}
                    onClick={openCreate}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    Nouvelle source
                  </button>
                </div>
              )
            ) : (
              <ul className="site-src-grid" aria-label="Liste des sources">
                {visible.map((source) => {
                  const status = getSiteSourceStatus(source)
                  const docs = docsBySource.get(source.id) ?? 0
                  const host = hostLabel(source.url)
                  const favicon = source.url.startsWith('http') ? faviconUrl(source.url) : null
                  const freshness = getSyncFreshness(source.lastFetchedAt, source.frequency)
                  return (
                    <li
                      key={source.id}
                      className={cn(
                        'site-src-card',
                        `is-type-${source.type}`,
                        source.enabled && scope !== 'trash' && 'is-enabled',
                        status === 'error' && 'is-error',
                        status === 'inactive' && 'is-inactive',
                        status === 'trash' && 'is-trash'
                      )}
                    >
                      <div className="site-src-card__glow" aria-hidden />

                      <header className="site-src-card__head">
                        <div className={cn('site-src-avatar', `is-${source.type}`)}>
                          {favicon ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={favicon}
                              alt=""
                              className="site-src-avatar__img"
                              loading="lazy"
                            />
                          ) : null}
                          <span className={cn('site-src-avatar__fallback', `is-${source.type}`)}>
                            <TypeIcon type={source.type} />
                          </span>
                          <span className={cn('site-src-avatar__type', `is-${source.type}`)}>
                            {typeLabel(source.type)}
                          </span>
                        </div>

                        <div className="site-src-card__identity">
                          <div className="site-src-card__title-row">
                            <strong>{source.name.trim() || 'Source sans nom'}</strong>
                            <StatusBadge status={status} />
                          </div>
                          {source.url.startsWith('http') ? (
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                              className="site-src-cell-url"
                              title={source.url}
                            >
                              <Globe2 className="h-3 w-3" aria-hidden />
                              {host}
                            </a>
                          ) : (
                            <span className="site-src-cell-url">{host}</span>
                          )}
                        </div>

                        {scope === 'trash' ? (
                          <button
                            type="button"
                            className="site-btn site-btn-ghost site-btn-sm site-src-restore"
                            disabled={!canEdit}
                            onClick={() => restoreSource(source)}
                          >
                            Restaurer
                          </button>
                        ) : (
                          <label
                            className="site-src-switch"
                            title={source.enabled ? 'Actif' : 'Inactif'}
                          >
                            <input
                              type="checkbox"
                              checked={source.enabled}
                              disabled={!canEdit}
                              onChange={(e) =>
                                updateSource(source.id, { enabled: e.target.checked })
                              }
                            />
                            <i aria-hidden />
                          </label>
                        )}
                      </header>

                      {source.lastError ? (
                        <p className="site-src-card__error">
                          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                          <span>{source.lastError}</span>
                        </p>
                      ) : null}

                      <div className="site-src-card__metrics">
                        <Link
                          href={`${DG_SITE_ROUTES.collected}?source=${encodeURIComponent(source.id)}`}
                          className={cn('site-src-metric', docs > 0 && 'has-value')}
                          title="Voir dans l’historique"
                        >
                          <span className="site-src-metric__label">Actualités</span>
                          <strong className="site-src-metric__value">{docs}</strong>
                          <FileText className="site-src-metric__icon" aria-hidden />
                        </Link>
                        <div className="site-src-metric">
                          <span className="site-src-metric__label">Fréquence</span>
                          <strong className="site-src-metric__value is-text">
                            {source.frequency || 'Quotidien'}
                          </strong>
                          <RefreshCw className="site-src-metric__icon" aria-hidden />
                        </div>
                        <div
                          className={cn('site-src-metric', `is-sync-${freshness}`)}
                          title={formatSync(source.lastFetchedAt)}
                        >
                          <span className="site-src-metric__label">Sync</span>
                          <strong className="site-src-metric__value is-text">
                            {syncFreshnessLabel(freshness)}
                          </strong>
                          <span className={cn('site-src-sync-dot', `is-${freshness}`)} aria-hidden />
                        </div>
                      </div>

                      {source.country || (source.themes && source.themes.length > 0) ? (
                        <div className="site-src-card__tags">
                          <div className="site-src-card__tags-list">
                            {source.country ? (
                              <span className="is-country">{source.country}</span>
                            ) : null}
                            {(source.themes ?? []).slice(0, 4).map((theme, index) => (
                              <span key={theme} className={`is-theme-${(index % 5) + 1}`}>
                                {theme}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <footer className="site-src-card__foot">
                        <div className="site-src-card__actions">
                          {scope !== 'trash' ? (
                            <button
                              type="button"
                              className="site-src-action is-sync"
                              disabled={!canEdit || scraping || !source.enabled}
                              aria-label="Synchroniser"
                              title="Synchroniser"
                              onClick={() => setConfirm({ type: 'scrape-one', source })}
                            >
                              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                              <span className="site-src-action__label">Sync</span>
                            </button>
                          ) : null}
                          {scope !== 'trash' ? (
                            <button
                              type="button"
                              className="site-src-action"
                              disabled={!canEdit}
                              aria-label="Modifier"
                              title="Modifier"
                              onClick={() => openEdit(source)}
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden />
                              <span className="site-src-action__label">Modifier</span>
                            </button>
                          ) : null}
                          {source.url.startsWith('http') ? (
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                              className="site-src-action"
                              aria-label="Ouvrir"
                              title="Ouvrir"
                            >
                              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                              <span className="site-src-action__label">Ouvrir</span>
                            </a>
                          ) : null}
                          <button
                            type="button"
                            className="site-src-action is-danger"
                            disabled={!canEdit}
                            aria-label={scope === 'trash' ? 'Supprimer définitivement' : 'Corbeille'}
                            title={scope === 'trash' ? 'Supprimer définitivement' : 'Corbeille'}
                            onClick={() =>
                              setConfirm({
                                type: scope === 'trash' ? 'purge' : 'archive',
                                source,
                              })
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            <span className="site-src-action__label">
                              {scope === 'trash' ? 'Supprimer' : 'Corbeille'}
                            </span>
                          </button>
                        </div>
                      </footer>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      <SiteSourceFormModal
        open={formOpen}
        mode={formMode}
        canEdit={canEdit}
        initial={
          editingSource
            ? {
                name: editingSource.name,
                type: editingSource.type,
                url: editingSource.url,
                frequency: editingSource.frequency || 'Quotidien',
                country: editingSource.country || '',
                themes: editingSource.themes ?? [],
              }
            : null
        }
        onClose={() => {
          setFormOpen(false)
          setEditingId(null)
        }}
        onSubmit={submitForm}
      />

      <AdminConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => {
          if (!open && !scraping) setConfirm(null)
        }}
        title={
          scrapeBusy
            ? 'Collecte en cours…'
            : confirm?.type === 'scrape-all'
              ? 'Démarrer la collecte'
              : confirm?.type === 'scrape-one'
                ? 'Synchroniser la source'
                : confirm?.type === 'archive'
                  ? 'Mettre la source en corbeille ?'
                  : confirm?.type === 'purge'
                    ? 'Supprimer définitivement ?'
                    : 'Confirmer'
        }
        message={
          scrapeBusy ? (
            <>
              <p>Interrogation des sources actives. Merci de patienter.</p>
              <span className="admin-confirm-dialog-hint">
                Le bilan détaillé s’affichera à la fin de l’opération.
              </span>
            </>
          ) : confirm?.type === 'scrape-all' ? (
            <>
              <p>
                {activeCount === 1
                  ? '1 source active sera interrogée.'
                  : `${activeCount} sources actives seront interrogées.`}
              </p>
              {liveSources.length > activeCount ? (
                <p>
                  {liveSources.length - activeCount === 1
                    ? '1 source inactive ou en erreur sera ignorée.'
                    : `${liveSources.length - activeCount} sources inactives ou en erreur seront ignorées.`}
                </p>
              ) : null}
              <span className="admin-confirm-dialog-hint">
                Les actualités rejoignent l’historique, masquées par défaut jusqu’à validation
                éditoriale.
              </span>
            </>
          ) : confirm?.type === 'scrape-one' ? (
            <>
              <p>
                Collecte immédiate pour «{' '}
                <strong>{confirm.source.name.trim() || 'Source sans nom'}</strong> ».
              </p>
              <span className="admin-confirm-dialog-hint">
                Les nouvelles actualités restent masquées sur le site jusqu’à activation dans
                l’historique.
              </span>
            </>
          ) : confirm?.type === 'archive' ? (
            `« ${confirm.source.name} » ira dans la corbeille.`
          ) : confirm?.type === 'purge' ? (
            `« ${confirm.source.name} » sera définitivement effacée.`
          ) : (
            ''
          )
        }
        confirmLabel={
          confirm?.type === 'purge'
            ? 'Supprimer'
            : confirm?.type === 'archive'
              ? 'Corbeille'
              : confirm?.type === 'scrape-one'
                ? 'Synchroniser'
                : 'Démarrer'
        }
        intent={
          confirm?.type === 'archive' || confirm?.type === 'purge' ? 'destructive' : 'action'
        }
        loading={scrapeBusy}
        onConfirm={runConfirm}
      />

      {scrapeReport && reportTone ? (
        <div className="site-scrape-report" role="dialog" aria-modal="true" aria-labelledby="site-scrape-report-title">
          <button
            type="button"
            className="site-scrape-report__backdrop"
            aria-label="Fermer"
            onClick={() => setScrapeReport(null)}
          />
          <div className={cn('site-scrape-report__panel', `is-${reportTone}`)}>
            <div className={cn('site-scrape-report__accent', `is-${reportTone}`)} aria-hidden />

            <header className="site-scrape-report__head">
              <span className={cn('site-scrape-report__icon', `is-${reportTone}`)} aria-hidden>
                {reportTone === 'failed' || reportTone === 'partial' ? (
                  <AlertTriangle className="h-4.5 w-4.5" strokeWidth={2.25} />
                ) : reportTone === 'empty' ? (
                  <RefreshCw className="h-4.5 w-4.5" strokeWidth={2.25} />
                ) : (
                  <CheckCircle2 className="h-4.5 w-4.5" strokeWidth={2.25} />
                )}
              </span>
              <div className="site-scrape-report__titles">
                <p className={cn('site-scrape-report__chip', `is-${reportTone}`)}>
                  {reportTone === 'failed'
                    ? 'Échec'
                    : reportTone === 'partial'
                      ? 'Alertes'
                      : reportTone === 'empty'
                        ? 'Sans nouveauté'
                        : 'Succès'}
                </p>
                <h2 id="site-scrape-report-title">
                  {reportTone === 'failed'
                    ? 'Collecte interrompue'
                    : reportTone === 'partial'
                      ? 'Collecte terminée avec alertes'
                      : reportTone === 'empty'
                        ? 'Collecte terminée'
                        : 'Collecte réussie'}
                </h2>
                <p className="site-scrape-report__sub">
                  {scrapeReport.mode === 'one' && scrapeReport.sourceName
                    ? `Source « ${scrapeReport.sourceName} »`
                    : 'Bilan de la collecte globale'}
                  {reportTone === 'empty' ? ' · Aucun nouvel article' : ''}
                </p>
              </div>
            </header>

            {scrapeReport.failureMessage ? (
              <p className="site-scrape-report__fail">{scrapeReport.failureMessage}</p>
            ) : (
              <>
                <div className="site-scrape-report__kpis" role="list">
                  <article role="listitem" className="is-news">
                    <span className="site-scrape-report__kpi-label">Actualités</span>
                    <strong>{scrapeReport.added}</strong>
                    <em>{scrapeReport.added <= 1 ? 'nouvelle' : 'nouvelles'}</em>
                  </article>
                  <article role="listitem" className="is-sources">
                    <span className="site-scrape-report__kpi-label">Sources</span>
                    <strong>{scrapeReport.updatedSources}</strong>
                    <em>{scrapeReport.updatedSources <= 1 ? 'interrogée' : 'interrogées'}</em>
                  </article>
                  <article
                    role="listitem"
                    className={cn('is-errors', scrapeReport.errors.length > 0 && 'is-warn')}
                  >
                    <span className="site-scrape-report__kpi-label">Erreurs</span>
                    <strong>{scrapeReport.errors.length}</strong>
                    <em>{scrapeReport.errors.length <= 1 ? 'signalée' : 'signalées'}</em>
                  </article>
                </div>

                {reportTone === 'empty' ? (
                  <p className="site-scrape-report__note">
                    Les sources ont répondu, mais aucun nouvel élément n’a été ajouté à
                    l’historique.
                  </p>
                ) : null}

                {scrapeReport.added > 0 ? (
                  <p className="site-scrape-report__note">
                    Les nouvelles actualités sont dans l’historique, masquées par défaut jusqu’à
                    validation éditoriale.
                  </p>
                ) : null}

                {scrapeReport.errors.length > 0 ? (
                  <div className="site-scrape-report__errors">
                    <div className="site-scrape-report__errors-head">
                      <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                      <h3>Détail des erreurs</h3>
                    </div>
                    <ul>
                      {scrapeReport.errors.map((err, index) => (
                        <li key={`${err.sourceName}-${index}`}>
                          <span className="site-scrape-report__err-dot" aria-hidden />
                          <div>
                            <strong>{err.sourceName}</strong>
                            <span>{err.message}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            )}

            <footer className="site-scrape-report__foot">
              <button
                type="button"
                className="site-btn site-btn-sm site-scrape-report__btn-close"
                onClick={() => setScrapeReport(null)}
              >
                Fermer
              </button>
              {scrapeReport.ok ? (
                <Link
                  href={DG_SITE_ROUTES.collected}
                  className="site-btn site-btn-primary site-btn-sm"
                  onClick={() => setScrapeReport(null)}
                >
                  <History className="h-3.5 w-3.5" aria-hidden />
                  Voir l’historique
                </Link>
              ) : null}
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  )
}
