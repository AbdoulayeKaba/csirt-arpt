'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  CalendarDays,
  ArrowUp,
  ChevronDown,
  ExternalLink,
  Eye,
  EyeOff,
  PenLine,
  Plus,
  RotateCcw,
  Search,
  Tags,
  Trash2,
} from 'lucide-react'
import { AdminConfirmDialog } from '@/components/admin/admin-confirm-dialog'
import { SiteAlertCategoriesDialog } from '@/components/admin/site/site-alert-categories-dialog'
import { SiteShell } from '@/components/admin/site/site-shell'
import { useSiteEditor } from '@/components/admin/site/use-site-editor'
import { formatSiteNewsDates } from '@/lib/site/ids'
import { decodeHtmlEntities } from '@/lib/site/news-scrape'
import {
  archiveNow,
  isArchivedFlag,
  newsCategoryLabel,
  normalizeSiteNewsCategory,
  resolveNewsTopics,
  type SiteNewsCollectedItem,
} from '@/lib/site/news-sources'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import '@/components/admin/site/site-admin.css'
import '@/components/admin/site/site-news.css'

type CollectedRow = SiteNewsCollectedItem & {
  title: string
  excerpt: string
}

type CategoryGroup = {
  key: string
  label: string
  order: number
  items: CollectedRow[]
  enabledCount: number
}

