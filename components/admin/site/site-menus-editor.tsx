'use client'

import { useEffect, useMemo, useState, type CSSProperties, type ReactElement } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookMarked,
  BookOpen,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Compass,
  Copy,
  Eye,
  FileText,
  GraduationCap,
  Headset,
  History,
  Landmark,
  Lightbulb,
  Link2,
  ListTree,
  Megaphone,
  Menu,
  Newspaper,
  Plus,
  Power,
  PowerOff,
  Radar,
  RotateCcw,
  Scale,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
  SquarePen,
  Trash2,
  User,
  Users,
} from 'lucide-react'

const MEGA_PREVIEW_ICONS: Record<string, typeof Shield> = {
  presentation: Landmark,
  missions: Shield,
  equipe: Users,
  historique: History,
  incidents: ShieldAlert,
  veille: Radar,
  menaces: FileText,
  abonnement: Bell,
  lois: Scale,
  cadres: BookMarked,
  normes: BookOpen,
  audit: ClipboardCheck,
  formation: GraduationCap,
  conseil: Lightbulb,
  assistance: Headset,
  actualites: Newspaper,
  rapports: FileText,
  guides: BookOpen,
  communiques: Megaphone,
  particuliers: User,
  entreprises: Building2,
  institutions: Landmark,
}

function resolveCardIcon(child: SiteMenuChild) {
  if (child.icon && MEGA_PREVIEW_ICONS[child.icon]) {
    return MEGA_PREVIEW_ICONS[child.icon]
  }
  const key = `${child.kicker || ''} ${child.label || ''}`.toLowerCase()
  if (key.includes('instit')) return Landmark
  if (key.includes('mandat') || key.includes('mission')) return Shield
  if (key.includes('gouv') || key.includes('dirige') || key.includes('equip')) return Users
  if (key.includes('mém') || key.includes('hist')) return History
  if (key.includes('loi') || key.includes('regle') || key.includes('cadre')) return Scale
  if (key.includes('inci') || key.includes('alert') || key.includes('urg')) return ShieldAlert
  if (key.includes('form') || key.includes('cours') || key.includes('acad')) return GraduationCap
  if (key.includes('actu') || key.includes('news') || key.includes('publi')) return Newspaper
  if (key.includes('partic')) return User
  if (key.includes('entr') || key.includes('soc')) return Building2
  return Compass
}
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AdminConfirmDialog } from '@/components/admin/admin-confirm-dialog'
import { SiteCard, SiteField, SiteToggle } from '@/components/admin/site/site-fields'
import { SiteShell } from '@/components/admin/site/site-shell'
import { useSiteEditor } from '@/components/admin/site/use-site-editor'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from '@/hooks/use-toast'
import {
  createEmptyChild,
  createEmptyMenu,
  duplicateMenu,
  isMenuArchived,
  archiveTimestamp,
  reorderChildren,
  reorderMenus,
  type SiteMenu,
  type SiteMenuChild,
} from '@/lib/site/menus'
import { cn } from '@/lib/utils'
import '@/components/admin/site/site-admin.css'

const MENU_STATUS_COLORS = {
  active: '#0f766e',
  inactive: '#ea580c',
} as const

type ChildDialogState =
  | { mode: 'create'; menuId: string }
  | { mode: 'edit'; menuId: string; childId: string }
  | null

type ConfirmState =
  | { type: 'archive-menu'; menu: SiteMenu }
  | { type: 'purge-menu'; menu: SiteMenu }
  | { type: 'delete-child'; menu: SiteMenu; child: SiteMenuChild }
  | null

type StatusFilter = 'all' | 'active' | 'inactive' | 'trash'

function emptyChildForm(): Omit<SiteMenuChild, 'id' | 'order' | 'enabled' | 'icon'> & {
  enabled: boolean
} {
  return {
    label: '',
    href: '/',
    description: '',
    kicker: '',
    badge: '',
    enabled: true,
  }
}

type PageUrlOption = {
  label: string
  href: string
  group: string
  published: boolean
}

