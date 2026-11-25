'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  ArchiveRestore,
  ArrowUp,
  BarChart3,
  Calendar,
  ChevronDown,
  ExternalLink,
  Eye,
  EyeOff,
  Files,
  MoreHorizontal,
  Plus,
  Power,
  PowerOff,
  Search,
  SquarePen,
  Trash2,
  X,
} from 'lucide-react'
import Link from 'next/link'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AdminConfirmDialog } from '@/components/admin/admin-confirm-dialog'
import { sitePageEditHref } from '@/components/admin/site/site-page-workspace'
import { SiteShell } from '@/components/admin/site/site-shell'
import { useSiteEditor } from '@/components/admin/site/use-site-editor'
import { DG_SITE_ROUTES } from '@/lib/dg/site-routes'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/hooks/use-toast'
import { archiveNow, isArchivedFlag } from '@/lib/site/news-sources'
import type { SitePage } from '@/lib/site/types'
import { cn } from '@/lib/utils'
import '@/components/admin/site/site-admin.css'

/** Pages catalogue présentes mais non éditoriales (UI métier / réglages dédiés). */
const NON_EDITORIAL_PATHS = new Set(['/signalement', '/contacts', '/recherche', '/actualites'])

const NON_EDITORIAL_HINT: Record<string, string> = {
  '/signalement': 'Formulaire métier — contenu non édité ici',
  '/contacts': 'Coordonnées via /dg/contact',
  '/recherche': 'Moteur de recherche — shell figé',
  '/actualites': 'Archive gérée via Actualités / Collected',
}

/** Palette alignée sur `--pages-c-*` dans site-admin.css */
const CONTENT_COLORS = {
  pdf: '#1d4ed8',
  lead: '#7c3aed',
  body: '#0891b2',
} as const

const ATTENTION_COLORS = {
  draft: '#ea580c',
  noLead: '#b45309',
  noBody: '#0891b2',
  noImage: '#1f6b42',
} as const

type StatusFilter = 'all' | 'published' | 'draft' | 'trash'
type ConfirmState =
  | { mode: 'archive'; page: SitePage }
  | { mode: 'purge'; page: SitePage }
  | { mode: 'archive-selected'; paths: string[] }
  | { mode: 'purge-selected'; paths: string[] }
  | { mode: 'empty' }
  | null

function formatPageCreatedAt(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return {
    date: date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    time: date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }
}

function countLabel(count: number, one: string, many: string) {
  return `${count} ${count > 1 ? many : one}`
}