/** Retire drapeaux / emojis régionaux du libellé source. */
function cleanSourceLabel(name: string) {
  return name
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '')
    .replace(/\uFE0F/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function parseSafeDate(value?: string | null): Date | null {
  if (!value?.trim()) return null
  const clean = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const d = new Date(`${clean}T12:00:00`)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const d = new Date(clean)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatSourcePublication(value?: string | null) {
  if (!value?.trim()) return { label: '—', title: 'Date de publication inconnue' }
  const d = parseSafeDate(value)
  if (!d) return { label: value, title: `Date de publication : ${value}` }
  const dateFormatted = format(d, 'dd MMM yyyy', { locale: fr }).toUpperCase()
  const dateFull = format(d, 'EEEE d MMMM yyyy', { locale: fr })
  return {
    label: dateFormatted,
    title: `Publiée le ${dateFull}`,
  }
}

function formatPlatformPublication(item: CollectedRow) {
  if (!item.enabled) {
    return {
      label: '—',
      title: 'Actualité non publiée sur la plateforme (masquée)',
      isLive: false,
    }
  }
  const dateVal = item.enabledAt || item.date || item.scrapedAt
  const d = parseSafeDate(dateVal)
  if (!d) {
    return {
      label: 'En ligne',
      title: 'Publiée sur la plateforme',
      isLive: true,
    }
  }

  const dateFormatted = format(d, 'dd MMM yyyy', { locale: fr }).toUpperCase()
  const hasSpecificTime = typeof dateVal === 'string' && (dateVal.includes('T') || dateVal.includes(':'))
  const timeFormatted = format(d, 'HH:mm')
  const label = hasSpecificTime ? `${dateFormatted} à ${timeFormatted}` : dateFormatted
  const fullTitle = format(d, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })

  return {
    label,
    title: `Publiée sur la plateforme le ${fullTitle}`,
    isLive: true,
  }
}

function itemThemes(item: CollectedRow, topics: ReturnType<typeof resolveNewsTopics>) {
  return item.themes?.length ? item.themes : [newsCategoryLabel(item.category, topics)]
}

function mapCollectedRow(item: SiteNewsCollectedItem): CollectedRow {
  return {
    ...item,
    title: decodeHtmlEntities(item.title),
    excerpt: decodeHtmlEntities(item.excerpt ?? ''),
    sourceName: cleanSourceLabel(item.sourceName || 'Source inconnue'),
  }
}

type FilterKey = 'all' | 'on' | 'off' | 'trash'
type ConfirmState = { mode: 'archive' | 'purge'; id: string; title: string } | null

export function SiteCollectedEditor() {
  const searchParams = useSearchParams()
  const { site, setSite, hydrateSite, persistSite, loading, saving, dirty, canEdit, save } = useSiteEditor()
  const topics = useMemo(() => resolveNewsTopics(site?.newsTopics), [site?.newsTopics])
  const [filter, setFilter] = useState<FilterKey>('all')
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [showLift, setShowLift] = useState(false)

  useEffect(() => {
    const onScroll = () => setShowLift(window.scrollY > 420)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const liftToTop = () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
  }

  useEffect(() => {
    const fromQuery = searchParams.get('category')?.trim()
    if (fromQuery) setCategoryFilter(fromQuery)
  }, [searchParams])

  useEffect(() => {
    if (categoryFilter === 'all') return
    if (!topics.some((topic) => topic.id === categoryFilter)) setCategoryFilter('all')
  }, [categoryFilter, topics])

  const allRows = useMemo(
    () => (site?.newsCollected ?? []).map(mapCollectedRow),
    [site?.newsCollected]
  )

  const liveItems = useMemo(
    () => allRows.filter((item) => !isArchivedFlag(item)),
    [allRows]
  )

  const trashItems = useMemo(
    () => allRows.filter((item) => isArchivedFlag(item)),
    [allRows]
  )

  const inTrash = filter === 'trash'
  const pool = inTrash ? trashItems : liveItems

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return pool.filter((item) => {
      if (!inTrash) {
        if (filter === 'on' && !item.enabled) return false
        if (filter === 'off' && item.enabled) return false
      }
      const categoryId = normalizeSiteNewsCategory(item.category, topics)
      if (categoryFilter !== 'all' && categoryId !== categoryFilter) return false
      const label = newsCategoryLabel(categoryId, topics)
      if (!q) return true
      return (
        item.title.toLowerCase().includes(q) ||
        item.excerpt.toLowerCase().includes(q) ||
        label.toLowerCase().includes(q)
      )
    })
  }, [pool, inTrash, filter, query, categoryFilter, topics])

  const groups = useMemo((): CategoryGroup[] => {
    const map = new Map<string, CategoryGroup>()
    const ensure = (id: string) => {
      const current = map.get(id)
      if (current) return current
      const topic = topics.find((item) => item.id === id)
      const group: CategoryGroup = {
        key: id,
        label: newsCategoryLabel(id, topics),
        order: topic?.order ?? 999,
        items: [],
        enabledCount: 0,
      }
      map.set(id, group)
      return group
    }

    const showEmpty = !inTrash && !query.trim() && filter === 'all'
    if (showEmpty) {
      for (const topic of topics) {
        if (categoryFilter === 'all' || topic.id === categoryFilter) ensure(topic.id)
      }
    }

    for (const item of filtered) {
      const group = ensure(normalizeSiteNewsCategory(item.category, topics))
      group.items.push(item)
      if (item.enabled) group.enabledCount += 1
    }

    for (const group of map.values()) {
      group.items.sort((a, b) => {
        const sortTs = (item: CollectedRow) => {
          if (inTrash) return Date.parse(item.archivedAt || item.date || item.scrapedAt || '') || 0
          return Date.parse(item.date || item.enabledAt || item.scrapedAt || '') || 0
        }
        return sortTs(b) - sortTs(a)
      })
    }

    return [...map.values()]
      .filter((group) => showEmpty || group.items.length > 0)
      .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, 'fr'))
  }, [filtered, inTrash, query, filter, categoryFilter, topics])

  const enabledCount = liveItems.filter((i) => i.enabled).length

  const updateItem = async (id: string, patch: Partial<SiteNewsCollectedItem>) => {
    if (!site || !canEdit) return
    const now = new Date().toISOString()
    const enrichedPatch = {
      ...patch,
      ...(patch.enabled !== undefined && patch.enabledAt === undefined
        ? { enabledAt: patch.enabled ? now : null }
        : {}),
    }
    const nextSite = {
      ...site,
      newsCollected: site.newsCollected.map((row) =>
        row.id === id ? { ...row, ...enrichedPatch } : row
      ),
    }
    await persistSite(nextSite, { quiet: true })
  }

  const setGroupVisibility = async (group: CategoryGroup, enabled: boolean) => {
    if (!site || !canEdit || inTrash) return
    const ids = new Set(group.items.map((i) => i.id))
    const now = new Date().toISOString()
    const nextSite = {
      ...site,
      newsCollected: site.newsCollected.map((row) =>
        ids.has(row.id)
          ? { ...row, enabled, enabledAt: enabled ? now : null }
          : row
      ),
    }
    await persistSite(nextSite, { quiet: true })
    toast({
      title: enabled
        ? `${group.items.length} actualité(s) affichée(s)`
        : `${group.items.length} actualité(s) masquée(s)`,
      description: group.label,
    })
  }

  const archiveItem = async (id: string) => {
    await updateItem(id, {
      archived: true,
      archivedAt: archiveNow(),
      enabled: false,
    })
    setConfirm(null)
    setExpandedId((cur) => (cur === id ? null : cur))
    toast({ title: 'Actualité mise en corbeille' })
  }

  const restoreItem = async (id: string) => {
    await updateItem(id, { archived: false, archivedAt: null })
    setExpandedId((cur) => (cur === id ? null : cur))
    toast({ title: 'Actualité restaurée' })
  }

  const restoreGroup = async (group: CategoryGroup) => {
    if (!site || !canEdit) return
    const ids = new Set(group.items.map((i) => i.id))
    const nextSite = {
      ...site,
      newsCollected: site.newsCollected.map((row) =>
        ids.has(row.id) ? { ...row, archived: false, archivedAt: null } : row
      ),
    }
    await persistSite(nextSite, { quiet: true })
    toast({
      title: `${group.items.length} actualité(s) restaurée(s)`,
      description: group.label,
    })
  }

  const purgeItem = async (id: string) => {
    if (!site || !canEdit) return
    const nextSite = {
      ...site,
      newsCollected: site.newsCollected.filter((row) => row.id !== id),
    }
    await persistSite(nextSite, { quiet: true })
    setConfirm(null)
    setExpandedId((cur) => (cur === id ? null : cur))
    toast({ title: 'Actualité supprimée définitivement' })
  }

  return (
    <SiteShell
      title="Alertes"
      description="Saisie manuelle, classée par catégorie. Chaque alerte s’affiche ou se masque sur le site public."
      canEdit={canEdit}
      dirty={dirty}
      saving={saving}
      loading={loading}
      onSave={save}
      previewHref="/actualites"
      extraActions={
        canEdit ? (
          <>
            <button
              type="button"
              className="site-btn site-btn-ghost site-btn-header"
              disabled={!site || loading}
              onClick={() => setCategoriesOpen(true)}
            >
              <Tags className="h-3.5 w-3.5" aria-hidden />
              <span>Catégories</span>
            </button>
            <Link href="/dg/collected/new" className="site-btn site-btn-primary site-btn-header">
              <Plus className="h-3.5 w-3.5" aria-hidden />
              <span>Nouvelle alerte</span>
            </Link>
          </>
        ) : null
      }
    >
      {site ? (
        <SiteAlertCategoriesDialog
          open={categoriesOpen}
          onOpenChange={setCategoriesOpen}
          site={site}
          persistSite={persistSite}
        />
      ) : null}
      <button
        type="button"
        className={cn('site-collected-lift', showLift && 'is-visible')}
        aria-label="Remonter en haut"
        tabIndex={showLift ? 0 : -1}
        onClick={liftToTop}
      >
        <ArrowUp aria-hidden />
        <span>Haut</span>
      </button>
      {site ? (
        <div className="site-collected-page">
          <section className={cn('site-src-panel site-collected-panel', inTrash && 'is-trash')}>
            <div className="site-src-toolbar site-collected-toolbar">
              <div className="site-src-tabs" role="tablist" aria-label="Visibilité">
                {(
                  [
                    ['all', 'Toutes', liveItems.length],
                    ['on', 'Affichées', enabledCount],
                    ['off', 'Masquées', liveItems.length - enabledCount],
                    ['trash', 'Corbeille', trashItems.length],
                  ] as const
                ).map(([key, label, count]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={filter === key}
                    className={cn(
                      'site-src-tab',
                      filter === key && 'is-active',
                      key === 'trash' && 'is-trash-tab'
                    )}
                    onClick={() => setFilter(key)}
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
                  placeholder={inTrash ? 'Rechercher dans la corbeille…' : 'Titre ou catégorie…'}
                />
              </label>
              <select
                className="site-input site-src-type"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Filtrer par catégorie"
              >
                <option value="all">Toutes les catégories</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.label}
                  </option>
                ))}
              </select>
            </div>

            {groups.length === 0 ? (
              inTrash ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-1.5 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-0.5">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-bold text-foreground">La corbeille est vide</p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Aucun article n’est dans la corbeille. Les éléments archivés sont conservés pendant 3 mois avant suppression définitive automatique.
                  </p>
                </div>
              ) : (
                <div className="site-src-empty">
                  <strong>Aucune actualité</strong>
                  <p>
                    {liveItems.length === 0
                      ? 'Créez une alerte manuellement. Elle sera rangée dans sa catégorie.'
                      : 'Aucun résultat pour ces filtres.'}
                  </p>
                </div>
              )
            ) : (
              <div className="site-collected-groups">
                {groups.map((group) => {
                  const collapsed = Boolean(collapsedGroups[group.key])
                  return (
                    <section
                      key={group.key}
                      className={cn('site-collected-group', inTrash && 'is-trash')}
                    >
                      <header className="site-collected-group__head">
                        <button
                          type="button"
                          className="site-collected-group__toggle"
                          aria-expanded={!collapsed}
                          onClick={() =>
                            setCollapsedGroups((prev) => ({
                              ...prev,
                              [group.key]: !prev[group.key],
                            }))
                          }
                        >
                          <ChevronDown
                            className={cn(
                              'site-collected-group__chev',
                              collapsed && 'is-collapsed'
                            )}
                            aria-hidden
                          />
                          <span className="site-collected-group__identity">
                            <strong>{group.label}</strong>
                            <em>{group.items.length === 0 ? 'Aucune alerte' : 'Catégorie'}</em>
                          </span>
                        </button>

                        <div className="site-collected-group__meta">
                          <span className="site-collected-pill">
                            <strong>{group.items.length}</strong> article
                            {group.items.length > 1 ? 's' : ''}
                          </span>
                          {inTrash ? (
                            <span className="site-collected-pill is-trash">
                              Corbeille
                            </span>
                          ) : (
                            <>
                              <span className="site-collected-pill is-on">
                                <strong>{group.enabledCount}</strong> affichée
                                {group.enabledCount > 1 ? 's' : ''}
                              </span>
                              <span className="site-collected-pill is-off">
                                <strong>{group.items.length - group.enabledCount}</strong>{' '}
                                masquée
                                {group.items.length - group.enabledCount > 1 ? 's' : ''}
                              </span>
                            </>
                          )}
                        </div>

                        {canEdit ? (
                          <div className="site-collected-group__bulk">
                            {!inTrash ? (
                              <Link
                                href={`/dg/collected/new?category=${encodeURIComponent(group.key)}`}
                                className="site-collected-add"
                                aria-label={`Nouvelle alerte dans ${group.label}`}
                                title="Nouvelle alerte"
                              >
                                <Plus aria-hidden />
                              </Link>
                            ) : null}
                            {inTrash ? (
                              <button
                                type="button"
                                className="site-btn site-btn-ghost site-btn-sm"
                                onClick={() => restoreGroup(group)}
                              >
                                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                                Tout restaurer
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="site-btn site-btn-ghost site-btn-sm"
                                  onClick={() => setGroupVisibility(group, true)}
                                  disabled={group.enabledCount === group.items.length}
                                >
                                  <Eye className="h-3.5 w-3.5" aria-hidden />
                                  Tout afficher
                                </button>
                                <button
                                  type="button"
                                  className="site-btn site-btn-ghost site-btn-sm"
                                  onClick={() => setGroupVisibility(group, false)}
                                  disabled={group.enabledCount === 0}
                                >
                                  <EyeOff className="h-3.5 w-3.5" aria-hidden />
                                  Tout masquer
                                </button>
                              </>
                            )}
                          </div>
                        ) : null}
                      </header>

                      {!collapsed && group.items.length === 0 ? (
                        <p className="site-collected-empty-cat">Aucune alerte dans cette catégorie.</p>
                      ) : null}

                      {!collapsed && group.items.length > 0 ? (
                        <div className="site-collected-table-wrap">
                          <table className="site-collected-table">
                            <thead>
                              <tr>
                                <th scope="col" className="is-num">
                                  #
                                </th>
                                <th scope="col" className="is-check">
                                  {inTrash ? 'Rest.' : 'Visib.'}
                                </th>
                                <th scope="col" className="is-title">
                                  Titre
                                </th>
                                <th scope="col" title="Date de publication de l’alerte">
                                  Publication
                                </th>
                                <th scope="col" title="Visibilité sur le site public">
                                  En ligne
                                </th>
                                <th scope="col">Statut</th>
                                <th scope="col" className="is-actions">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.items.map((item, index) => {
                                const open = expandedId === item.id
                                const themes = itemThemes(item, topics)
                                const published = formatSourcePublication(item.date)
                                const platformPublished = formatPlatformPublication(item)
                                return (
                                  <Fragment key={item.id}>
                                    <tr
                                      className={cn(
                                        !item.enabled && !inTrash && 'is-hidden',
                                        inTrash && 'is-trash',
                                        open && 'is-open'
                                      )}
                                    >
                                      <td className="is-num" data-label="#">
                                        <span>{index + 1}</span>
                                      </td>
                                      <td className="is-check" data-label={inTrash ? 'Rest.' : 'Visib.'}>
                                        {inTrash ? (
                                          <button
                                            type="button"
                                            className="site-src-icon-btn"
                                            disabled={!canEdit}
                                            aria-label="Restaurer"
                                            title="Restaurer"
                                            onClick={() => restoreItem(item.id)}
                                          >
                                            <RotateCcw className="h-3.5 w-3.5" />
                                          </button>
                                        ) : (
                                          <label
                                            className="site-src-switch"
                                            title={item.enabled ? 'Affichée' : 'Masquée'}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={item.enabled}
                                              disabled={!canEdit}
                                              onChange={(e) =>
                                                updateItem(item.id, {
                                                  enabled: e.target.checked,
                                                })
                                              }
                                            />
                                            <i aria-hidden />
                                          </label>
                                        )}
                                      </td>
                                      <td className="is-title" data-label="Titre">
                                        <button
                                          type="button"
                                          className="site-collected-title-btn"
                                          onClick={() =>
                                            setExpandedId(open ? null : item.id)
                                          }
                                          aria-expanded={open}
                                        >
                                          <strong>{item.title || 'Sans titre'}</strong>
                                          <ChevronDown
                                            className={cn(
                                              'site-collected-item__chev',
                                              open && 'is-open'
                                            )}
                                            aria-hidden
                                          />
                                        </button>
                                      </td>
                                      <td data-label="Publication" title={published.title}>
                                        <span className="site-collected-date">{published.label}</span>
                                      </td>
                                      <td data-label="En ligne" title={platformPublished.title}>
                                        <span
                                          className={cn(
                                            'site-collected-date',
                                            platformPublished.isLive
                                              ? 'text-emerald-700 font-semibold'
                                              : 'text-slate-400 font-normal'
                                          )}
                                        >
                                          {platformPublished.label}
                                        </span>
                                      </td>
                                      <td data-label="Statut">
                                        <span
                                          className={cn(
                                            'site-src-badge',
                                            inTrash
                                              ? 'is-trash'
                                              : item.enabled
                                                ? 'is-active'
                                                : 'is-inactive'
                                          )}
                                        >
                                          {inTrash
                                            ? 'Corbeille'
                                            : item.enabled
                                              ? 'Affichée'
                                              : 'Masquée'}
                                        </span>
                                      </td>
                                      <td className="is-actions" data-label="Actions">
                                        <div className="site-collected-item__actions">
                                          <a
                                            href={`/actualites/${encodeURIComponent(item.id)}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="site-src-icon-btn"
                                            aria-label="Voir l'article sur la plateforme"
                                            title="Voir l'article sur la plateforme"
                                          >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                          </a>
                                          {inTrash ? (
                                            <>
                                              <button
                                                type="button"
                                                className="site-src-icon-btn"
                                                disabled={!canEdit}
                                                aria-label="Restaurer"
                                                title="Restaurer"
                                                onClick={() => restoreItem(item.id)}
                                              >
                                                <RotateCcw className="h-3.5 w-3.5" />
                                              </button>
                                              <button
                                                type="button"
                                                className="site-src-icon-btn is-danger"
                                                disabled={!canEdit}
                                                aria-label="Supprimer définitivement"
                                                title="Supprimer définitivement"
                                                onClick={() =>
                                                  setConfirm({
                                                    mode: 'purge',
                                                    id: item.id,
                                                    title: item.title || 'Sans titre',
                                                  })
                                                }
                                              >
                                                <Trash2 className="h-3.5 w-3.5" />
                                              </button>
                                            </>
                                          ) : (
                                            <button
                                              type="button"
                                              className="site-src-icon-btn is-danger"
                                              disabled={!canEdit}
                                              aria-label="Mettre en corbeille"
                                              title="Mettre en corbeille"
                                              onClick={() =>
                                                setConfirm({
                                                  mode: 'archive',
                                                  id: item.id,
                                                  title: item.title || 'Sans titre',
                                                })
                                              }
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                    {open ? (
                                      <tr className="is-detail">
                                        <td colSpan={7}>
                                          <div className="site-collected-item__details">
                                            {!inTrash ? (
                                              <div className="site-collected-edit-cta">
                                                <div>
                                                  <strong>{group.label}</strong>
                                                  <p>Le titre, le chapô, la catégorie et le contenu se modifient dans l’éditeur.</p>
                                                </div>
                                                {canEdit ? (
                                                  <Link
                                                    href={`/dg/collected/edit?id=${encodeURIComponent(item.id)}`}
                                                    className="site-btn site-btn-primary site-btn-sm"
                                                  >
                                                    <PenLine className="h-3.5 w-3.5" aria-hidden />
                                                    Modifier l’alerte
                                                  </Link>
                                                ) : null}
                                              </div>
                                            ) : null}
                                            <div className="site-collected-detail-grid">
                                              <div className="site-collected-detail">
                                                <span>Lien de référence</span>
                                                <p className="site-collected-detail__url">
                                                  {item.url.startsWith('http') ? (
                                                    <a
                                                      href={item.url}
                                                      target="_blank"
                                                      rel="noreferrer"
                                                    >
                                                      {item.url}
                                                    </a>
                                                  ) : (
                                                    item.url || '—'
                                                  )}
                                                </p>
                                              </div>
                                              <div className="site-collected-detail">
                                                <span>Catégorie</span>
                                                <p>{group.label}</p>
                                              </div>
                                              <div className="site-collected-detail">
                                                <span>
                                                  <CalendarDays
                                                    className="h-3 w-3"
                                                    aria-hidden
                                                  />{' '}
                                                  Date de publication
                                                </span>
                                                <p title={published.title}>{published.label}</p>
                                              </div>
                                              <div className="site-collected-detail">
                                                <span>
                                                  <CalendarDays
                                                    className="h-3 w-3"
                                                    aria-hidden
                                                  />{' '}
                                                  Publiée sur la plateforme
                                                </span>
                                                <p title={platformPublished.title}>
                                                  {platformPublished.isLive ? (
                                                    <strong className="text-emerald-700">
                                                      {platformPublished.label}
                                                    </strong>
                                                  ) : (
                                                    <span className="text-slate-400">Non publiée</span>
                                                  )}
                                                </p>
                                              </div>
                                              <div className="site-collected-detail">
                                                <span>Catégorie affichée</span>
                                                <div className="site-collected-detail-themes">
                                                  {themes.map((theme) => (
                                                    <span key={theme}>{theme}</span>
                                                  ))}
                                                </div>
                                              </div>
                                              <div className="site-collected-detail">
                                                <span>Visibilité front</span>
                                                <p>
                                                  <span
                                                    className={cn(
                                                      'site-src-badge',
                                                      inTrash
                                                        ? 'is-trash'
                                                        : item.enabled
                                                          ? 'is-active'
                                                          : 'is-inactive'
                                                    )}
                                                  >
                                                    {inTrash
                                                      ? 'Corbeille'
                                                      : item.enabled
                                                        ? 'Affichée'
                                                        : 'Masquée'}
                                                  </span>
                                                  <span className="site-collected-visibility-hint">
                                                    {inTrash
                                                      ? 'Absente du site public'
                                                      : item.enabled
                                                        ? 'Visible sur Actualités et Alertes'
                                                        : 'Masquée du site public'}
                                                  </span>
                                                </p>
                                              </div>
                                            </div>
                                            <div className="site-collected-item__detail-actions">
                                              {inTrash ? (
                                                <button
                                                  type="button"
                                                  className="site-btn site-btn-primary site-btn-sm site-collected-detail-btn"
                                                  disabled={!canEdit}
                                                  onClick={() => restoreItem(item.id)}
                                                >
                                                  <RotateCcw
                                                    className="h-3.5 w-3.5"
                                                    aria-hidden
                                                  />
                                                  Restaurer
                                                </button>
                                              ) : (
                                                <button
                                                  type="button"
                                                  className="site-btn site-btn-ghost site-btn-sm site-collected-detail-btn"
                                                  disabled={!canEdit}
                                                  onClick={() =>
                                                    updateItem(item.id, {
                                                      enabled: !item.enabled,
                                                    })
                                                  }
                                                >
                                                  {item.enabled ? (
                                                    <>
                                                      <EyeOff
                                                        className="h-3.5 w-3.5"
                                                        aria-hidden
                                                      />
                                                      Masquer sur le site
                                                    </>
                                                  ) : (
                                                    <>
                                                      <Eye
                                                        className="h-3.5 w-3.5"
                                                        aria-hidden
                                                      />
                                                      Afficher sur le site
                                                    </>
                                                  )}
                                                </button>
                                              )}
                                              <a
                                                href={`/actualites/${encodeURIComponent(item.id)}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="site-btn site-btn-ghost site-btn-sm site-collected-detail-btn"
                                              >
                                                <ExternalLink
                                                  className="h-3.5 w-3.5"
                                                  aria-hidden
                                                />
                                                Voir sur la plateforme
                                              </a>
                                              {item.url.startsWith('http') ? (
                                                <a
                                                  href={item.url}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="site-btn site-btn-ghost site-btn-sm site-collected-detail-btn"
                                                >
                                                  <ExternalLink
                                                    className="h-3.5 w-3.5"
                                                    aria-hidden
                                                  />
                                                  Lien de référence
                                                </a>
                                              ) : null}
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    ) : null}
                                  </Fragment>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : null}
                    </section>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      ) : null}

      <AdminConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={
          confirm?.mode === 'purge'
            ? 'Supprimer définitivement ?'
            : 'Mettre en corbeille ?'
        }
        message={
          confirm?.mode === 'purge'
            ? `« ${confirm.title} » sera définitivement retirée de l’historique. Cette action est irréversible.`
            : `« ${confirm?.title ?? ''} » sera déplacée dans la corbeille. Vous pourrez la restaurer ensuite.`
        }
        confirmLabel={
          confirm?.mode === 'purge' ? 'Supprimer définitivement' : 'Mettre en corbeille'
        }
        intent="destructive"
        onConfirm={() => {
          if (!confirm) return
          if (confirm.mode === 'purge') purgeItem(confirm.id)
          else archiveItem(confirm.id)
        }}
      />
    </SiteShell>
  )
}