function PageUrlPicker({
  pages,
  value,
  disabled,
  onPick,
}: {
  pages: PageUrlOption[]
  value?: string
  disabled?: boolean
  onPick: (page: PageUrlOption) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return pages.slice(0, 40)
    return pages
      .filter((page) =>
        `${page.label} ${page.href} ${page.group}`.toLowerCase().includes(needle)
      )
      .slice(0, 40)
  }, [pages, query])

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery('')
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="site-url-picker-btn"
          disabled={disabled || pages.length === 0}
          title="Voir les URLs de pages"
          aria-label="Voir les URLs de pages"
        >
          <ListTree className="h-3.5 w-3.5" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} className="site-url-picker-pop p-0">
        <div className="site-url-picker-pop__head">
          <strong>Pages du site</strong>
          <span>{pages.length} URL</span>
        </div>
        <label className="site-url-picker-pop__search">
          <Search className="h-3.5 w-3.5" aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filtrer titre ou URL…"
            aria-label="Filtrer les URLs"
          />
        </label>
        <div className="site-url-picker-pop__list" role="listbox" aria-label="Liste des URLs">
          {filtered.length === 0 ? (
            <p className="site-url-picker-pop__empty">Aucune page trouvée.</p>
          ) : (
            filtered.map((page) => {
              const active = value === page.href
              return (
                <button
                  key={page.href}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={cn('site-url-picker-pop__item', active && 'is-active')}
                  onClick={() => {
                    onPick(page)
                    setOpen(false)
                    setQuery('')
                  }}
                >
                  <span className="site-url-picker-pop__item-title">
                    {page.label}
                    {!page.published ? <em>Masquée</em> : null}
                    {active ? <Check className="h-3 w-3" aria-hidden /> : null}
                  </span>
                  <small>{page.group}</small>
                  <code>{page.href}</code>
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function ActionTip({
  label,
  children,
}: {
  label: string
  children: ReactElement
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  )
}

export function SiteMenusEditor() {
  const { site, setSite, persistSite, loading, saving, dirty, canEdit, save } = useSiteEditor()
  const [actionBusy, setActionBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [childDialog, setChildDialog] = useState<ChildDialogState>(null)
  const [childForm, setChildForm] = useState(emptyChildForm)
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [showInsights, setShowInsights] = useState(false)

  const menus = site?.menus ?? []
  const pages = site?.pages ?? []
  const inTrash = statusFilter === 'trash'

  const liveMenus = useMemo(
    () => [...menus].filter((menu) => !isMenuArchived(menu)).sort((a, b) => a.order - b.order),
    [menus]
  )

  const trashMenus = useMemo(
    () =>
      [...menus]
        .filter((menu) => isMenuArchived(menu))
        .sort((a, b) => {
          const aAt = a.archivedAt || ''
          const bAt = b.archivedAt || ''
          return bAt.localeCompare(aAt)
        }),
    [menus]
  )

  const pool = inTrash ? trashMenus : liveMenus

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return pool.filter((menu) => {
      if (!inTrash) {
        if (statusFilter === 'active' && !menu.enabled) return false
        if (statusFilter === 'inactive' && menu.enabled) return false
      }
      if (!needle) return true
      const hay = `${menu.label} ${menu.href} ${menu.children.map((c) => c.label).join(' ')}`.toLowerCase()
      return hay.includes(needle)
    })
  }, [pool, query, statusFilter, inTrash])

  const selected = useMemo(
    () => pool.find((menu) => menu.id === selectedId) ?? filtered[0] ?? pool[0] ?? null,
    [pool, filtered, selectedId]
  )

  useEffect(() => {
    if (!pool.length) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !pool.some((menu) => menu.id === selectedId)) {
      setSelectedId(pool[0]!.id)
    }
  }, [pool, selectedId])

  const stats = useMemo(() => {
    const active = liveMenus.filter((m) => m.enabled).length
    const inactive = liveMenus.length - active
    const children = liveMenus.reduce((sum, m) => sum + m.children.length, 0)
    const activeChildren = liveMenus.reduce(
      (sum, m) => sum + m.children.filter((c) => c.enabled).length,
      0
    )
    const mega = liveMenus.filter((m) => m.enabled && m.children.some((c) => c.enabled)).length
    const byMenu = liveMenus.map((menu) => {
      const childCount = menu.children.length
      const activeChildCount = menu.children.filter((c) => c.enabled).length
      const label = menu.label?.trim() || 'Sans titre'
      return {
        name: label,
        short: label.length > 14 ? `${label.slice(0, 12)}…` : label,
        total: childCount,
        activeChildren: activeChildCount,
        inactiveChildren: Math.max(0, childCount - activeChildCount),
        enabled: menu.enabled,
      }
    })

    const activeRate = liveMenus.length
      ? Math.round((active / liveMenus.length) * 100)
      : 0

    return {
      total: liveMenus.length,
      active,
      inactive,
      trash: trashMenus.length,
      children,
      activeChildren,
      mega,
      activeRate,
      byMenu,
      statusRows: [
        {
          key: 'active',
          label: 'Actifs',
          value: active,
          pct: liveMenus.length ? Math.round((active / liveMenus.length) * 100) : 0,
          color: MENU_STATUS_COLORS.active,
        },
        {
          key: 'inactive',
          label: 'Inactifs',
          value: inactive,
          pct: liveMenus.length ? Math.round((inactive / liveMenus.length) * 100) : 0,
          color: MENU_STATUS_COLORS.inactive,
        },
      ],
    }
  }, [liveMenus, trashMenus])

  const pageCatalog = useMemo(
    () =>
      [...pages]
        .filter((page) => !page.archived)
        .sort((a, b) => {
          const byGroup = a.group.localeCompare(b.group, 'fr')
          if (byGroup !== 0) return byGroup
          return a.title.localeCompare(b.title, 'fr')
        })
        .map((page) => ({
          label: page.title,
          href: page.path,
          group: page.group,
          published: page.published,
        })),
    [pages]
  )

  const dialogParentLabel = useMemo(() => {
    if (!childDialog) return ''
    return liveMenus.find((menu) => menu.id === childDialog.menuId)?.label ?? ''
  }, [childDialog, liveMenus])

  /** Remplace les menus live tout en conservant la corbeille. */
  const updateLiveMenus = (nextLive: SiteMenu[]) => {
    if (!site) return
    const normalizedLive = nextLive.map((menu, index) => ({
      ...menu,
      order: index,
      archived: false,
      archivedAt: null as string | null,
    }))
    setSite({ ...site, menus: [...normalizedLive, ...trashMenus] })
  }

  const commitMenus = async (
    next: SiteMenu[],
    success?: { title: string; description?: string }
  ) => {
    if (!site || !canEdit || actionBusy) return false
    const nextSite = { ...site, menus: next }
    setActionBusy(true)
    try {
      const ok = await persistSite(nextSite, { quiet: true })
      if (ok && success) {
        toast({ title: success.title, description: success.description })
      }
      return ok
    } finally {
      setActionBusy(false)
    }
  }

  const commitLiveMenus = async (
    nextLive: SiteMenu[],
    success?: { title: string; description?: string }
  ) => {
    const normalizedLive = nextLive.map((menu, index) => ({
      ...menu,
      order: index,
      archived: false as boolean | undefined,
      archivedAt: null as string | null,
    }))
    return commitMenus([...normalizedLive, ...trashMenus], success)
  }

  const patchSelected = (patch: Partial<SiteMenu>) => {
    if (!selected || inTrash) return
    updateLiveMenus(
      liveMenus.map((menu) => (menu.id === selected.id ? { ...menu, ...patch } : menu))
    )
  }

  const applyPageUrl = (page: PageUrlOption, target: 'href' | 'ctaHref' = 'href') => {
    if (!selected || !canEdit) return
    if (target === 'ctaHref') {
      patchSelected({
        ctaHref: page.href,
        ctaLabel: selected.ctaLabel?.trim() ? selected.ctaLabel : `Découvrir ${page.label}`,
      })
      toast({
        title: 'CTA méga-menu appliqué',
        description: `Bouton d’action lié à ${page.href}.`,
      })
      return
    }
    patchSelected({ href: page.href })
    toast({
      title: 'URL du menu appliquée',
      description: `« ${selected.label || 'Menu'} » pointe vers ${page.href}${
        page.published ? '' : ' (page masquée)'
      }.`,
    })
  }

  const setSelectedEnabled = (enabled: boolean) => {
    if (!selected || inTrash) return
    void commitLiveMenus(
      liveMenus.map((menu) => (menu.id === selected.id ? { ...menu, enabled } : menu)),
      {
        title: enabled ? 'Menu activé' : 'Menu désactivé',
        description: enabled ? 'Visible sur le site public.' : 'Masqué sur le site public.',
      }
    )
  }

  const addMenu = () => {
    if (inTrash) setStatusFilter('all')
    const next = createEmptyMenu(liveMenus.length)
    next.label = 'Nouveau menu'
    updateLiveMenus([...liveMenus, next])
    setSelectedId(next.id)
    toast({ title: 'Menu créé', description: 'Renseignez le libellé puis publiez.' })
  }

  const copyMenu = (menu: SiteMenu) => {
    if (inTrash) return
    const copy = duplicateMenu(menu, liveMenus.length)
    updateLiveMenus([...liveMenus, copy])
    setSelectedId(copy.id)
    toast({ title: 'Menu dupliqué', description: `« ${menu.label} » a été copié.` })
  }

  const toggleMenu = (menu: SiteMenu) => {
    if (inTrash) return
    void commitLiveMenus(
      liveMenus.map((item) =>
        item.id === menu.id ? { ...item, enabled: !item.enabled } : item
      ),
      {
        title: menu.enabled ? 'Menu désactivé' : 'Menu activé',
        description: menu.enabled ? 'Masqué sur le site public.' : 'Visible sur le site public.',
      }
    )
  }

  const moveMenu = (menuId: string, direction: -1 | 1) => {
    if (inTrash) return
    const index = liveMenus.findIndex((menu) => menu.id === menuId)
    if (index < 0) return
    updateLiveMenus(reorderMenus(liveMenus, index, direction))
  }

  const archiveMenu = (menu: SiteMenu) => {
    const nextLive = liveMenus.filter((item) => item.id !== menu.id)
    const archived: SiteMenu = {
      ...menu,
      archived: true,
      archivedAt: archiveTimestamp(),
      enabled: false,
    }
    void commitMenus([...nextLive.map((m, i) => ({ ...m, order: i })), archived], {
      title: 'Menu mis en corbeille',
      description: 'Absent de la navigation publique. Vous pouvez le restaurer.',
    }).then((ok) => {
      if (ok) {
        setSelectedId(nextLive[0]?.id ?? null)
        if (!nextLive.length) setStatusFilter('trash')
      }
    })
  }

  const restoreMenu = (menu: SiteMenu) => {
    const nextTrash = trashMenus.filter((item) => item.id !== menu.id)
    const restored: SiteMenu = {
      ...menu,
      archived: false,
      archivedAt: null,
      enabled: true,
      order: liveMenus.length,
    }
    void commitMenus(
      [...liveMenus.map((m, i) => ({ ...m, order: i })), restored, ...nextTrash],
      {
        title: 'Menu restauré',
        description: 'De retour dans la structure de navigation.',
      }
    ).then((ok) => {
      if (ok) {
        setStatusFilter('all')
        setSelectedId(restored.id)
      }
    })
  }

  const purgeMenu = (menu: SiteMenu) => {
    const next = menus.filter((item) => item.id !== menu.id)
    void commitMenus(next, {
      title: 'Menu supprimé définitivement',
      description: 'Cette action est irréversible.',
    }).then((ok) => {
      if (ok && selectedId === menu.id) {
        const remaining = next.filter((item) => isMenuArchived(item))
        setSelectedId(remaining[0]?.id ?? null)
      }
    })
  }

  const openCreateChild = (menuId: string) => {
    setChildForm(emptyChildForm())
    setChildDialog({ mode: 'create', menuId })
  }

  const openEditChild = (menu: SiteMenu, child: SiteMenuChild) => {
    setChildForm({
      label: child.label,
      href: child.href,
      description: child.description,
      kicker: child.kicker,
      badge: child.badge,
      enabled: child.enabled,
    })
    setChildDialog({ mode: 'edit', menuId: menu.id, childId: child.id })
  }

  const saveChildDialog = () => {
    if (inTrash) return
    if (!childDialog || !childForm.label.trim() || !childForm.href.trim()) {
      toast({
        variant: 'destructive',
        title: 'Champs requis',
        description: 'Libellé et URL du sous-menu sont obligatoires.',
      })
      return
    }
    updateLiveMenus(
      liveMenus.map((menu) => {
        if (menu.id !== childDialog.menuId) return menu
        if (childDialog.mode === 'create') {
          const child = {
            ...createEmptyChild(menu.children.length),
            ...childForm,
            label: childForm.label.trim(),
            href: childForm.href.trim(),
          }
          return { ...menu, children: [...menu.children, child] }
        }
        return {
          ...menu,
          children: menu.children.map((child) =>
            child.id === childDialog.childId
              ? {
                  ...child,
                  ...childForm,
                  label: childForm.label.trim(),
                  href: childForm.href.trim(),
                }
              : child
          ),
        }
      })
    )
    setChildDialog(null)
    toast({
      title: childDialog.mode === 'create' ? 'Sous-menu ajouté' : 'Sous-menu mis à jour',
    })
  }

  const toggleChild = (menuId: string, childId: string) => {
    if (inTrash) return
    const parent = liveMenus.find((menu) => menu.id === menuId)
    const child = parent?.children.find((row) => row.id === childId)
    if (!child) return
    void commitLiveMenus(
      liveMenus.map((menu) =>
        menu.id !== menuId
          ? menu
          : {
              ...menu,
              children: menu.children.map((row) =>
                row.id === childId ? { ...row, enabled: !row.enabled } : row
              ),
            }
      ),
      {
        title: child.enabled ? 'Sous-menu désactivé' : 'Sous-menu activé',
        description: child.enabled ? 'Masqué sur le site public.' : 'Visible sur le site public.',
      }
    )
  }

  const moveChild = (menuId: string, childId: string, direction: -1 | 1) => {
    if (inTrash) return
    updateLiveMenus(
      liveMenus.map((menu) => {
        if (menu.id !== menuId) return menu
        const ordered = [...menu.children].sort((a, b) => a.order - b.order)
        const index = ordered.findIndex((child) => child.id === childId)
        if (index < 0) return menu
        return { ...menu, children: reorderChildren(ordered, index, direction) }
      })
    )
  }

  const runConfirm = () => {
    if (!confirm) return
    if (confirm.type === 'archive-menu') {
      archiveMenu(confirm.menu)
    } else if (confirm.type === 'purge-menu') {
      purgeMenu(confirm.menu)
    } else {
      void commitLiveMenus(
        liveMenus.map((menu) =>
          menu.id !== confirm.menu.id
            ? menu
            : {
                ...menu,
                children: menu.children.filter((child) => child.id !== confirm.child.id),
              }
        ),
        { title: 'Sous-menu supprimé' }
      )
    }
    setConfirm(null)
  }

  const selectedChildren = selected
    ? [...selected.children].sort((a, b) => a.order - b.order)
    : []

  const canMutate = canEdit && !inTrash

  return (
    <SiteShell
      title="Menus de navigation"
      description="En-tête public : menus, sous-menus, activation et ordre."
      canEdit={canEdit}
      dirty={dirty}
      saving={saving}
      loading={loading}
      onSave={save}
    >
      <div className="site-menu-pro">
        <section
          className={cn('site-pages-insights site-menu-insights', showInsights && 'is-open')}
          aria-label="Indicateurs de navigation"
        >
          <div className="site-pages-insights__bar">
            <div className="site-pages-insights__identity">
              <span className="site-pages-insights__mark" aria-hidden>
                <BarChart3 className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="site-pages-insights__eyebrow">Pilotage navigation</p>
                <h2 className="site-pages-insights__title">Indicateurs des menus</h2>
              </div>
            </div>

            <div className="site-pages-insights__meta">
              <span className="site-pages-insights__chip">
                <strong>{stats.total}</strong> menu{stats.total > 1 ? 's' : ''}
              </span>
              <span className="site-pages-insights__chip">
                <strong>{stats.children}</strong> lien{stats.children > 1 ? 's' : ''}
              </span>
              <span className="site-pages-insights__chip is-score">
                <strong>{stats.activeRate}%</strong> actifs
              </span>
            </div>

            <button
              type="button"
              className="site-pages-insights__toggle"
              aria-expanded={showInsights}
              aria-controls="site-menu-insights-panel"
              onClick={() => setShowInsights((open) => !open)}
            >
              {showInsights ? 'Masquer' : 'Afficher'}
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>

          <div
            id="site-menu-insights-panel"
            className="site-pages-insights__panel"
            hidden={!showInsights}
          >
            <div className="site-pages-analytics site-pages-analytics--pro">
              <article className="site-pages-pro-card site-pages-pro-card--status">
                <header className="site-pages-pro-card__head">
                  <div>
                    <p className="site-pages-pro-card__eyebrow">Pilotage</p>
                    <h3>Visibilité navigation</h3>
                  </div>
                </header>

                {stats.total === 0 ? (
                  <p className="site-pages-chart-empty">Aucune donnée à afficher.</p>
                ) : (
                  <div className="site-pages-pro-status">
                    <div
                      className="site-pages-pro-ring"
                      style={
                        {
                          '--rate': `${stats.activeRate}`,
                        } as CSSProperties
                      }
                    >
                      <div className="site-pages-pro-ring__meter" />
                      <div className="site-pages-pro-ring__core">
                        <strong>{stats.activeRate}%</strong>
                        <span>Actifs</span>
                      </div>
                    </div>
                    <div className="site-pages-pro-tracks">
                      {stats.statusRows.map((row) => (
                        <div key={row.key} className="site-pages-pro-track">
                          <div className="site-pages-pro-track__meta">
                            <span>
                              <i style={{ background: row.color }} />
                              {row.label}
                            </span>
                            <b>
                              {row.value} <em>{row.pct}%</em>
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
                    <p className="site-pages-pro-card__eyebrow">Charge</p>
                    <h3>Densité des sous-menus</h3>
                  </div>
                </header>

                {stats.byMenu.length === 0 ? (
                  <p className="site-pages-chart-empty">Aucune donnée à afficher.</p>
                ) : (
                  <div className="site-menu-area-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={stats.byMenu}
                        margin={{ top: 4, right: 6, left: -14, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="siteMenuAreaFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0f766e" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#0f766e" stopOpacity={0.03} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8eee9" />
                        <XAxis
                          dataKey="short"
                          tick={{ fontSize: 9, fill: '#64748b' }}
                          tickLine={false}
                          axisLine={{ stroke: '#e2e8f0' }}
                          interval={0}
                          height={20}
                          angle={stats.byMenu.length > 4 ? -20 : 0}
                          textAnchor={stats.byMenu.length > 4 ? 'end' : 'middle'}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 9, fill: '#94a3b8' }}
                          tickLine={false}
                          axisLine={false}
                          width={20}
                        />
                        <RechartsTooltip
                          cursor={{ stroke: '#0f766e', strokeWidth: 1, strokeDasharray: '4 4' }}
                          contentStyle={{
                            borderRadius: 8,
                            border: '1px solid #d7e4db',
                            fontSize: 11,
                            padding: '4px 8px',
                            boxShadow: '0 10px 24px -16px rgba(15, 118, 110, 0.45)',
                          }}
                          formatter={(value) => [value as number, 'Sous-menus']}
                          labelFormatter={(_label, payload) => {
                            const row = payload?.[0]?.payload as
                              | {
                                  name?: string
                                  enabled?: boolean
                                  activeChildren?: number
                                  inactiveChildren?: number
                                }
                              | undefined
                            const status = row?.enabled === false ? ' · inactif' : ''
                            const detail =
                              row &&
                              typeof row.activeChildren === 'number' &&
                              typeof row.inactiveChildren === 'number'
                                ? ` · ${row.activeChildren} actifs / ${row.inactiveChildren} inactifs`
                                : ''
                            return `${row?.name ?? String(_label)}${status}${detail}`
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="total"
                          stroke="#0f766e"
                          strokeWidth={2}
                          fill="url(#siteMenuAreaFill)"
                          dot={{
                            r: 2.5,
                            fill: '#fff',
                            stroke: '#0f766e',
                            strokeWidth: 1.5,
                          }}
                          activeDot={{
                            r: 4,
                            fill: '#0f766e',
                            stroke: '#fff',
                            strokeWidth: 2,
                          }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </article>
            </div>
          </div>
        </section>

        <div className="site-menu-workspace">
          <aside className="site-menu-rail">
            <div className="site-menu-rail__head">
              <strong>Structure</strong>
              <button
                type="button"
                className="site-btn site-btn-primary site-btn-sm"
                disabled={!canEdit}
                onClick={addMenu}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Ajouter
              </button>
            </div>

            <div className="site-menu-rail__filters">
              <label className="site-menu-search">
                <Search className="h-3.5 w-3.5" aria-hidden />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Rechercher…"
                  aria-label="Rechercher un menu"
                />
              </label>
              <div className="site-menu-chips" role="tablist" aria-label="Filtrer par statut">
                {(
                  [
                    ['all', 'Tous'],
                    ['active', 'Actifs'],
                    ['inactive', 'Inactifs'],
                    ['trash', `Corbeille${stats.trash ? ` (${stats.trash})` : ''}`],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === value}
                    className={cn(
                      'site-menu-chip',
                      statusFilter === value && 'is-active',
                      value === 'trash' && 'is-trash'
                    )}
                    onClick={() => setStatusFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <ul className="site-menu-rail__list">
              {filtered.length === 0 ? (
                <li className="site-menu-rail__empty">
                  {inTrash ? 'Corbeille vide.' : 'Aucun menu.'}
                </li>
              ) : (
                filtered.map((menu, index) => {
                  const childCount = menu.children.filter((c) => c.enabled).length
                  const isSelected = selected?.id === menu.id
                  return (
                    <li key={menu.id}>
                      <button
                        type="button"
                        className={cn(
                          'site-menu-rail__item',
                          isSelected && 'is-selected',
                          !menu.enabled && !inTrash && 'is-off',
                          inTrash && 'is-trash'
                        )}
                        onClick={() => setSelectedId(menu.id)}
                      >
                        <span className="site-menu-rail__order">{index + 1}</span>
                        <span className="site-menu-rail__body">
                          <strong>{menu.label || 'Sans titre'}</strong>
                          <span>{menu.href}</span>
                        </span>
                        <span className="site-menu-rail__meta">
                          {inTrash ? (
                            <span className="site-menu-rail__trash-tag" title="En corbeille">
                              <Trash2 className="h-3 w-3" aria-hidden />
                            </span>
                          ) : (
                            <span
                              className={cn('site-menu-dot', menu.enabled ? 'is-on' : 'is-off')}
                              title={menu.enabled ? 'Actif' : 'Inactif'}
                            />
                          )}
                          {childCount > 0 ? (
                            <span className="site-menu-rail__count">{childCount}</span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
          </aside>

          <div className="site-menu-inspector">
            {!selected ? (
              inTrash ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-1.5 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-0.5">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-bold text-foreground">La corbeille est vide</p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Aucun menu n’est archivé. Les menus mis en corbeille sont conservés pendant 3 mois avant suppression définitive automatique.
                  </p>
                </div>
              ) : (
                <div className="site-menu-empty">
                  <Menu className="h-6 w-6" aria-hidden />
                  <h3>Aucun menu</h3>
                  <p>Créez le premier élément de navigation.</p>
                  <button
                    type="button"
                    className="site-btn site-btn-primary site-btn-sm"
                    disabled={!canEdit}
                    onClick={addMenu}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    Créer
                  </button>
                </div>
              )
            ) : (
              <>
                <header className="site-menu-inspector__head">
                  <div className="site-menu-inspector__identity">
                    <div className="site-menu-inspector__title-row">
                      <h3>{selected.label || 'Sans titre'}</h3>
                      {inTrash ? (
                        <span className="site-status-pill is-trash">En corbeille</span>
                      ) : (
                        <>
                          <span
                            className={cn(
                              'site-status-pill',
                              selected.enabled ? 'is-active' : 'is-inactive'
                            )}
                          >
                            {selected.enabled ? 'Visible' : 'Masqué'}
                          </span>
                          <span className="site-menu-type-pill">
                            {selectedChildren.some((c) => c.enabled)
                              ? 'Méga-menu'
                              : 'Lien simple'}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="site-menu-inspector__path">
                      <Link2 className="h-3 w-3" aria-hidden />
                      {selected.href}
                      {inTrash && selected.archivedAt ? (
                        <em className="site-menu-inspector__archived-at">
                          · archivé le{' '}
                          {new Date(selected.archivedAt).toLocaleString('fr-FR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </em>
                      ) : null}
                    </p>
                  </div>
                  <div className="site-menu-inspector__actions">
                    {inTrash ? (
                      <>
                        <ActionTip label="Restaurer">
                          <button
                            type="button"
                            className="admin-user-action-btn admin-user-action-btn--activate"
                            disabled={!canEdit || actionBusy}
                            onClick={() => restoreMenu(selected)}
                            aria-label="Restaurer"
                          >
                            <RotateCcw className="admin-user-action-icon" />
                          </button>
                        </ActionTip>
                        <ActionTip label="Supprimer définitivement">
                          <button
                            type="button"
                            className="admin-user-action-btn admin-user-action-btn--archive"
                            disabled={!canEdit || actionBusy}
                            onClick={() =>
                              setConfirm({ type: 'purge-menu', menu: selected })
                            }
                            aria-label="Supprimer définitivement"
                          >
                            <Trash2 className="admin-user-action-icon" />
                          </button>
                        </ActionTip>
                      </>
                    ) : (
                      <>
                        <ActionTip label="Monter">
                          <button
                            type="button"
                            className="admin-user-action-btn admin-user-action-btn--view"
                            disabled={!canEdit || selected.order <= 0}
                            onClick={() => moveMenu(selected.id, -1)}
                            aria-label="Monter"
                          >
                            <ChevronUp className="admin-user-action-icon" />
                          </button>
                        </ActionTip>
                        <ActionTip label="Descendre">
                          <button
                            type="button"
                            className="admin-user-action-btn admin-user-action-btn--view"
                            disabled={
                              !canEdit || selected.order >= liveMenus.length - 1
                            }
                            onClick={() => moveMenu(selected.id, 1)}
                            aria-label="Descendre"
                          >
                            <ChevronDown className="admin-user-action-icon" />
                          </button>
                        </ActionTip>
                        <ActionTip label={selected.enabled ? 'Désactiver' : 'Activer'}>
                          <button
                            type="button"
                            className={cn(
                              'admin-user-action-btn',
                              selected.enabled
                                ? 'admin-user-action-btn--deactivate'
                                : 'admin-user-action-btn--activate'
                            )}
                            disabled={!canEdit || actionBusy}
                            onClick={() => toggleMenu(selected)}
                            aria-label={selected.enabled ? 'Désactiver' : 'Activer'}
                          >
                            {selected.enabled ? (
                              <PowerOff className="admin-user-action-icon" />
                            ) : (
                              <Power className="admin-user-action-icon" />
                            )}
                          </button>
                        </ActionTip>
                        <ActionTip label="Dupliquer">
                          <button
                            type="button"
                            className="admin-user-action-btn admin-user-action-btn--view"
                            disabled={!canEdit}
                            onClick={() => copyMenu(selected)}
                            aria-label="Dupliquer"
                          >
                            <Copy className="admin-user-action-icon" />
                          </button>
                        </ActionTip>
                        <ActionTip label="Mettre en corbeille">
                          <button
                            type="button"
                            className="admin-user-action-btn admin-user-action-btn--archive"
                            disabled={!canEdit || actionBusy}
                            onClick={() =>
                              setConfirm({ type: 'archive-menu', menu: selected })
                            }
                            aria-label="Mettre en corbeille"
                          >
                            <Trash2 className="admin-user-action-icon" />
                          </button>
                        </ActionTip>
                      </>
                    )}
                  </div>
                </header>

                {inTrash ? (
                  <div className="site-menu-trash-banner" role="status">
                    <Trash2 className="h-4 w-4" aria-hidden />
                    <div>
                      <strong>Menu en corbeille</strong>
                      <p>
                        Absent du site public. Restaurez-le pour le rééditer, ou
                        supprimez-le définitivement.
                      </p>
                    </div>
                  </div>
                ) : null}

                {!inTrash && selectedChildren.some((c) => c.enabled) ? (
                  <section className="site-mega-preview site-mega-preview--pro" aria-label="Aperçu méga-menu">
                    <div className="site-mega-preview__chrome">
                      <div className="site-mega-preview__chrome-left">
                        <span className="site-mega-preview__live-badge">
                          <span className="site-mega-preview__live-dot" />
                          <Eye className="h-3 w-3" aria-hidden />
                          Aperçu live
                        </span>
                        <strong className="site-mega-preview__title">{selected.label || 'Sans titre'}</strong>
                        {selected.href ? (
                          <span className="site-mega-preview__slug">{selected.href}</span>
                        ) : null}
                      </div>
                      <span className="site-mega-preview__chrome-count">
                        <Sparkles className="h-3 w-3 text-emerald-600" aria-hidden />
                        {selectedChildren.filter((c) => c.enabled).length} lien
                        {selectedChildren.filter((c) => c.enabled).length > 1 ? 's' : ''} actif
                        {selectedChildren.filter((c) => c.enabled).length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="site-mega-preview__body">
                      {selected.description ? (
                        <div className="site-mega-preview__desc-box">
                          <span className="site-mega-preview__desc-bar" />
                          <p className="site-mega-preview__desc">{selected.description}</p>
                        </div>
                      ) : null}
                      <div className="site-mega-preview__grid">
                        {selectedChildren
                          .filter((child) => child.enabled)
                          .map((child) => {
                            const CardIcon = resolveCardIcon(child)
                            return (
                              <article key={child.id} className="site-mega-preview__card">
                                <div className="site-mega-preview__card-head">
                                  <div className="site-mega-preview__card-tags">
                                    <span className="site-mega-preview__card-icon-wrap" aria-hidden>
                                      <CardIcon className="site-mega-preview__card-icon" />
                                    </span>
                                    {child.kicker ? (
                                      <span className="site-mega-preview__card-kicker">{child.kicker}</span>
                                    ) : (
                                      <span className="site-mega-preview__card-kicker is-muted">Lien</span>
                                    )}
                                  </div>
                                  {child.badge ? (
                                    <span className="site-mega-preview__card-badge">{child.badge}</span>
                                  ) : null}
                                </div>
                                <div className="site-mega-preview__card-title-row">
                                  <strong className="site-mega-preview__card-title">
                                    {child.label || 'Sans titre'}
                                  </strong>
                                  <ArrowUpRight className="site-mega-preview__card-arrow" aria-hidden />
                                </div>
                                <p className="site-mega-preview__card-desc">
                                  {child.description || child.href}
                                </p>
                              </article>
                            )
                          })}
                      </div>
                      {selected.ctaLabel ? (
                        <div className="site-mega-preview__footer">
                          <div className="site-mega-preview__cta">
                            <span>{selected.ctaLabel}</span>
                            <ArrowRight className="h-3 w-3" aria-hidden />
                          </div>
                          {selected.ctaHref ? (
                            <code className="site-mega-preview__cta-href">
                              <Link2 className="h-3 w-3" aria-hidden />
                              {selected.ctaHref}
                            </code>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </section>
                ) : null}

                <SiteCard title="Propriétés" description="Identité du menu et panneau méga.">
                  <div className="site-props-panel">
                    <section className="site-props-block">
                      <header className="site-props-block__head">
                        <span>Identité</span>
                        <SiteToggle
                          label={selected.enabled ? 'Visible' : 'Masqué'}
                          checked={selected.enabled}
                          disabled={!canMutate || actionBusy}
                          onChange={(value) => setSelectedEnabled(value)}
                        />
                      </header>
                      <div className="site-grid-2">
                        <SiteField label="Libellé" required>
                          <input
                            className="site-input"
                            value={selected.label}
                            disabled={!canMutate}
                            onChange={(event) => patchSelected({ label: event.target.value })}
                            placeholder="Services"
                          />
                        </SiteField>
                        <SiteField label="URL" required>
                          <div className="site-url-field">
                            <input
                              className="site-input"
                              value={selected.href}
                              disabled={!canMutate}
                              onChange={(event) => patchSelected({ href: event.target.value })}
                              placeholder="/services"
                            />
                            <PageUrlPicker
                              pages={pageCatalog}
                              value={selected.href}
                              disabled={!canMutate}
                              onPick={(page) => applyPageUrl(page, 'href')}
                            />
                          </div>
                        </SiteField>
                      </div>
                    </section>

                    <section className="site-props-block">
                      <header className="site-props-block__head">
                        <span>Panneau méga-menu</span>
                      </header>
                      <div className="site-grid-2">
                        <SiteField
                          label="Description"
                          className="site-span-2"
                          hint="Texte d’introduction affiché dans l’aperçu live."
                        >
                          <textarea
                            className="site-textarea"
                            rows={2}
                            value={selected.description}
                            disabled={!canMutate}
                            onChange={(event) =>
                              patchSelected({ description: event.target.value })
                            }
                            placeholder="Introduction du panneau"
                          />
                        </SiteField>
                        <SiteField label="Libellé CTA">
                          <input
                            className="site-input"
                            value={selected.ctaLabel}
                            disabled={!canMutate}
                            onChange={(event) => patchSelected({ ctaLabel: event.target.value })}
                            placeholder="Voir tous les services"
                          />
                        </SiteField>
                        <SiteField label="URL CTA">
                          <div className="site-url-field">
                            <input
                              className="site-input"
                              value={selected.ctaHref}
                              disabled={!canMutate}
                              onChange={(event) => patchSelected({ ctaHref: event.target.value })}
                              placeholder="/services"
                            />
                            <PageUrlPicker
                              pages={pageCatalog}
                              value={selected.ctaHref}
                              disabled={!canMutate}
                              onPick={(page) => applyPageUrl(page, 'ctaHref')}
                            />
                          </div>
                        </SiteField>
                      </div>
                    </section>

                  </div>
                </SiteCard>

                <SiteCard
                  title="Sous-menus"
                  actions={
                    <div className="site-submenu-card-actions">
                      <span className="site-submenu-count-pill">
                        {selectedChildren.filter((c) => c.enabled).length}/
                        {selectedChildren.length}
                      </span>
                      <button
                        type="button"
                        className="site-btn site-btn-primary site-btn-sm"
                        disabled={!canMutate}
                        onClick={() => openCreateChild(selected.id)}
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden />
                        Ajouter
                      </button>
                    </div>
                  }
                >
                  {selectedChildren.length === 0 ? (
                    <div className="site-menu-subempty">
                      <div className="site-menu-subempty__icon" aria-hidden>
                        <Menu className="h-5 w-5" />
                      </div>
                      <p>Aucun sous-menu — lien simple dans l’en-tête.</p>
                      <button
                        type="button"
                        className="site-btn site-btn-ghost site-btn-sm"
                        disabled={!canMutate}
                        onClick={() => openCreateChild(selected.id)}
                      >
                        Premier sous-menu
                      </button>
                    </div>
                  ) : (
                    <div className="site-submenu-panel-pro">
                      <div className="site-submenu-table site-submenu-table--pro">
                        <table className="admin-table">
                          <thead className="admin-table-head">
                            <tr>
                              <th className="site-submenu-col-order">#</th>
                              <th>Sous-menu</th>
                              <th className="site-submenu-col-url">URL</th>
                              <th className="site-submenu-col-status">Statut</th>
                              <th className="admin-users-actions-col">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedChildren.map((child, index) => (
                              <tr
                                key={child.id}
                                className={cn(
                                  'admin-table-row site-submenu-row',
                                  !child.enabled && 'is-disabled'
                                )}
                              >
                                <td data-label="Ordre">
                                  <div className="site-menu-order site-menu-order--pro">
                                    <button
                                      type="button"
                                      className="site-icon-btn"
                                      disabled={!canMutate || index === 0}
                                      onClick={() => moveChild(selected.id, child.id, -1)}
                                      aria-label="Monter"
                                    >
                                      <ChevronUp className="h-3 w-3" />
                                    </button>
                                    <span>{index + 1}</span>
                                    <button
                                      type="button"
                                      className="site-icon-btn"
                                      disabled={
                                        !canMutate || index === selectedChildren.length - 1
                                      }
                                      onClick={() => moveChild(selected.id, child.id, 1)}
                                      aria-label="Descendre"
                                    >
                                      <ChevronDown className="h-3 w-3" />
                                    </button>
                                  </div>
                                </td>
                                <td data-label="Sous-menu">
                                  <div className="site-menu-label site-menu-label--pro">
                                    <strong>
                                      {child.kicker ? (
                                        <em className="site-menu-kicker">{child.kicker}</em>
                                      ) : null}
                                      {child.label || 'Sans titre'}
                                      {child.badge ? (
                                        <span className="site-menu-badge">{child.badge}</span>
                                      ) : null}
                                    </strong>
                                    {child.description ? <span>{child.description}</span> : null}
                                  </div>
                                </td>
                                <td data-label="URL">
                                  <code className="site-menu-url site-menu-url--pro">
                                    <Link2 className="h-3 w-3" aria-hidden />
                                    {child.href}
                                  </code>
                                </td>
                                <td data-label="Statut">
                                  <span
                                    className={cn(
                                      'site-status-pill site-status-pill--compact',
                                      child.enabled ? 'is-active' : 'is-inactive'
                                    )}
                                  >
                                    <i aria-hidden />
                                    {child.enabled ? 'Actif' : 'Inactif'}
                                  </span>
                                </td>
                                <td className="admin-users-actions-col" data-label="Actions">
                                  <div className="admin-user-row-actions site-submenu-row-actions">
                                    <ActionTip label="Modifier">
                                      <button
                                        type="button"
                                        className="admin-user-action-btn admin-user-action-btn--edit"
                                        disabled={!canMutate}
                                        onClick={() => openEditChild(selected, child)}
                                        aria-label="Modifier"
                                      >
                                        <SquarePen className="admin-user-action-icon" />
                                      </button>
                                    </ActionTip>
                                    <ActionTip
                                      label={child.enabled ? 'Désactiver' : 'Activer'}
                                    >
                                      <button
                                        type="button"
                                        className={cn(
                                          'admin-user-action-btn',
                                          child.enabled
                                            ? 'admin-user-action-btn--deactivate'
                                            : 'admin-user-action-btn--activate'
                                        )}
                                        disabled={!canMutate || actionBusy}
                                        onClick={() => toggleChild(selected.id, child.id)}
                                        aria-label={
                                          child.enabled ? 'Désactiver' : 'Activer'
                                        }
                                      >
                                        {child.enabled ? (
                                          <PowerOff className="admin-user-action-icon" />
                                        ) : (
                                          <Power className="admin-user-action-icon" />
                                        )}
                                      </button>
                                    </ActionTip>
                                    <ActionTip label="Supprimer">
                                      <button
                                        type="button"
                                        className="admin-user-action-btn admin-user-action-btn--archive"
                                        disabled={!canMutate}
                                        onClick={() =>
                                          setConfirm({
                                            type: 'delete-child',
                                            menu: selected,
                                            child,
                                          })
                                        }
                                        aria-label="Supprimer"
                                      >
                                        <Trash2 className="admin-user-action-icon" />
                                      </button>
                                    </ActionTip>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <footer className="site-submenu-footer">
                        {selectedChildren.length} sous-menu
                        {selectedChildren.length > 1 ? 's' : ''} ·{' '}
                        {selectedChildren.filter((c) => c.enabled).length} actif
                        {selectedChildren.filter((c) => c.enabled).length > 1 ? 's' : ''}
                      </footer>
                    </div>
                  )}
                </SiteCard>
              </>
            )}
          </div>
        </div>

      </div>

      <Dialog open={Boolean(childDialog)} onOpenChange={(open) => !open && setChildDialog(null)}>
        <DialogContent className="site-dialog site-child-dialog" showCloseButton>
          <div className="site-child-dialog__shell">
            <header className="site-child-dialog__header">
              <div className="site-child-dialog__header-copy">
                <span className="site-child-dialog__eyebrow">
                  {childDialog?.mode === 'create' ? 'Création' : 'Édition'}
                </span>
                <DialogTitle>
                  {childDialog?.mode === 'create' ? 'Nouveau sous-menu' : 'Modifier le sous-menu'}
                </DialogTitle>
                <DialogDescription>
                  {dialogParentLabel
                    ? `Carte du méga-menu · ${dialogParentLabel}`
                    : 'Carte du méga-menu'}
                </DialogDescription>
              </div>
            </header>

            <div className="site-child-dialog__layout">
              <div className="site-child-dialog__form">
                <section className="site-child-dialog__block">
                  <div className="site-child-dialog__block-head">
                    <h4>Contenu de la carte</h4>
                    <p>Renseignez les éléments affichés dans le panneau public.</p>
                  </div>
                  <div className="site-grid-2">
                    <SiteField label="Libellé" required>
                      <input
                        className="site-input"
                        value={childForm.label}
                        onChange={(event) =>
                          setChildForm((prev) => ({ ...prev, label: event.target.value }))
                        }
                        placeholder="Découvrir le CSIRT-ARPT"
                        maxLength={80}
                      />
                    </SiteField>
                    <SiteField label="URL" required>
                      <div className="site-url-field">
                        <input
                          className="site-input"
                          value={childForm.href}
                          onChange={(event) =>
                            setChildForm((prev) => ({ ...prev, href: event.target.value }))
                          }
                          placeholder="/chemin"
                        />
                        <PageUrlPicker
                          pages={pageCatalog}
                          value={childForm.href}
                          onPick={(page) => {
                            setChildForm((prev) => ({
                              ...prev,
                              href: page.href,
                              label: prev.label.trim() ? prev.label : page.label,
                            }))
                            toast({
                              title: 'URL appliquée',
                              description: `Sous-menu lié à ${page.href}.`,
                            })
                          }}
                        />
                      </div>
                    </SiteField>
                    <SiteField label="Sur-titre">
                      <input
                        className="site-input"
                        value={childForm.kicker}
                        onChange={(event) =>
                          setChildForm((prev) => ({ ...prev, kicker: event.target.value }))
                        }
                        placeholder="Institution"
                        maxLength={40}
                      />
                    </SiteField>
                    <SiteField label="Badge">
                      <input
                        className="site-input"
                        value={childForm.badge}
                        onChange={(event) =>
                          setChildForm((prev) => ({ ...prev, badge: event.target.value }))
                        }
                        placeholder="Nouveau"
                        maxLength={24}
                      />
                    </SiteField>
                  </div>
                  <SiteField label="Description" className="site-child-dialog__desc">
                    <textarea
                      className="site-textarea"
                      rows={2}
                      value={childForm.description}
                      onChange={(event) =>
                        setChildForm((prev) => ({ ...prev, description: event.target.value }))
                      }
                      placeholder="Résumé affiché dans le méga-menu"
                      maxLength={180}
                    />
                    <span className="site-child-dialog__counter">
                      {childForm.description.length}/180
                    </span>
                  </SiteField>
                </section>

                <section className="site-child-dialog__status">
                  <div className="site-child-dialog__status-copy">
                    <strong>Visibilité</strong>
                    <span>
                      {childForm.enabled
                        ? 'Cette carte apparaîtra dans le méga-menu public.'
                        : 'Cette carte restera masquée sur le site.'}
                    </span>
                  </div>
                  <SiteToggle
                    label={childForm.enabled ? 'Actif' : 'Inactif'}
                    checked={childForm.enabled}
                    onChange={(enabled) => setChildForm((prev) => ({ ...prev, enabled }))}
                  />
                </section>
              </div>

              <aside className="site-child-dialog__preview" aria-label="Aperçu de la carte">
                <div className="site-child-dialog__preview-head">
                  <span>Aperçu live</span>
                  <i className={childForm.enabled ? 'is-on' : 'is-off'}>
                    {childForm.enabled ? 'Visible' : 'Masqué'}
                  </i>
                </div>
                <article
                  className={cn(
                    'site-child-dialog__card',
                    !childForm.enabled && 'is-off'
                  )}
                >
                  {childForm.kicker ? (
                    <em>{childForm.kicker}</em>
                  ) : (
                    <em className="is-muted">Sur-titre</em>
                  )}
                  <strong>
                    {childForm.label.trim() || 'Libellé du sous-menu'}
                    {childForm.badge.trim() ? <span>{childForm.badge.trim()}</span> : null}
                  </strong>
                  <p>{childForm.description.trim() || 'Description de la carte…'}</p>
                  <footer>
                    <code>{childForm.href.trim() || '/…'}</code>
                  </footer>
                </article>
                <p className="site-child-dialog__preview-note">
                  Rendu tel qu’affiché dans le méga-menu public.
                </p>
              </aside>
            </div>

            <footer className="site-child-dialog__footer">
              <button
                type="button"
                className="site-btn site-child-dialog__btn-cancel site-btn-sm"
                onClick={() => setChildDialog(null)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="site-btn site-btn-primary site-btn-sm"
                onClick={saveChildDialog}
              >
                {childDialog?.mode === 'create' ? 'Ajouter' : 'Enregistrer'}
              </button>
            </footer>
          </div>
        </DialogContent>
      </Dialog>

      <AdminConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={
          confirm?.type === 'archive-menu'
            ? 'Mettre en corbeille ?'
            : confirm?.type === 'purge-menu'
              ? 'Supprimer définitivement ?'
              : 'Supprimer ce sous-menu ?'
        }
        message={
          confirm?.type === 'archive-menu'
            ? `« ${confirm.menu.label} » et ses sous-menus quitteront la navigation. Vous pourrez les restaurer depuis la corbeille.`
            : confirm?.type === 'purge-menu'
              ? `« ${confirm.menu.label} » sera définitivement effacé. Cette action est irréversible.`
              : confirm
                ? `« ${confirm.child.label} » sera retiré du méga-menu « ${confirm.menu.label} ».`
                : ''
        }
        confirmLabel={
          confirm?.type === 'archive-menu'
            ? 'Mettre en corbeille'
            : confirm?.type === 'purge-menu'
              ? 'Supprimer définitivement'
              : 'Supprimer'
        }
        cancelLabel="Annuler"
        intent="destructive"
        onConfirm={runConfirm}
      />
    </SiteShell>
  )
}