export function SitePagesEditor() {
  const { site, setSite, loading, saving, dirty, canEdit, save } = useSiteEditor()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [showInsights, setShowInsights] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
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

  const pages = site?.pages ?? []
  const livePages = useMemo(() => pages.filter((page) => !isArchivedFlag(page)), [pages])
  const trashPages = useMemo(() => pages.filter((page) => isArchivedFlag(page)), [pages])
  const inTrash = status === 'trash'

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const pool = inTrash ? trashPages : livePages
    // Dernière ajoutée en tête : l’ordre de stockage est chronologique (push en fin).
    return [...pool].reverse().filter((page) => {
      if (status === 'published' && !page.published) return false
      if (status === 'draft' && page.published) return false
      if (!needle) return true
      return `${page.title} ${page.path} ${page.lead}`.toLowerCase().includes(needle)
    })
  }, [livePages, trashPages, inTrash, query, status])

  useEffect(() => {
    setSelected([])
  }, [status, query])

  const selectedInView = filtered.filter((page) => selected.includes(page.path))
  const allInViewSelected = filtered.length > 0 && selectedInView.length === filtered.length
  const someInViewSelected = selectedInView.length > 0 && !allInViewSelected

  const stats = useMemo(() => {
    const published = livePages.filter((page) => page.published).length
    const draft = livePages.length - published
    const withDocs = livePages.filter(
      (page) => page.extensions?.documents && (page.documents?.length ?? 0) > 0
    ).length
    const docsTotal = livePages.reduce(
      (sum, page) => sum + (page.extensions?.documents ? page.documents?.length ?? 0 : 0),
      0
    )
    const withLead = livePages.filter((page) => Boolean(page.lead?.trim())).length
    const withBody = livePages.filter((page) =>
      Boolean(page.body?.replace(/<[^>]+>/g, '').trim())
    ).length
    const withImage = livePages.filter((page) => Boolean(page.featuredImage?.trim())).length
    const noLead = livePages.length - withLead
    const noBody = livePages.length - withBody
    const noImage = livePages.length - withImage
    const total = livePages.length || 1
    const richnessScore = livePages.length
      ? Math.round(((withDocs + withLead + withBody) / (livePages.length * 3)) * 100)
      : 0

    const attentionRows = [
      {
        key: 'draft',
        label: 'Masquées',
        value: draft,
        pct: Math.round((draft / total) * 100),
        color: ATTENTION_COLORS.draft,
      },
      {
        key: 'no-lead',
        label: 'Sans introduction',
        value: noLead,
        pct: Math.round((noLead / total) * 100),
        color: ATTENTION_COLORS.noLead,
      },
      {
        key: 'no-body',
        label: 'Sans contenu',
        value: noBody,
        pct: Math.round((noBody / total) * 100),
        color: ATTENTION_COLORS.noBody,
      },
      {
        key: 'no-image',
        label: 'Sans image',
        value: noImage,
        pct: Math.round((noImage / total) * 100),
        color: ATTENTION_COLORS.noImage,
      },
    ]

    const attentionTotal = draft + noLead + noBody + noImage

    return {
      total: livePages.length,
      published,
      draft,
      trash: trashPages.length,
      withDocs,
      docsTotal,
      withImage,
      richnessScore,
      attentionTotal,
      attentionRows,
      contentBars: [
        {
          name: 'PDF',
          value: Math.round((withDocs / total) * 100),
          count: withDocs,
          fill: CONTENT_COLORS.pdf,
        },
        {
          name: 'Introduction',
          value: Math.round((withLead / total) * 100),
          count: withLead,
          fill: CONTENT_COLORS.lead,
        },
        {
          name: 'Contenu',
          value: Math.round((withBody / total) * 100),
          count: withBody,
          fill: CONTENT_COLORS.body,
        },
      ],
    }
  }, [livePages, trashPages])

  const setPages = (next: SitePage[]) => {
    if (!site) return
    setSite({ ...site, pages: next })
  }

  const togglePublished = (page: SitePage) => {
    if (isArchivedFlag(page)) return
    setPages(
      pages.map((item) =>
        item.path === page.path ? { ...item, published: !item.published } : item
      )
    )
    toast({
      title: page.published ? 'Page désactivée' : 'Page publiée',
      description: page.published
        ? `« ${page.title} » est masquée sur le site.`
        : `« ${page.title} » est visible sur le site.`,
    })
  }

  const archivePage = (page: SitePage) => {
    if (!canEdit) return
    setPages(
      pages.map((item) =>
        item.path === page.path
          ? {
              ...item,
              archived: true,
              archivedAt: archiveNow(),
              published: false,
            }
          : item
      )
    )
    toast({
      title: 'Page mise en corbeille',
      description: 'Conservée 3 mois — enregistrez pour publier.',
    })
    setConfirm(null)
  }

  const restorePage = (page: SitePage) => {
    if (!canEdit) return
    setPages(
      pages.map((item) =>
        item.path === page.path
          ? { ...item, archived: false, archivedAt: null }
          : item
      )
    )
    setStatus('all')
    toast({ title: 'Page restaurée', description: 'Enregistrez pour publier.' })
  }

  const purgePage = (page: SitePage) => {
    if (!canEdit) return
    setPages(pages.filter((item) => item.path !== page.path))
    toast({
      title: 'Page supprimée définitivement',
      description: `« ${page.title} » a été retirée.`,
    })
    setConfirm(null)
  }

  const emptyTrash = () => {
    if (!canEdit) return
    setPages(pages.filter((page) => !isArchivedFlag(page)))
    toast({ title: 'Corbeille vidée' })
    setConfirm(null)
  }

  const handleConfirm = () => {
    if (!confirm) return
    if (confirm.mode === 'archive') archivePage(confirm.page)
    else if (confirm.mode === 'purge') purgePage(confirm.page)
    else if (confirm.mode === 'archive-selected') archiveSelected(confirm.paths)
    else if (confirm.mode === 'purge-selected') purgeSelected(confirm.paths)
    else emptyTrash()
  }

  const toggleSelected = (path: string) => {
    setSelected((current) =>
      current.includes(path) ? current.filter((item) => item !== path) : [...current, path]
    )
  }

  const toggleAllInView = () => {
    const paths = filtered.map((page) => page.path)
    setSelected((current) => {
      if (paths.every((path) => current.includes(path))) {
        return current.filter((path) => !paths.includes(path))
      }
      return [...new Set([...current, ...paths])]
    })
  }

  const publishSelected = (published: boolean) => {
    if (!canEdit) return
    const paths = new Set(selectedInView.map((page) => page.path))
    setPages(
      pages.map((item) =>
        paths.has(item.path) && !isArchivedFlag(item) ? { ...item, published } : item
      )
    )
    setSelected([])
    toast({
      title: published ? 'Pages publiées' : 'Pages masquées',
      description: `${paths.size} page${paths.size > 1 ? 's' : ''}. Enregistrez pour publier.`,
    })
  }

  const archiveSelected = (paths: string[]) => {
    if (!canEdit) return
    const chosen = new Set(paths)
    setPages(
      pages.map((item) =>
        chosen.has(item.path)
          ? { ...item, archived: true, archivedAt: archiveNow(), published: false }
          : item
      )
    )
    setSelected([])
    setConfirm(null)
    toast({
      title: 'Pages mises en corbeille',
      description: `${chosen.size} page${chosen.size > 1 ? 's' : ''} — enregistrez pour publier.`,
    })
  }

  const restoreSelected = () => {
    if (!canEdit) return
    const paths = new Set(selectedInView.map((page) => page.path))
    setPages(
      pages.map((item) =>
        paths.has(item.path) ? { ...item, archived: false, archivedAt: null } : item
      )
    )
    setSelected([])
    setStatus('all')
    toast({
      title: 'Pages restaurées',
      description: `${paths.size} page${paths.size > 1 ? 's' : ''}. Enregistrez pour publier.`,
    })
  }

  const purgeSelected = (paths: string[]) => {
    if (!canEdit) return
    const chosen = new Set(paths)
    setPages(pages.filter((item) => !chosen.has(item.path)))
    setSelected([])
    setConfirm(null)
    toast({
      title: 'Pages supprimées définitivement',
      description: `${chosen.size} page${chosen.size > 1 ? 's' : ''}.`,
    })
  }

  return (
    <SiteShell
      title="Pages"
      description="Bibliothèque du site public — création, édition, publication."
      canEdit={canEdit}
      dirty={dirty}
      saving={saving}
      loading={loading}
      onSave={save}
      previewHref="/"
    >
      <div className="site-pages-pro">
        <section
          className={cn('site-pages-insights', showInsights && 'is-open')}
          aria-label="Indicateurs éditoriaux"
        >
          <div className="site-pages-insights__bar">
            <div className="site-pages-insights__identity">
              <span className="site-pages-insights__mark" aria-hidden>
                <BarChart3 className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="site-pages-insights__eyebrow">Pilotage éditorial</p>
                <h2 className="site-pages-insights__title">Indicateurs de qualité</h2>
              </div>
            </div>

            <div className="site-pages-insights__meta">
              <span className="site-pages-insights__chip">
                <strong>{stats.total}</strong> pages
              </span>
            </div>

            <button
              type="button"
              className="site-pages-insights__toggle"
              aria-expanded={showInsights}
              aria-controls="site-pages-insights-panel"
              onClick={() => setShowInsights((open) => !open)}
            >
              {showInsights ? 'Masquer' : 'Afficher'}
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>

          <div
            id="site-pages-insights-panel"
            className="site-pages-insights__panel"
            hidden={!showInsights}
          >
            <div className="site-pages-analytics site-pages-analytics--pro">
              <article className="site-pages-pro-card site-pages-pro-card--attention">
                <header className="site-pages-pro-card__head">
                  <div>
                    <p className="site-pages-pro-card__eyebrow">Suivi éditorial</p>
                    <h3>Points d’attention</h3>
                  </div>
                </header>

                {stats.total === 0 ? (
                  <p className="site-pages-chart-empty">Aucune donnée à afficher.</p>
                ) : (
                  <div className="site-pages-pro-groups">
                    <div className="site-pages-pro-groups__summary">
                      <strong>{stats.total}</strong>
                      <span>pages au catalogue</span>
                      <em>
                        {stats.withImage} avec image · {stats.docsTotal} PDF
                      </em>
                    </div>
                    <div className="site-pages-pro-tracks">
                      {stats.attentionRows.map((row) => (
                        <div key={row.key} className="site-pages-pro-track">
                          <div className="site-pages-pro-track__meta">
                            <span>
                              <i style={{ background: row.color }} />
                              {row.label}
                            </span>
                            <b>
                              {row.value}
                              <em>{row.pct}%</em>
                            </b>
                          </div>
                          <div className="site-pages-pro-track__rail" aria-hidden>
                            <span
                              style={
                                {
                                  width: `${row.pct}%`,
                                  '--track-color': row.color,
                                } as CSSProperties
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>

              <article className="site-pages-pro-card site-pages-pro-card--richness">
                <header className="site-pages-pro-card__head">
                  <div>
                    <p className="site-pages-pro-card__eyebrow">Qualité éditoriale</p>
                    <h3>Richesse du contenu</h3>
                  </div>
                </header>

                {stats.total === 0 ? (
                  <p className="site-pages-chart-empty">Aucune donnée à afficher.</p>
                ) : (
                  <div className="site-pages-pro-columns">
                    <div className="site-pages-pro-columns__chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={stats.contentBars}
                          margin={{ top: 4, right: 4, left: -12, bottom: -4 }}
                          barCategoryGap="32%"
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e8eef5" vertical={false} />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 10, fontWeight: 650, fill: '#334155' }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            domain={[0, 100]}
                            tick={{ fontSize: 9, fill: '#94a3b8' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value: number) => `${value}%`}
                            width={30}
                          />
                          <RechartsTooltip
                            cursor={{ fill: 'rgb(29 78 216 / 0.05)' }}
                            formatter={(value: number, _name, item) => [
                              `${value} % · ${item?.payload?.count ?? 0}/${stats.total} page(s)`,
                              String(item?.payload?.name ?? ''),
                            ]}
                          />
                          <Bar dataKey="value" radius={[6, 6, 3, 3]} maxBarSize={34}>
                            {stats.contentBars.map((entry) => (
                              <Cell key={entry.name} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </article>
            </div>
          </div>
        </section>

        <section className="site-card site-pages-list">
          <header className="site-card-head">
            <div className="site-pages-list__top">
              <div className="site-pages-list__identity">
                <span className="site-pages-list__mark" aria-hidden>
                  <Files />
                </span>
                <div>
                  <h2>Liste des pages</h2>
                  {inTrash ? (
                    <p className="site-pages-list__stats">
                      <span className="site-pages-stat is-trash">
                        {countLabel(stats.trash, 'page en corbeille', 'pages en corbeille')}
                      </span>
                    </p>
                  ) : (
                    <p className="site-pages-list__stats">
                      <span className="site-pages-stat is-on">
                        {countLabel(stats.published, 'publiée', 'publiées')}
                      </span>
                      <span className="site-pages-stat is-off">
                        {countLabel(stats.draft, 'masquée', 'masquées')}
                      </span>
                    </p>
                  )}
                </div>
              </div>
              {inTrash ? (
                <button
                  type="button"
                  className="site-btn site-btn-sm site-pages-empty-trash-btn"
                  disabled={!canEdit || trashPages.length === 0}
                  onClick={() => setConfirm({ mode: 'empty' })}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Vider la corbeille
                </button>
              ) : canEdit ? (
                <Link href={DG_SITE_ROUTES.pagesNew} className="site-btn site-btn-primary site-btn-sm">
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Nouvelle page
                </Link>
              ) : (
                <button type="button" className="site-btn site-btn-primary site-btn-sm" disabled>
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Nouvelle page
                </button>
              )}
            </div>
            <div className="site-pages-toolbar">
              <label className="site-menu-search">
                <Search className="h-3.5 w-3.5" aria-hidden />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Rechercher un titre ou une URL…"
                  aria-label="Rechercher une page"
                />
                {query ? (
                  <button
                    type="button"
                    className="site-pages-search-clear"
                    aria-label="Effacer la recherche"
                    onClick={() => setQuery('')}
                  >
                    <X aria-hidden />
                  </button>
                ) : null}
              </label>
              <div className="site-menu-chips site-pages-chips" role="tablist" aria-label="Filtrer par statut">
                {(
                  [
                    ['all', 'Toutes', livePages.length],
                    ['published', 'Publiées', stats.published],
                    ['draft', 'Masquées', stats.draft],
                    ['trash', 'Corbeille', stats.trash],
                  ] as const
                ).map(([value, label, count]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={status === value}
                    className={cn(
                      'site-menu-chip',
                      `site-pages-chip--${value}`,
                      value === 'trash' && 'is-trash',
                      status === value && 'is-active'
                    )}
                    onClick={() => setStatus(value)}
                  >
                    {value === 'published' ? <Eye aria-hidden /> : null}
                    {value === 'draft' ? <EyeOff aria-hidden /> : null}
                    {value === 'trash' ? <Trash2 aria-hidden /> : null}
                    {label}
                    <span className="site-pages-chip-count">{count}</span>
                  </button>
                ))}
              </div>
            </div>
          </header>
          <div className="site-card-body">

          {canEdit && selectedInView.length > 0 ? (
            <div className="site-pages-bulk">
              <span>
                {selectedInView.length} sélectionnée{selectedInView.length > 1 ? 's' : ''}
              </span>
              <button type="button" onClick={() => setSelected([])}>
                Annuler
              </button>
              {inTrash ? (
                <>
                  <button type="button" onClick={restoreSelected}>
                    Restaurer
                  </button>
                  <button
                    type="button"
                    className="is-danger"
                    onClick={() =>
                      setConfirm({
                        mode: 'purge-selected',
                        paths: selectedInView.map((page) => page.path),
                      })
                    }
                  >
                    Supprimer
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => publishSelected(true)}>
                    Publier
                  </button>
                  <button type="button" onClick={() => publishSelected(false)}>
                    Masquer
                  </button>
                  <button
                    type="button"
                    className="is-danger"
                    onClick={() =>
                      setConfirm({
                        mode: 'archive-selected',
                        paths: selectedInView.map((page) => page.path),
                      })
                    }
                  >
                    Corbeille
                  </button>
                </>
              )}
            </div>
          ) : null}

          <div className="admin-users-page">
          <div className="admin-table-shell admin-users-table-shell site-pages-table-shell">
            <div className="overflow-x-auto">
            <table className="admin-users-table admin-table w-full border-collapse">
              <thead>
                <tr className="admin-table-head">
                  {canEdit ? (
                    <th className="site-pages-col-check" scope="col">
                      <label className="site-pages-check">
                        <input
                          type="checkbox"
                          checked={allInViewSelected}
                          ref={(node) => {
                            if (node) node.indeterminate = someInViewSelected
                          }}
                          onChange={toggleAllInView}
                          disabled={filtered.length === 0}
                          aria-label="Sélectionner toutes les pages affichées"
                        />
                        <span />
                      </label>
                    </th>
                  ) : null}
                  <th className="site-pages-col-num" scope="col">
                    #
                  </th>
                  <th>Page</th>
                  <th>URL</th>
                  <th>Date / heure</th>
                  <th>Statut</th>
                  <th className="admin-users-actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 7 : 6} className="site-pages-empty-cell">
                      {inTrash
                        ? 'La corbeille est vide.'
                        : 'Aucune page ne correspond aux filtres.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((page, index) => {
                    const created = formatPageCreatedAt(page.createdAt)
                    const lead = page.lead?.trim()
                    const showLead = Boolean(lead && lead.toLowerCase() !== page.title.trim().toLowerCase())
                    return (
                    <tr
                      key={page.path}
                      className={cn(
                        'admin-table-row',
                        !page.published && !inTrash && 'is-disabled',
                        inTrash && 'is-trash',
                        selected.includes(page.path) && 'is-selected'
                      )}
                    >
                      {canEdit ? (
                        <td className="site-pages-col-check" data-label="Sélection">
                          <label className="site-pages-check">
                            <input
                              type="checkbox"
                              checked={selected.includes(page.path)}
                              onChange={() => toggleSelected(page.path)}
                              aria-label={`Sélectionner ${page.title}`}
                            />
                            <span />
                          </label>
                        </td>
                      ) : null}
                      <td className="site-pages-col-num" data-label="N°">
                        <span className="site-pages-row-num">{index + 1}</span>
                      </td>
                      <td className="site-pages-col-page" data-label="Page">
                        <div className="site-pages-title">
                          <strong>{page.title}</strong>
                          {showLead ? <span>{lead}</span> : null}
                          {page.extensions?.layout === 'videos' ||
                          page.extensions?.layout === 'resources' ||
                          (page.extensions?.documents && (page.documents?.length ?? 0) > 0) ||
                          NON_EDITORIAL_PATHS.has(page.path) ? (
                            <div className="site-pages-tags">
                              {page.extensions?.layout === 'videos' ? (
                                <span className="site-pages-doc-badge" title="Médiathèque vidéo">
                                  Vidéos
                                </span>
                              ) : null}
                              {page.extensions?.layout === 'resources' ? (
                                <span className="site-pages-doc-badge" title="Ressources PDF">
                                  PDF
                                  {(page.documents?.length ?? 0) > 0
                                    ? ` ${page.documents?.length}`
                                    : ''}
                                </span>
                              ) : null}
                              {page.extensions?.layout !== 'resources' &&
                              page.extensions?.documents &&
                              (page.documents?.length ?? 0) > 0 ? (
                                <span className="site-pages-doc-badge" title="Documents PDF">
                                  PDF {page.documents?.length ?? 0}
                                </span>
                              ) : null}
                              {NON_EDITORIAL_PATHS.has(page.path) ? (
                                <span
                                  className="site-pages-doc-badge is-app"
                                  title={NON_EDITORIAL_HINT[page.path] || 'Page applicative'}
                                >
                                  App
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                          {NON_EDITORIAL_PATHS.has(page.path) ? (
                            <em className="site-pages-app-hint">
                              {NON_EDITORIAL_HINT[page.path] ||
                                'Page applicative — édition limitée'}
                            </em>
                          ) : null}
                        </div>
                      </td>
                      <td data-label="URL">
                        <span className="site-pages-path">{page.path}</span>
                      </td>
                      <td data-label="Date / heure">
                        {created ? (
                          <time
                            className="site-pages-slot"
                            dateTime={page.createdAt || undefined}
                            title={new Date(page.createdAt || '').toLocaleString('fr-FR')}
                          >
                            <Calendar aria-hidden />
                            <span>
                              <b>{created.date}</b>
                              <small>{created.time}</small>
                            </span>
                          </time>
                        ) : (
                          <span className="site-pages-slot is-empty">—</span>
                        )}
                      </td>
                      <td data-label="Statut">
                        {inTrash ? (
                          <span className="admin-status-inactive">En corbeille</span>
                        ) : page.published ? (
                          <span className="admin-status-active">Publiée</span>
                        ) : (
                          <span className="admin-status-inactive">Masquée</span>
                        )}
                      </td>
                      <td className="admin-users-actions-col" data-label="Actions">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="site-pages-more" aria-label={`Actions pour ${page.title}`}>
                            <MoreHorizontal aria-hidden />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="site-pages-more-menu">
                            {inTrash ? (
                              <>
                                <DropdownMenuItem disabled={!canEdit} onSelect={() => restorePage(page)}>
                                  <ArchiveRestore /> Restaurer
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  disabled={!canEdit}
                                  onSelect={() => setConfirm({ mode: 'purge', page })}
                                >
                                  <Trash2 /> Supprimer définitivement
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuItem asChild>
                                  <Link href={page.path} target="_blank" rel="noreferrer">
                                    <ExternalLink /> Voir sur le site
                                  </Link>
                                </DropdownMenuItem>
                                {canEdit ? (
                                  <DropdownMenuItem asChild>
                                    <Link href={sitePageEditHref(page.path)}>
                                      <SquarePen /> Modifier
                                    </Link>
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem disabled>
                                    <SquarePen /> Modifier
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem disabled={!canEdit} onSelect={() => togglePublished(page)}>
                                  {page.published ? <PowerOff /> : <Power />}
                                  {page.published ? 'Masquer' : 'Publier'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  disabled={!canEdit}
                                  onSelect={() => setConfirm({ mode: 'archive', page })}
                                >
                                  <Trash2 /> Mettre en corbeille
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                    )
                  })
                )}
              </tbody>
            </table>
            </div>
            <p className="admin-users-table-footer">
              <strong>{filtered.length}</strong>
              {' '}
              page{filtered.length > 1 ? 's' : ''}
              {filtered.length !== (inTrash ? trashPages.length : livePages.length)
                ? ` (sur ${inTrash ? trashPages.length : livePages.length})`
                : ''}
              {inTrash ? ' · Corbeille' : ' · Actives'}
            </p>
          </div>
          </div>
          </div>
        </section>
      </div>

      <AdminConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null)
        }}
        title={
          confirm?.mode === 'empty'
            ? 'Vider la corbeille ?'
            : confirm?.mode === 'purge' || confirm?.mode === 'purge-selected'
              ? 'Supprimer définitivement ?'
              : 'Mettre en corbeille ?'
        }
        message={
          confirm?.mode === 'empty'
            ? 'Toutes les pages en corbeille seront effacées définitivement.'
            : confirm?.mode === 'purge' && confirm.page
              ? `« ${confirm.page.title} » (${confirm.page.path}) sera définitivement retirée.`
              : confirm?.mode === 'archive' && confirm.page
                ? `« ${confirm.page.title} » (${confirm.page.path}) sera archivée 3 mois. Vous pourrez la restaurer depuis la corbeille.`
                : confirm?.mode === 'archive-selected'
                  ? `${countLabel(confirm.paths.length, 'page sera archivée 3 mois.', 'pages seront archivées 3 mois.')} Vous pourrez les restaurer depuis la corbeille.`
                  : confirm?.mode === 'purge-selected'
                    ? `${countLabel(confirm.paths.length, 'page sera définitivement retirée.', 'pages seront définitivement retirées.')}`
                    : ''
        }
        confirmLabel={
          confirm?.mode === 'empty'
            ? 'Vider'
            : confirm?.mode === 'purge' || confirm?.mode === 'purge-selected'
              ? 'Supprimer'
              : 'Mettre en corbeille'
        }
        cancelLabel="Annuler"
        intent="destructive"
        onConfirm={handleConfirm}
      />
      <button
        type="button"
        className={cn('site-pages-lift', showLift && 'is-visible')}
        aria-label="Remonter en haut"
        tabIndex={showLift ? 0 : -1}
        onClick={liftToTop}
      >
        <ArrowUp aria-hidden />
        <span>Haut</span>
      </button>
    </SiteShell>
  )
}
