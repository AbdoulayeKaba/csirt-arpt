'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArchiveRestore,
  CheckCircle2,
  Copy,
  EyeOff,
  ImagePlus,
  Images,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react'
import { AdminConfirmDialog } from '@/components/admin/admin-confirm-dialog'
import {
  AdminEmptyTrashButton,
  AdminTrashEmptyState,
  AdminTrashScopeTabs,
} from '@/components/admin/admin-trash-ui'
import { SiteCard, SiteField, SiteRowActions, SiteToggle } from '@/components/admin/site/site-fields'
import { SiteHomeHeroPreview } from '@/components/admin/site/site-home-hero-preview'
import {
  buildSitePageCatalog,
  SiteLinkField,
} from '@/components/admin/site/site-page-url-picker'
import { SiteShell } from '@/components/admin/site/site-shell'
import { CsirtActionBar } from '@/components/csirt/csirt-action-bar'
import { CsirtMissionsBanner } from '@/components/csirt/csirt-missions-banner'
import { CsirtResponseSection } from '@/components/csirt/csirt-response-section'
import { CsirtSearchBar } from '@/components/csirt/csirt-search-bar'
import { CsirtVigilanceSection } from '@/components/csirt/csirt-vigilance-section'
import { loadMediaLibrary, rememberMediaLibrary, type MediaLibrary } from '@/components/admin/site/media-library-cache'
import { useSiteEditor } from '@/components/admin/site/use-site-editor'
import { DG_SITE_ROUTES } from '@/lib/dg/site-routes'
import { normalizeSiteAssetUrl } from '@/lib/site/asset-urls'
import { newSiteId } from '@/lib/site/ids'
import { archiveNow, isArchivedFlag } from '@/lib/site/news-sources'
import { SITE_THEME_MEDIA, type SiteContent, type SiteSearchSuggestion } from '@/lib/site/types'
import {
  publishableHeroSlides,
  type CsirtActionLink,
  type CsirtHeroSlide,
} from '@/lib/csirt/home-content'
import {
  CSIRT_HERO_CTA_ICONS,
  CSIRT_HERO_VARIANTS,
  parseHeroCtaIcon,
  resolveHeroCtaIcon,
  type CsirtHeroCtaIcon,
  type CsirtHeroVariant,
} from '@/lib/csirt/hero-cta'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import '@/components/admin/site/site-admin.css'
import '@/components/admin/site/site-home.css'
import '@/components/csirt/csirt-home.css'

function patchHome(site: SiteContent, patch: Partial<SiteContent['home']>): SiteContent {
  return { ...site, home: { ...site.home, ...patch } }
}

function blankSlide(): CsirtHeroSlide {
  return {
    id: newSiteId('hero'),
    src: '',
    alt: '',
    kicker: '',
    title: '',
    cta: 'En savoir plus',
    href: '/',
    variant: 'glass',
    ctaIcon: 'arrow',
    enabled: true,
    archived: false,
    archivedAt: null,
  }
}

function slideLabel(slide: CsirtHeroSlide, index: number) {
  return slide.title?.trim() || slide.cta?.trim() || slide.alt?.trim() || `Slide ${index + 1}`
}

function swapByIds(items: CsirtHeroSlide[], aId: string, bId: string) {
  const a = items.findIndex((item) => item.id === aId)
  const b = items.findIndex((item) => item.id === bId)
  if (a < 0 || b < 0) return items
  const list = [...items]
  ;[list[a], list[b]] = [list[b], list[a]]
  return list
}

type SlideScope = 'live' | 'trash'
type SlideConfirm = { id: string; mode: 'archive' | 'purge' }
type SearchSuggestScope = 'active' | 'trash'
type SearchSuggestConfirm =
  | { mode: 'purge'; id: string }
  | { mode: 'empty' }
type ActionLinkScope = 'active' | 'trash'
type ActionLinkConfirm =
  | { mode: 'purge'; id: string }
  | { mode: 'empty' }

export function SiteHomeEditor() {
  const { site, setSite, loading, saving, dirty, canEdit, save } = useSiteEditor()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [library, setLibrary] = useState<MediaLibrary | null>(null)
  const [slideScope, setSlideScope] = useState<SlideScope>('live')
  const [slideConfirm, setSlideConfirm] = useState<SlideConfirm | null>(null)
  const [searchSuggestScope, setSearchSuggestScope] = useState<SearchSuggestScope>('active')
  const [searchSuggestConfirm, setSearchSuggestConfirm] =
    useState<SearchSuggestConfirm | null>(null)
  const [actionLinkScope, setActionLinkScope] = useState<ActionLinkScope>('active')
  const [actionLinkConfirm, setActionLinkConfirm] = useState<ActionLinkConfirm | null>(null)

  const allSlides = site?.home.heroSlides ?? []
  const liveSlides = useMemo(
    () => allSlides.filter((slide) => !isArchivedFlag(slide)),
    [allSlides]
  )
  const trashSlides = useMemo(
    () => allSlides.filter((slide) => isArchivedFlag(slide)),
    [allSlides]
  )
  const inTrash = slideScope === 'trash'
  const slides = inTrash ? trashSlides : liveSlides
  const selected =
    slides.find((s) => s.id === selectedId) ?? slides[0] ?? null

  useEffect(() => {
    if (!slides.length) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !slides.some((s) => s.id === selectedId)) {
      setSelectedId(slides[0].id)
    }
  }, [slides, selectedId])

  useEffect(() => {
    if (!libraryOpen) return
    let cancelled = false
    void loadMediaLibrary().then((next) => {
      if (!cancelled) setLibrary(next)
    })
    return () => {
      cancelled = true
    }
  }, [libraryOpen])

  const liveCount = useMemo(
    () => publishableHeroSlides(allSlides).length,
    [allSlides]
  )
  const draftCount = liveSlides.length - liveCount
  const pageCatalog = useMemo(
    () => (site ? buildSitePageCatalog(site.pages) : []),
    [site?.pages]
  )

  const allSearchSuggestions = site?.home.searchSuggestions ?? []
  const liveSearchSuggestions = useMemo(
    () => allSearchSuggestions.filter((item) => !isArchivedFlag(item)),
    [allSearchSuggestions]
  )
  const trashSearchSuggestions = useMemo(
    () => allSearchSuggestions.filter((item) => isArchivedFlag(item)),
    [allSearchSuggestions]
  )
  const searchSuggestInTrash = searchSuggestScope === 'trash'
  const visibleSearchSuggestions = searchSuggestInTrash
    ? trashSearchSuggestions
    : liveSearchSuggestions

  const updateSearchSuggestion = (id: string, patch: Partial<SiteSearchSuggestion>) => {
    if (!site) return
    setSite(
      patchHome(site, {
        searchSuggestions: site.home.searchSuggestions.map((item) =>
          item.id === id ? { ...item, ...patch } : item
        ),
      })
    )
  }

  const archiveSearchSuggestion = (id: string) => {
    if (!site || !canEdit) return
    setSite(
      patchHome(site, {
        searchSuggestions: site.home.searchSuggestions.map((item) =>
          item.id === id
            ? { ...item, archived: true, archivedAt: archiveNow() }
            : item
        ),
      })
    )
    toast({
      title: 'Suggestion mise en corbeille',
      description: 'Conservée 3 mois — enregistrez pour publier.',
    })
  }

  const restoreSearchSuggestion = (id: string) => {
    if (!site || !canEdit) return
    setSite(
      patchHome(site, {
        searchSuggestions: site.home.searchSuggestions.map((item) =>
          item.id === id ? { ...item, archived: false, archivedAt: null } : item
        ),
      })
    )
    setSearchSuggestScope('active')
    toast({ title: 'Suggestion restaurée', description: 'Enregistrez pour publier.' })
  }

  const purgeSearchSuggestion = (id: string) => {
    if (!site || !canEdit) return
    setSite(
      patchHome(site, {
        searchSuggestions: site.home.searchSuggestions.filter((item) => item.id !== id),
      })
    )
    setSearchSuggestConfirm(null)
    toast({ title: 'Suggestion supprimée définitivement' })
  }

  const emptySearchSuggestTrash = () => {
    if (!site || !canEdit) return
    setSite(
      patchHome(site, {
        searchSuggestions: site.home.searchSuggestions.filter((item) => !isArchivedFlag(item)),
      })
    )
    setSearchSuggestConfirm(null)
    toast({ title: 'Corbeille suggestions vidée' })
  }

  const allActionLinks = site?.home.actionLinks ?? []
  const liveActionLinks = useMemo(
    () => allActionLinks.filter((item) => !isArchivedFlag(item)),
    [allActionLinks]
  )
  const trashActionLinks = useMemo(
    () => allActionLinks.filter((item) => isArchivedFlag(item)),
    [allActionLinks]
  )
  const actionLinksInTrash = actionLinkScope === 'trash'
  const visibleActionLinks = actionLinksInTrash ? trashActionLinks : liveActionLinks

  const ensureActionLinkId = (link: CsirtActionLink, index: number) =>
    link.id?.trim() || `action-${index + 1}`

  const updateActionLink = (id: string, patch: Partial<CsirtActionLink>) => {
    if (!site) return
    setSite(
      patchHome(site, {
        actionLinks: site.home.actionLinks.map((item, index) =>
          ensureActionLinkId(item, index) === id ? { ...item, id, ...patch } : item
        ),
      })
    )
  }

  const archiveActionLink = (id: string) => {
    if (!site || !canEdit) return
    setSite(
      patchHome(site, {
        actionLinks: site.home.actionLinks.map((item, index) =>
          ensureActionLinkId(item, index) === id
            ? { ...item, id, archived: true, archivedAt: archiveNow() }
            : item
        ),
      })
    )
    toast({
      title: 'Lien mis en corbeille',
      description: 'Conservé 3 mois — enregistrez pour publier.',
    })
  }

  const restoreActionLink = (id: string) => {
    if (!site || !canEdit) return
    setSite(
      patchHome(site, {
        actionLinks: site.home.actionLinks.map((item, index) =>
          ensureActionLinkId(item, index) === id
            ? { ...item, id, archived: false, archivedAt: null }
            : item
        ),
      })
    )
    setActionLinkScope('active')
    toast({ title: 'Lien restauré', description: 'Enregistrez pour publier.' })
  }

  const purgeActionLink = (id: string) => {
    if (!site || !canEdit) return
    setSite(
      patchHome(site, {
        actionLinks: site.home.actionLinks.filter(
          (item, index) => ensureActionLinkId(item, index) !== id
        ),
      })
    )
    setActionLinkConfirm(null)
    toast({ title: 'Lien supprimé définitivement' })
  }

  const emptyActionLinkTrash = () => {
    if (!site || !canEdit) return
    setSite(
      patchHome(site, {
        actionLinks: site.home.actionLinks.filter((item) => !isArchivedFlag(item)),
      })
    )
    setActionLinkConfirm(null)
    toast({ title: 'Corbeille accès rapides vidée' })
  }

  const updateSlide = (id: string, patch: Partial<CsirtHeroSlide>) => {
    if (!site) return
    setSite(
      patchHome(site, {
        heroSlides: site.home.heroSlides.map((item) =>
          item.id === id ? { ...item, ...patch } : item
        ),
      })
    )
  }

  const addSlide = () => {
    if (!site || !canEdit || inTrash) return
    const next = blankSlide()
    setSite(patchHome(site, { heroSlides: [...site.home.heroSlides, next] }))
    setSlideScope('live')
    setSelectedId(next.id)
    toast({ title: 'Slide ajoutée', description: 'Complétez l’image et le texte, puis enregistrez.' })
  }

  const duplicateSlide = (slide: CsirtHeroSlide) => {
    if (!site || !canEdit || inTrash) return
    const next: CsirtHeroSlide = {
      ...slide,
      id: newSiteId('hero'),
      title: slide.title ? `${slide.title} (copie)` : slide.title,
      enabled: false,
      archived: false,
      archivedAt: null,
    }
    const index = site.home.heroSlides.findIndex((s) => s.id === slide.id)
    const list = [...site.home.heroSlides]
    list.splice(index + 1, 0, next)
    setSite(patchHome(site, { heroSlides: list }))
    setSlideScope('live')
    setSelectedId(next.id)
    toast({ title: 'Slide dupliquée (brouillon)' })
  }

  const archiveSlide = (id: string) => {
    if (!site || !canEdit) return
    if (liveSlides.length <= 1) {
      toast({
        variant: 'destructive',
        title: 'Impossible',
        description: 'Conservez au moins une slide active dans le diaporama.',
      })
      return
    }
    setSite(
      patchHome(site, {
        heroSlides: site.home.heroSlides.map((item) =>
          item.id === id
            ? { ...item, archived: true, archivedAt: archiveNow() }
            : item
        ),
      })
    )
    setSlideConfirm(null)
    toast({
      title: 'Slide mise en corbeille',
      description: 'Conservée 3 mois — enregistrez pour publier.',
    })
  }

  const restoreSlide = (id: string) => {
    if (!site || !canEdit) return
    setSite(
      patchHome(site, {
        heroSlides: site.home.heroSlides.map((item) =>
          item.id === id ? { ...item, archived: false, archivedAt: null } : item
        ),
      })
    )
    setSelectedId(id)
    setSlideScope('live')
    toast({ title: 'Slide restaurée', description: 'Enregistrez pour publier.' })
  }

  const purgeSlide = (id: string) => {
    if (!site || !canEdit) return
    setSite(
      patchHome(site, {
        heroSlides: site.home.heroSlides.filter((item) => item.id !== id),
      })
    )
    setSlideConfirm(null)
    toast({ title: 'Slide supprimée définitivement' })
  }

  const moveSelectedSlide = (delta: -1 | 1) => {
    if (!site || !canEdit || !selected || inTrash) return
    const poolIndex = slides.findIndex((item) => item.id === selected.id)
    const neighbor = slides[poolIndex + delta]
    if (!neighbor) return
    setSite(
      patchHome(site, {
        heroSlides: swapByIds(site.home.heroSlides, selected.id, neighbor.id),
      })
    )
  }

  const uploadSlideImage = async (id: string, file: File) => {
    if (!canEdit) return
    setUploadingId(id)
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch('/api/admin/site/media', { method: 'POST', body })
      const json = (await res.json().catch(() => ({}))) as { url?: string; message?: string }
      if (!res.ok || !json.url) {
        toast({
          variant: 'destructive',
          title: 'Import impossible',
          description: json.message || 'Formats : PNG, JPG, WebP, GIF (max. 2 Mo).',
        })
        return
      }
      updateSlide(id, { src: json.url })
      setLibrary((prev) => {
        const next = prev
          ? {
              ...prev,
              uploads: [{ src: json.url!, label: file.name }, ...prev.uploads],
            }
          : {
              theme: [...SITE_THEME_MEDIA],
              uploads: [{ src: json.url!, label: file.name }],
            }
        rememberMediaLibrary(next)
        return next
      })
      toast({ title: 'Image de slide mise à jour' })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Import impossible',
        description: 'Erreur réseau — réessayez.',
      })
    } finally {
      setUploadingId(null)
    }
  }

  const selectedIndex = selected
    ? slides.findIndex((s) => s.id === selected.id)
    : -1

  return (
    <SiteShell
      title="Page d’accueil"
      description="Composez le bandeau principal et activez chaque bloc visible sur csirt.arpt.gov.gn."
      canEdit={canEdit}
      dirty={dirty}
      saving={saving}
      loading={loading}
      onSave={save}
      previewHref="/"
    >
      {site ? (
        <div className="site-grid site-home-page">
          <header className="site-home-intro">
            <div>
              <p className="site-home-intro__eyebrow">Studio éditorial</p>
            </div>
            <div className="site-home-intro__status">
              <span className={cn('site-home-intro__pill', dirty ? 'is-dirty' : 'is-clean')}>
                {dirty ? 'Modifications en cours' : 'À jour'}
              </span>
              {!canEdit ? (
                <span className="site-home-intro__pill is-readonly">Lecture seule</span>
              ) : null}
            </div>
          </header>

          {!canEdit ? (
            <div className="site-home-banner site-home-banner--warn" role="status">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              <p>
                Votre rôle n’autorise pas la publication. Demandez le droit « Publier les contenus
                du site » ou l’accès menu Site public.
              </p>
            </div>
          ) : null}

          <section className="site-home-kpis" aria-label="État de la page d’accueil">
            {(
              [
                ['newsEnabled', 'Actualités'],
                ['mediaEnabled', 'Médiathèque'],
                ['responseEnabled', 'Dispositif'],
                ['socialEnabled', 'Réseaux'],
                ['missionsEnabled', 'Missions'],
              ] as const
            ).map(([key, label]) => {
              const on = Boolean(site.home[key])
              return (
                <article key={key} className={cn('site-home-kpi', on ? 'is-ok' : 'is-off')}>
                  {on ? (
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <EyeOff className="h-3.5 w-3.5" aria-hidden />
              )}
                  <strong>{on ? 'Visible' : 'Masqué'}</strong>
                  <span>{label}</span>
            </article>
              )
            })}
          </section>

          <SiteCard
            className="site-home-visibility-card"
            title="Visibilité des blocs"
            description="Activez ou masquez chaque section sans perdre son contenu."
          >
            <div className="site-home-visibility">
              {(
                [
                  ['newsEnabled', 'Actualités', DG_SITE_ROUTES.collected],
                  ['mediaEnabled', 'Médiathèque', DG_SITE_ROUTES.media],
                  ['responseEnabled', 'Dispositif de réponse', '#site-home-response'],
                  ['socialEnabled', 'Réseaux sociaux', DG_SITE_ROUTES.media],
                  ['missionsEnabled', 'Bandeau missions', '#site-home-missions'],
                ] as const
              ).map(([key, label, href]) => (
                <div key={key} className="site-home-visibility__row">
                  <SiteToggle
                    label={label}
                    checked={Boolean(site.home[key])}
                    disabled={!canEdit}
                    onChange={(value) => setSite(patchHome(site, { [key]: value }))}
                  />
                  {href ? (
                    href.startsWith('#') ? (
                      <a href={href} className="site-home-visibility__link">
                        Configurer
                      </a>
                    ) : (
                    <Link href={href} className="site-home-visibility__link">
                      Configurer
                    </Link>
                    )
                  ) : null}
                </div>
              ))}
            </div>
          </SiteCard>

          {false && (
          <>
          <section className="site-home-studio">
            <header className="site-home-studio__head">
              <div>
                <p className="site-home-studio__eyebrow">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  Studio diaporama
                </p>
                <h2>{inTrash ? 'Corbeille' : 'Bandeau principal'}</h2>
                <p>
                  {inTrash
                    ? 'Slides archivées — restauration ou suppression définitive (rétention 3 mois).'
                    : 'Créez, réordonnez et publiez les slides du hero. Les brouillons restent hors du site public.'}
                </p>
              </div>
              <div className="site-home-studio__head-actions">
                {!inTrash ? (
                  <>
                <label className="site-home-autoplay">
                  <span>Autoplay</span>
                  <select
                    className="site-input"
                    value={String(site.home.heroAutoplayMs ?? 7000)}
                    disabled={!canEdit}
                    onChange={(e) =>
                      setSite(
                        patchHome(site, {
                          heroAutoplayMs: Number(e.target.value) || 7000,
                        })
                      )
                    }
                  >
                    <option value="2000">2 s</option>
                    <option value="3000">3 s</option>
                    <option value="4000">4 s</option>
                    <option value="5000">5 s</option>
                    <option value="7000">7 s</option>
                    <option value="9000">9 s</option>
                    <option value="12000">12 s</option>
                  </select>
                </label>
                <button
                  type="button"
                  className="site-btn site-btn-primary site-btn-sm"
                  disabled={!canEdit}
                  onClick={addSlide}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Nouvelle slide
                </button>
                  </>
                ) : null}
              </div>
            </header>

            <div className="site-home-studio__scopes" role="tablist" aria-label="Portée diaporama">
              {(
                [
                  ['live', 'Actives', liveSlides.length],
                  ['trash', 'Corbeille', trashSlides.length],
                ] as const
              ).map(([key, label, count]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={slideScope === key}
                  className={cn(
                    'site-home-studio__scope',
                    slideScope === key && 'is-active',
                    key === 'trash' && 'is-trash'
                  )}
                  onClick={() => setSlideScope(key)}
                >
                  {key === 'trash' ? <Trash2 className="h-3 w-3" aria-hidden /> : null}
                  {label}
                  <em>{count}</em>
                </button>
              ))}
            </div>

            <div className="site-home-studio__body">
              <aside className="site-home-studio__rail" aria-label="Liste des slides">
                {slides.length === 0 ? (
                  <div className="site-home-studio__empty">
                    {inTrash ? (
                      <>
                        <Trash2 className="h-5 w-5" aria-hidden />
                        <strong>Corbeille vide</strong>
                        <p>Les slides mises à la corbeille apparaîtront ici.</p>
                      </>
                    ) : (
                      <>
                    <strong>Aucune slide</strong>
                    <p>Ajoutez la première image du bandeau.</p>
                    <button
                      type="button"
                      className="site-btn site-btn-primary site-btn-sm"
                      disabled={!canEdit}
                      onClick={addSlide}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                      Créer
                    </button>
                      </>
                    )}
                  </div>
                ) : (
                  <ul className="site-home-studio__list">
                    {slides.map((slide, index) => {
                      const live =
                        !inTrash &&
                        slide.enabled !== false &&
                        Boolean(slide.src.trim())
                      const active = selected?.id === slide.id
                      return (
                        <li key={slide.id}>
                          <button
                            type="button"
                            className={cn(
                              'site-home-studio__thumb',
                              active && 'is-active',
                              !live && !inTrash && 'is-draft',
                              inTrash && 'is-trash'
                            )}
                            onClick={() => setSelectedId(slide.id)}
                          >
                            <span className="site-home-studio__thumb-media">
                              {slide.src ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={slide.src} alt="" />
                              ) : (
                                <ImagePlus className="h-5 w-5" aria-hidden />
                              )}
                              <em>{index + 1}</em>
                            </span>
                            <span className="site-home-studio__thumb-meta">
                              <strong>{slideLabel(slide, index)}</strong>
                              <span>
                                {inTrash
                                  ? 'En corbeille'
                                  : live
                                    ? 'Publiable'
                                    : 'Brouillon'}
                              </span>
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </aside>

              <div className="site-home-studio__editor">
                {selected && selectedIndex >= 0 ? (
                  <>
                    <div className="site-home-studio__toolbar">
                      <div>
                        <strong>
                          {inTrash ? 'Corbeille' : 'Slide'} {selectedIndex + 1}
                        </strong>
                        <span>
                          {inTrash
                            ? selected.archivedAt
                              ? `Archivée le ${new Date(selected.archivedAt).toLocaleString('fr-FR')}`
                              : 'Archivée'
                            : selected.enabled !== false && selected.src.trim()
                              ? site.home.searchEnabled
                                ? 'Publiable · recherche active (boutons d’action masqués)'
                                : 'Visible sur le site après enregistrement'
                              : 'Hors publication (inactive ou sans image)'}
                        </span>
                      </div>
                      <div className="site-home-studio__toolbar-actions">
                        {inTrash ? (
                          <>
                            <button
                              type="button"
                              className="site-btn site-btn-ghost site-btn-sm"
                              disabled={!canEdit}
                              onClick={() => restoreSlide(selected.id)}
                            >
                              <ArchiveRestore className="h-3.5 w-3.5" aria-hidden />
                              Restaurer
                            </button>
                            <button
                              type="button"
                              className="site-btn site-btn-ghost site-btn-sm site-btn-danger"
                              disabled={!canEdit}
                              onClick={() =>
                                setSlideConfirm({ id: selected.id, mode: 'purge' })
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden />
                              Supprimer
                            </button>
                          </>
                        ) : (
                          <>
                        <label
                          className="site-home-switch"
                          title={selected.enabled !== false ? 'Active' : 'Inactive'}
                        >
                          <input
                            type="checkbox"
                            checked={selected.enabled !== false}
                            disabled={!canEdit}
                            onChange={(e) =>
                              updateSlide(selected.id, { enabled: e.target.checked })
                            }
                          />
                          <i aria-hidden />
                          <span>{selected.enabled !== false ? 'Active' : 'Inactive'}</span>
                        </label>
                        <SiteRowActions
                          disableUp={selectedIndex === 0 || !canEdit}
                          disableDown={
                            selectedIndex === slides.length - 1 || !canEdit
                          }
                              disableRemove={!canEdit || liveSlides.length <= 1}
                              onUp={() => moveSelectedSlide(-1)}
                              onDown={() => moveSelectedSlide(1)}
                              onRemove={() =>
                                setSlideConfirm({ id: selected.id, mode: 'archive' })
                              }
                        />
                        <button
                          type="button"
                          className="site-btn site-btn-ghost site-btn-sm"
                          disabled={!canEdit}
                          onClick={() => duplicateSlide(selected)}
                        >
                          <Copy className="h-3.5 w-3.5" aria-hidden />
                          Dupliquer
                        </button>
                          </>
                        )}
                      </div>
                    </div>

                    <SiteHomeHeroPreview
                      slide={selected}
                      searchEnabled={site.home.searchEnabled}
                    />

                    {!inTrash &&
                    (selected.enabled === false || !selected.src.trim()) ? (
                      <div className="site-home-banner site-home-banner--warn" role="status">
                        <p>
                          {selected.enabled === false
                            ? 'Cette slide est Inactive : le bouton et l’image n’apparaissent pas sur le site. Activez l’interrupteur « Active », puis cliquez sur Enregistrer.'
                            : 'Ajoutez une image puis Enregistrer : sans image, la slide reste hors publication.'}
                        </p>
                      </div>
                    ) : null}

                    {!inTrash ? (
                      <>
                    <div className="site-home-studio__media-actions">
                      <label className="site-btn site-btn-primary site-btn-sm">
                        <Upload className="h-3.5 w-3.5" aria-hidden />
                        {uploadingId === selected.id ? 'Import…' : 'Importer une image'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          hidden
                          disabled={!canEdit || uploadingId === selected.id}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            e.target.value = ''
                            if (file) void uploadSlideImage(selected.id, file)
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        className="site-btn site-btn-ghost site-btn-sm"
                        disabled={!canEdit}
                        onClick={() => setLibraryOpen((v) => !v)}
                      >
                        <Images className="h-3.5 w-3.5" aria-hidden />
                        {libraryOpen ? 'Fermer la médiathèque' : 'Choisir dans la médiathèque'}
                      </button>
                      {selected.src ? (
                        <button
                          type="button"
                          className="site-btn site-btn-ghost site-btn-sm"
                          disabled={!canEdit}
                          onClick={() => updateSlide(selected.id, { src: '' })}
                        >
                          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                          Retirer l’image
                        </button>
                      ) : null}
                    </div>

                    {libraryOpen ? (
                      <div className="site-home-studio__library">
                        <p>Thème & imports récents — cliquez pour appliquer.</p>
                        <div className="site-media-grid">
                          {[...(library?.theme ?? SITE_THEME_MEDIA), ...(library?.uploads ?? [])].map(
                            (item) => (
                              <button
                                key={`${item.src}-${item.label}`}
                                type="button"
                                className={cn(
                                  'site-media-tile',
                                  selected.src === item.src && 'is-selected'
                                )}
                                disabled={!canEdit}
                                onClick={() => {
                                  updateSlide(selected.id, { src: item.src })
                                  toast({ title: 'Image appliquée' })
                                }}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={item.src} alt="" />
                                <span>{item.label}</span>
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    ) : null}

                    <div className="site-grid-2">
                      <SiteField label="Sur-titre" hint="Court libellé au-dessus du titre">
                        <input
                          value={selected.kicker ?? ''}
                          disabled={!canEdit}
                          placeholder="Ex. CSIRT-ARPT"
                          onChange={(e) =>
                            updateSlide(selected.id, { kicker: e.target.value })
                          }
                        />
                      </SiteField>
                      <SiteField label="Texte alternatif" hint="Accessibilité / SEO">
                        <input
                          value={selected.alt}
                          disabled={!canEdit}
                          placeholder="Description de l’image"
                          onChange={(e) =>
                            updateSlide(selected.id, { alt: e.target.value })
                          }
                        />
                      </SiteField>
                      <SiteField label="Titre du bandeau" className="site-home-span-2">
                        <input
                          value={selected.title ?? ''}
                          disabled={!canEdit}
                          placeholder="Titre visible sur la photo"
                          onChange={(e) =>
                            updateSlide(selected.id, { title: e.target.value })
                          }
                        />
                      </SiteField>
                      <SiteField
                        label="Bouton d’action"
                        hint={
                          site.home.searchEnabled
                            ? 'Masqué sur le site tant que la barre de recherche est active'
                            : undefined
                        }
                      >
                        <input
                          value={selected.cta}
                          disabled={!canEdit}
                          placeholder="Libellé du bouton"
                          onChange={(e) =>
                            updateSlide(selected.id, { cta: e.target.value })
                          }
                        />
                      </SiteField>
                      <SiteField
                        label="Lien du bouton"
                        hint="Chemin interne ou choisissez une page du site"
                      >
                        <SiteLinkField
                          variant="home"
                          value={selected.href}
                          disabled={!canEdit}
                          placeholder="/signalement"
                          pages={pageCatalog}
                          onChange={(href) => updateSlide(selected.id, { href })}
                          onPickPage={(page) =>
                            toast({
                              title: 'Lien mis à jour',
                              description: `Bouton lié à ${page.href}.`,
                            })
                          }
                        />
                      </SiteField>
                      <div className="site-home-cta-controls">
                        <SiteField label="Style" hint="Apparence du CTA">
                          <div
                            className="site-home-seg"
                            role="radiogroup"
                            aria-label="Style du bouton"
                          >
                            {CSIRT_HERO_VARIANTS.map((style) => (
                              <button
                                key={style.id}
                                type="button"
                                role="radio"
                                aria-checked={selected.variant === style.id}
                                title={`${style.label} — ${style.hint}`}
                                className={cn(
                                  'site-home-seg__btn',
                                  `is-${style.id}`,
                                  selected.variant === style.id && 'is-active'
                                )}
                                disabled={!canEdit}
                                onClick={() =>
                                  updateSlide(selected.id, {
                                    variant: style.id as CsirtHeroVariant,
                                  })
                                }
                              >
                                <i aria-hidden />
                                <span>{style.label}</span>
                              </button>
                            ))}
                          </div>
                        </SiteField>
                        <SiteField label="Icône" hint="À gauche du libellé">
                          <div
                            className="site-home-iconbar"
                            role="radiogroup"
                            aria-label="Icône du bouton"
                          >
                            {CSIRT_HERO_CTA_ICONS.map((item) => {
                              const Icon = resolveHeroCtaIcon(item.id, selected.variant)
                              const active =
                                parseHeroCtaIcon(selected.ctaIcon, selected.variant) ===
                                item.id
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  role="radio"
                                  aria-checked={active}
                                  aria-label={item.label}
                                  title={item.label}
                                  className={cn(
                                    'site-home-iconbar__btn',
                                    active && 'is-active'
                                  )}
                                  disabled={!canEdit}
                                  onClick={() =>
                                    updateSlide(selected.id, {
                                      ctaIcon: item.id as CsirtHeroCtaIcon,
                                    })
                                  }
                                >
                                  {Icon ? (
                                    <Icon className="h-3.5 w-3.5" aria-hidden />
                                  ) : (
                                    <span aria-hidden>—</span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </SiteField>
                      </div>
                      <SiteField
                        label="URL image (avancé)"
                        hint="Modifiable aussi via import / médiathèque"
                        className="site-home-span-2"
                      >
                        <input
                          value={selected.src}
                          disabled={!canEdit}
                          placeholder="/csirt/hero-1.jpg ou /uploads/…"
                          onChange={(e) =>
                            updateSlide(selected.id, {
                              src: normalizeSiteAssetUrl(e.target.value),
                            })
                          }
                        />
                      </SiteField>
                    </div>
                      </>
                    ) : (
                      <p className="site-home-studio__trash-hint">
                        Restaurez la slide pour la modifier, ou supprimez-la définitivement.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="site-home-studio__empty is-panel">
                    <strong>{inTrash ? 'Aucune sélection' : 'Sélectionnez une slide'}</strong>
                    <p>
                      {inTrash
                        ? 'Choisissez une slide dans la corbeille.'
                        : 'Ou créez-en une pour composer le bandeau.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <SiteCard
            id="site-home-search"
            className="site-home-actions-card site-home-search-card"
            title="Barre de recherche"
            description="Textes et suggestions affichés dans le bandeau Accès rapide."
            actions={
              searchSuggestInTrash ? (
                <AdminEmptyTrashButton
                  disabled={!canEdit || trashSearchSuggestions.length === 0}
                  onClick={() => setSearchSuggestConfirm({ mode: 'empty' })}
                />
              ) : (
              <button
                type="button"
                className="site-btn site-btn-primary site-btn-sm"
                disabled={!canEdit}
                  onClick={() => {
                    const next: SiteSearchSuggestion = {
                      id: `search-${Date.now()}`,
                      label: 'Nouvelle suggestion',
                      query: 'mot-clé',
                      archived: false,
                      archivedAt: null,
                    }
                  setSite(
                    patchHome(site, {
                        searchSuggestions: [
                          ...(site.home.searchSuggestions ?? []),
                          next,
                        ],
                      })
                    )
                    setSearchSuggestScope('active')
                  }}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Suggestion
                </button>
              )
            }
          >
            <div className="site-home-section-form site-home-search-form">
              <div className="site-home-search-form__row">
                <SiteField label="Sur-titre">
                  <input
                    value={site.home.searchEyebrow ?? ''}
                    disabled={!canEdit}
                    placeholder="Accès rapide"
                    onChange={(e) =>
                      setSite(patchHome(site, { searchEyebrow: e.target.value }))
                    }
                  />
                </SiteField>
                <SiteField label="Libellé suggestions">
                  <input
                    value={site.home.searchSuggestionsLabel ?? ''}
                    disabled={!canEdit}
                    placeholder="Suggestions"
                    onChange={(e) =>
                      setSite(patchHome(site, { searchSuggestionsLabel: e.target.value }))
                    }
                  />
                </SiteField>
                <SiteField label="Libellé du bouton">
                  <input
                    value={site.home.searchSubmitLabel ?? ''}
                    disabled={!canEdit}
                    placeholder="Rechercher"
                    onChange={(e) =>
                      setSite(patchHome(site, { searchSubmitLabel: e.target.value }))
                    }
                  />
                </SiteField>
              </div>
              <SiteField label="Titre">
                <input
                  value={site.home.searchTitle ?? ''}
                  disabled={!canEdit}
                  placeholder="Trouvez une alerte, un guide ou une ressource"
                  onChange={(e) => setSite(patchHome(site, { searchTitle: e.target.value }))}
                />
              </SiteField>
              <SiteField label="Placeholder">
                <input
                  value={site.home.searchPlaceholder ?? ''}
                  disabled={!canEdit}
                  placeholder="Mot-clé, CVE, thème, opérateur…"
                  onChange={(e) =>
                    setSite(patchHome(site, { searchPlaceholder: e.target.value }))
                  }
                />
              </SiteField>
            </div>

            <div className="site-home-live-preview site-home-live-preview--search" aria-hidden>
              <CsirtSearchBar
                variant="standalone"
                config={{
                  eyebrow: site.home.searchEyebrow,
                  title: site.home.searchTitle,
                  placeholder: site.home.searchPlaceholder,
                  submitLabel: site.home.searchSubmitLabel,
                  suggestionsLabel: site.home.searchSuggestionsLabel,
                  suggestions: liveSearchSuggestions,
                }}
              />
            </div>

            <div className="site-home-search-suggest">
              <div className="site-home-search-suggest__toolbar">
                <AdminTrashScopeTabs
                  value={searchSuggestScope}
                  onChange={setSearchSuggestScope}
                  activeLabel="Actives"
                  activeCount={liveSearchSuggestions.length}
                  trashCount={trashSearchSuggestions.length}
                />
                {searchSuggestInTrash && trashSearchSuggestions.length > 0 ? (
                  <span className="site-home-search-suggest__hint">
                    Restaurables 90 j · enregistrement requis
                  </span>
                ) : null}
              </div>

              {visibleSearchSuggestions.length === 0 ? (
                searchSuggestInTrash ? (
                  <AdminTrashEmptyState
                    className="site-home-search-suggest__empty"
                    title="Corbeille vide"
                    description="Les suggestions archivées apparaîtront ici."
                    onBackToActive={() => setSearchSuggestScope('active')}
                    backLabel="Retour aux actives"
                    showTips={false}
                  />
                ) : (
                  <div className="site-home-actions-empty site-home-search-suggest__empty">
                    <strong>Aucune suggestion</strong>
                    <p>Ajoutez des chips cliquables sous le champ de recherche.</p>
                  </div>
                )
              ) : (
                <div className="site-home-actions-table-wrap">
                  <table className="site-home-actions-table site-home-actions-table--dense">
                    <thead>
                      <tr>
                        <th scope="col" className="is-num">
                          #
                        </th>
                        <th scope="col">Libellé</th>
                        <th scope="col">Requête</th>
                        <th scope="col">Lien</th>
                        <th scope="col" className="is-actions">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleSearchSuggestions.map((item, index) => (
                        <tr key={item.id || `search-${index}`}>
                          <td className="is-num" data-label="#">
                            <span>{index + 1}</span>
                          </td>
                          <td data-label="Libellé">
                            <input
                              className="site-home-actions-input"
                              value={item.label}
                              disabled={!canEdit || searchSuggestInTrash}
                              placeholder="Alertes"
                              aria-label={`Libellé suggestion ${index + 1}`}
                              onChange={(e) =>
                                updateSearchSuggestion(item.id, { label: e.target.value })
                              }
                            />
                          </td>
                          <td data-label="Requête">
                            <input
                              className="site-home-actions-input"
                              value={item.query}
                              disabled={!canEdit || searchSuggestInTrash}
                              placeholder="alerte"
                              aria-label={`Requête suggestion ${index + 1}`}
                              onChange={(e) =>
                                updateSearchSuggestion(item.id, { query: e.target.value })
                              }
                            />
                          </td>
                          <td data-label="Lien">
                            <SiteLinkField
                              variant="table"
                              value={item.href ?? ''}
                              disabled={!canEdit || searchSuggestInTrash}
                              placeholder="/chemin"
                              inputAriaLabel={`Lien suggestion ${index + 1}`}
                              pages={pageCatalog}
                              onChange={(href) =>
                                updateSearchSuggestion(item.id, {
                                  href: href || undefined,
                                })
                              }
                            />
                          </td>
                          <td className="is-actions" data-label="Actions">
                            {searchSuggestInTrash ? (
                              <div className="site-row-actions">
                                <button
                                  type="button"
                                  className="site-icon-btn"
                                  disabled={!canEdit}
                                  aria-label="Restaurer"
                                  title="Restaurer"
                                  onClick={() => restoreSearchSuggestion(item.id)}
                                >
                                  <ArchiveRestore className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  className="site-icon-btn site-icon-btn-danger"
                                  disabled={!canEdit}
                                  aria-label="Supprimer définitivement"
                                  title="Supprimer définitivement"
                                  onClick={() =>
                                    setSearchSuggestConfirm({ mode: 'purge', id: item.id })
                                  }
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <SiteRowActions
                                disableUp={index === 0 || !canEdit}
                                disableDown={
                                  index === liveSearchSuggestions.length - 1 || !canEdit
                                }
                                disableRemove={!canEdit}
                                onUp={() => {
                                  const neighbor = liveSearchSuggestions[index - 1]
                                  if (!neighbor) return
                                  const a = site.home.searchSuggestions.findIndex(
                                    (row) => row.id === item.id
                                  )
                                  const b = site.home.searchSuggestions.findIndex(
                                    (row) => row.id === neighbor.id
                                  )
                                  if (a < 0 || b < 0) return
                                  const list = [...site.home.searchSuggestions]
                                  ;[list[a], list[b]] = [list[b], list[a]]
                                  setSite(patchHome(site, { searchSuggestions: list }))
                                }}
                                onDown={() => {
                                  const neighbor = liveSearchSuggestions[index + 1]
                                  if (!neighbor) return
                                  const a = site.home.searchSuggestions.findIndex(
                                    (row) => row.id === item.id
                                  )
                                  const b = site.home.searchSuggestions.findIndex(
                                    (row) => row.id === neighbor.id
                                  )
                                  if (a < 0 || b < 0) return
                                  const list = [...site.home.searchSuggestions]
                                  ;[list[a], list[b]] = [list[b], list[a]]
                                  setSite(patchHome(site, { searchSuggestions: list }))
                                }}
                                onRemove={() => archiveSearchSuggestion(item.id)}
                              />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </SiteCard>

          <SiteCard
            id="site-home-actions"
            className="site-home-actions-card site-home-actions-card--dense"
            title="Menu Agréments, Formations, Espace RSSI"
            description="Barre de liens affichée sous la navigation principale. Décochez pour la masquer sur le site public."
            actions={
              actionLinksInTrash ? (
                <AdminEmptyTrashButton
                  disabled={!canEdit || trashActionLinks.length === 0}
                  onClick={() => setActionLinkConfirm({ mode: 'empty' })}
                />
              ) : (
                <button
                  type="button"
                  className="site-btn site-btn-primary site-btn-sm"
                  disabled={!canEdit}
                  onClick={() => {
                    const next: CsirtActionLink = {
                      id: `action-${Date.now()}`,
                      href: '/',
                      label: 'Nouveau lien',
                      archived: false,
                      archivedAt: null,
                    }
                    setSite(
                      patchHome(site, {
                        actionLinks: [...site.home.actionLinks, next],
                      })
                    )
                    setActionLinkScope('active')
                  }}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Ajouter
              </button>
              )
            }
          >
            <div className="site-home-actions-visibility">
              <SiteToggle
                label="Afficher cette zone de menu"
                checked={site.home.actionsEnabled}
                disabled={!canEdit}
                onChange={(value) => setSite(patchHome(site, { actionsEnabled: value }))}
              />
              <span className={site.home.actionsEnabled ? 'is-on' : 'is-off'}>
                {site.home.actionsEnabled ? 'Visible sur le site' : 'Masquée sur le site'}
              </span>
            </div>
            <div
              className={cn(
                'site-home-live-preview site-home-live-preview--actions',
                !site.home.actionsEnabled && 'is-hidden',
              )}
            >
              <CsirtActionBar links={liveActionLinks} />
            </div>

            <div className="site-home-dense-panel">
              <div className="site-home-dense-panel__toolbar">
                <AdminTrashScopeTabs
                  value={actionLinkScope}
                  onChange={setActionLinkScope}
                  activeLabel="Actifs"
                  activeCount={liveActionLinks.length}
                  trashCount={trashActionLinks.length}
                />
                {actionLinksInTrash && trashActionLinks.length > 0 ? (
                  <span className="site-home-dense-panel__hint">
                    Restaurables 90 j · enregistrement requis
                  </span>
                ) : null}
              </div>

              {visibleActionLinks.length === 0 ? (
                actionLinksInTrash ? (
                  <AdminTrashEmptyState
                    className="site-home-dense-panel__empty"
                    title="Corbeille vide"
                    description="Les accès rapides archivés apparaîtront ici."
                    onBackToActive={() => setActionLinkScope('active')}
                    backLabel="Retour aux actifs"
                    showTips={false}
                  />
                ) : (
                  <div className="site-home-actions-empty site-home-dense-panel__empty">
                <strong>Aucun accès rapide</strong>
                <p>Ajoutez des raccourcis visibles sur la page d’accueil.</p>
              </div>
                )
            ) : (
              <div className="site-home-actions-table-wrap">
                  <table className="site-home-actions-table site-home-actions-table--dense">
                  <thead>
                    <tr>
                      <th scope="col" className="is-num">
                        #
                      </th>
                      <th scope="col">Libellé</th>
                      <th scope="col">URL</th>
                      <th scope="col" className="is-actions">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                      {visibleActionLinks.map((link, index) => {
                        const id = ensureActionLinkId(link, allActionLinks.indexOf(link))
                        return (
                          <tr key={id}>
                        <td className="is-num" data-label="#">
                          <span>{index + 1}</span>
                        </td>
                        <td data-label="Libellé">
                          <input
                            className="site-home-actions-input"
                            value={link.label}
                                disabled={!canEdit || actionLinksInTrash}
                            placeholder="Libellé"
                            aria-label={`Libellé ${index + 1}`}
                            onChange={(e) =>
                                  updateActionLink(id, { label: e.target.value })
                            }
                          />
                        </td>
                        <td data-label="URL">
                          <SiteLinkField
                            variant="table"
                            value={link.href}
                                disabled={!canEdit || actionLinksInTrash}
                            placeholder="/chemin"
                            inputAriaLabel={`URL ${index + 1}`}
                            pages={pageCatalog}
                                onChange={(href) => updateActionLink(id, { href })}
                          />
                        </td>
                        <td className="is-actions" data-label="Actions">
                              {actionLinksInTrash ? (
                                <div className="site-row-actions">
                                  <button
                                    type="button"
                                    className="site-icon-btn"
                                    disabled={!canEdit}
                                    aria-label="Restaurer"
                                    title="Restaurer"
                                    onClick={() => restoreActionLink(id)}
                                  >
                                    <ArchiveRestore className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    className="site-icon-btn site-icon-btn-danger"
                                    disabled={!canEdit}
                                    aria-label="Supprimer définitivement"
                                    title="Supprimer définitivement"
                                    onClick={() =>
                                      setActionLinkConfirm({ mode: 'purge', id })
                                    }
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ) : (
                          <SiteRowActions
                            disableUp={index === 0 || !canEdit}
                            disableDown={
                                    index === liveActionLinks.length - 1 || !canEdit
                            }
                            disableRemove={!canEdit}
                                  onUp={() => {
                                    const neighbor = liveActionLinks[index - 1]
                                    if (!neighbor) return
                                    const a = site.home.actionLinks.findIndex(
                                      (row, i) => ensureActionLinkId(row, i) === id
                                    )
                                    const b = site.home.actionLinks.findIndex(
                                      (row, i) =>
                                        ensureActionLinkId(row, i) ===
                                        ensureActionLinkId(
                                          neighbor,
                                          allActionLinks.indexOf(neighbor)
                                        )
                                    )
                                    if (a < 0 || b < 0) return
                                    const list = [...site.home.actionLinks]
                                    ;[list[a], list[b]] = [list[b], list[a]]
                                    setSite(patchHome(site, { actionLinks: list }))
                                  }}
                                  onDown={() => {
                                    const neighbor = liveActionLinks[index + 1]
                                    if (!neighbor) return
                                    const a = site.home.actionLinks.findIndex(
                                      (row, i) => ensureActionLinkId(row, i) === id
                                    )
                                    const b = site.home.actionLinks.findIndex(
                                      (row, i) =>
                                        ensureActionLinkId(row, i) ===
                                        ensureActionLinkId(
                                          neighbor,
                                          allActionLinks.indexOf(neighbor)
                                        )
                                    )
                                    if (a < 0 || b < 0) return
                                    const list = [...site.home.actionLinks]
                                    ;[list[a], list[b]] = [list[b], list[a]]
                                    setSite(patchHome(site, { actionLinks: list }))
                                  }}
                                  onRemove={() => archiveActionLink(id)}
                                />
                              )}
                        </td>
                      </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            )}
            </div>
          </SiteCard>
          </>
          )}

          <SiteCard id="site-home-response" className="site-home-section-card" title="Dispositif de réponse">
            <div className="site-home-section-split">
              <div className="site-home-section-form">
            <div className="site-grid-2">
              <SiteField label="Sur-titre (marque)">
                <input
                  value={site.home.response.kicker}
                  disabled={!canEdit}
                  onChange={(e) =>
                    setSite(
                      patchHome(site, {
                        response: { ...site.home.response, kicker: e.target.value },
                      })
                    )
                  }
                />
              </SiteField>
              <SiteField label="Statut opérationnel">
                <input
                  value={site.home.response.statusLabel}
                  disabled={!canEdit}
                  onChange={(e) =>
                    setSite(
                      patchHome(site, {
                        response: { ...site.home.response, statusLabel: e.target.value },
                      })
                    )
                  }
                />
              </SiteField>
            </div>
            <SiteField label="Titre">
              <input
                value={site.home.response.title}
                disabled={!canEdit}
                onChange={(e) =>
                  setSite(
                    patchHome(site, {
                      response: { ...site.home.response, title: e.target.value },
                    })
                  )
                }
              />
            </SiteField>
            <SiteField label="Chapô">
              <textarea
                value={site.home.response.lead}
                disabled={!canEdit}
                onChange={(e) =>
                  setSite(
                    patchHome(site, {
                      response: { ...site.home.response, lead: e.target.value },
                    })
                  )
                }
              />
            </SiteField>
            <div className="site-grid-2">
              <SiteField label="Bouton principal">
                <input
                  value={site.home.response.ctaLabel}
                  disabled={!canEdit}
                  onChange={(e) =>
                    setSite(
                      patchHome(site, {
                        response: { ...site.home.response, ctaLabel: e.target.value },
                      })
                    )
                  }
                />
              </SiteField>
              <SiteField label="Lien principal">
                <SiteLinkField
                  value={site.home.response.ctaHref}
                  disabled={!canEdit}
                  pages={pageCatalog}
                  onChange={(ctaHref) =>
                    setSite(
                      patchHome(site, {
                        response: { ...site.home.response, ctaHref },
                      })
                    )
                  }
                />
              </SiteField>
              <SiteField label="Bouton secondaire">
                <input
                  value={site.home.response.secondaryLabel}
                  disabled={!canEdit}
                  onChange={(e) =>
                    setSite(
                      patchHome(site, {
                        response: { ...site.home.response, secondaryLabel: e.target.value },
                      })
                    )
                  }
                />
              </SiteField>
              <SiteField label="Lien secondaire">
                <SiteLinkField
                  value={site.home.response.secondaryHref}
                  disabled={!canEdit}
                  pages={pageCatalog}
                  onChange={(secondaryHref) =>
                    setSite(
                      patchHome(site, {
                        response: { ...site.home.response, secondaryHref },
                      })
                    )
                  }
                />
              </SiteField>
            </div>
            <div className="site-home-response-pillars">
              {site.home.response.pillars.map((pillar, index) => (
                <div key={pillar.id} className="site-grid-2">
                  <SiteField label={`Pilier ${index + 1} — titre`}>
                    <input
                      value={pillar.title}
                      disabled={!canEdit}
                      onChange={(e) => {
                        const pillars = site.home.response.pillars.map((item) =>
                          item.id === pillar.id ? { ...item, title: e.target.value } : item
                        )
                        setSite(patchHome(site, { response: { ...site.home.response, pillars } }))
                      }}
                    />
                  </SiteField>
                  <SiteField label="Lien">
                    <SiteLinkField
                      value={pillar.href}
                      disabled={!canEdit}
                      pages={pageCatalog}
                      onChange={(href) => {
                        const pillars = site.home.response.pillars.map((item) =>
                          item.id === pillar.id ? { ...item, href } : item
                        )
                        setSite(patchHome(site, { response: { ...site.home.response, pillars } }))
                      }}
                    />
                  </SiteField>
                  <SiteField label="Texte" className="site-span-2">
                    <textarea
                      value={pillar.body}
                      disabled={!canEdit}
                      onChange={(e) => {
                        const pillars = site.home.response.pillars.map((item) =>
                          item.id === pillar.id ? { ...item, body: e.target.value } : item
                        )
                        setSite(patchHome(site, { response: { ...site.home.response, pillars } }))
                      }}
                    />
                  </SiteField>
                </div>
              ))}
            </div>
              </div>
              <aside className="site-home-section-aside">
                <p className="site-home-preview-eyebrow">Aperçu site public</p>
                <div className="site-home-live-preview site-home-live-preview--response">
                  <CsirtResponseSection response={site.home.response} />
                </div>
              </aside>
            </div>
          </SiteCard>

          <SiteCard id="site-home-missions" className="site-home-section-card" title="Bandeau missions">
            <div className="site-home-section-split">
              <div className="site-home-section-form">
            <SiteField label="Titre">
              <input
                value={site.home.missions.title}
                disabled={!canEdit}
                onChange={(e) =>
                  setSite(
                    patchHome(site, {
                      missions: { ...site.home.missions, title: e.target.value },
                    })
                  )
                }
              />
            </SiteField>
            <SiteField label="Texte">
              <textarea
                value={site.home.missions.body}
                disabled={!canEdit}
                onChange={(e) =>
                  setSite(
                    patchHome(site, {
                      missions: { ...site.home.missions, body: e.target.value },
                    })
                  )
                }
              />
            </SiteField>
            <div className="site-grid-2">
              <SiteField label="Bouton">
                <input
                  value={site.home.missions.ctaLabel}
                  disabled={!canEdit}
                  onChange={(e) =>
                    setSite(
                      patchHome(site, {
                        missions: {
                          ...site.home.missions,
                          ctaLabel: e.target.value,
                        },
                      })
                    )
                  }
                />
              </SiteField>
              <SiteField label="Lien">
                <SiteLinkField
                  value={site.home.missions.ctaHref}
                  disabled={!canEdit}
                  pages={pageCatalog}
                  onChange={(ctaHref) =>
                    setSite(
                      patchHome(site, {
                        missions: {
                          ...site.home.missions,
                          ctaHref,
                        },
                      })
                    )
                  }
                />
              </SiteField>
            </div>
              </div>
              <aside className="site-home-section-aside">
                <p className="site-home-preview-eyebrow">Aperçu site public</p>
                <div className="site-home-live-preview site-home-live-preview--missions">
                  <CsirtMissionsBanner missions={site.home.missions} />
                </div>
              </aside>
            </div>
          </SiteCard>

          {false && (
          <SiteCard
            className="site-home-section-card"
            title="Comprendre. Prévenir. Réagir."
            description="Bandeau de clôture : actualités, signalement d’incident et garanties institutionnelles."
          >
            <div className="site-home-section-split">
              <div className="site-home-section-form">
                <SiteField label="Titre">
                  <input
                    value={site.home.vigilance.title}
                    disabled={!canEdit}
                    onChange={(e) =>
                      setSite(
                        patchHome(site, {
                          vigilance: { ...site.home.vigilance, title: e.target.value },
                        })
                      )
                    }
                  />
                </SiteField>
                <div className="site-grid-2">
                  <SiteField label="Statut opérationnel">
                    <input
                      value={site.home.vigilance.statusLabel}
                      disabled={!canEdit}
                      placeholder="Veille active · 24h/24"
                      onChange={(e) =>
                        setSite(
                          patchHome(site, {
                            vigilance: {
                              ...site.home.vigilance,
                              statusLabel: e.target.value,
                            },
                          })
                        )
                      }
                    />
                  </SiteField>
                  <SiteField label="Introduction">
                    <input
                      value={site.home.vigilance.lead}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setSite(
                          patchHome(site, {
                            vigilance: { ...site.home.vigilance, lead: e.target.value },
                          })
                        )
                      }
                    />
                  </SiteField>
                </div>

                <p className="site-home-subsection-title">Carte actualités</p>
                <div className="site-grid-2">
                  <SiteField label="Sur-titre">
                    <input
                      value={site.home.vigilance.newsLane.kicker}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setSite(
                          patchHome(site, {
                            vigilance: {
                              ...site.home.vigilance,
                              newsLane: {
                                ...site.home.vigilance.newsLane,
                                kicker: e.target.value,
                              },
                            },
                          })
                        )
                      }
                    />
                  </SiteField>
                  <SiteField label="Titre">
                    <input
                      value={site.home.vigilance.newsLane.title}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setSite(
                          patchHome(site, {
                            vigilance: {
                              ...site.home.vigilance,
                              newsLane: {
                                ...site.home.vigilance.newsLane,
                                title: e.target.value,
                              },
                            },
                          })
                        )
                      }
                    />
                  </SiteField>
                  <SiteField label="Bouton">
                    <input
                      value={site.home.vigilance.newsLane.ctaLabel}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setSite(
                          patchHome(site, {
                            vigilance: {
                              ...site.home.vigilance,
                              newsLane: {
                                ...site.home.vigilance.newsLane,
                                ctaLabel: e.target.value,
                              },
                            },
                          })
                        )
                      }
                    />
                  </SiteField>
                  <SiteField label="Lien">
                    <SiteLinkField
                      value={site.home.vigilance.newsLane.href}
                      disabled={!canEdit}
                      pages={pageCatalog}
                      onChange={(href) =>
                        setSite(
                          patchHome(site, {
                            vigilance: {
                              ...site.home.vigilance,
                              newsLane: { ...site.home.vigilance.newsLane, href },
                            },
                          })
                        )
                      }
                    />
                  </SiteField>
                </div>

                <p className="site-home-subsection-title">Carte urgence</p>
                <div className="site-grid-2">
                  <SiteField label="Sur-titre">
                    <input
                      value={site.home.vigilance.alertLane.kicker}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setSite(
                          patchHome(site, {
                            vigilance: {
                              ...site.home.vigilance,
                              alertLane: {
                                ...site.home.vigilance.alertLane,
                                kicker: e.target.value,
                              },
                            },
                          })
                        )
                      }
                    />
                  </SiteField>
                  <SiteField label="Titre">
                    <input
                      value={site.home.vigilance.alertLane.title}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setSite(
                          patchHome(site, {
                            vigilance: {
                              ...site.home.vigilance,
                              alertLane: {
                                ...site.home.vigilance.alertLane,
                                title: e.target.value,
                              },
                            },
                          })
                        )
                      }
                    />
                  </SiteField>
                  <SiteField label="Bouton">
                    <input
                      value={site.home.vigilance.alertLane.ctaLabel}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setSite(
                          patchHome(site, {
                            vigilance: {
                              ...site.home.vigilance,
                              alertLane: {
                                ...site.home.vigilance.alertLane,
                                ctaLabel: e.target.value,
                              },
                            },
                          })
                        )
                      }
                    />
                  </SiteField>
                  <SiteField label="Lien">
                    <SiteLinkField
                      value={site.home.vigilance.alertLane.href}
                      disabled={!canEdit}
                      pages={pageCatalog}
                      onChange={(href) =>
                        setSite(
                          patchHome(site, {
                            vigilance: {
                              ...site.home.vigilance,
                              alertLane: { ...site.home.vigilance.alertLane, href },
                            },
                          })
                        )
                      }
                    />
                  </SiteField>
                </div>

                <p className="site-home-subsection-title">Garanties (pied de section)</p>
                <div className="site-grid-3">
                  {site.home.vigilance.assurance.map((item, index) => (
                    <SiteField key={`assurance-${index}`} label={`Libellé ${index + 1}`}>
                      <input
                        value={item}
                        disabled={!canEdit}
                        onChange={(e) => {
                          const assurance = [...site.home.vigilance.assurance] as [
                            string,
                            string,
                            string,
                          ]
                          assurance[index] = e.target.value
                          setSite(
                            patchHome(site, {
                              vigilance: { ...site.home.vigilance, assurance },
                            })
                          )
                        }}
                      />
                    </SiteField>
                  ))}
                </div>
              </div>
              <aside className="site-home-section-aside">
                <p className="site-home-preview-eyebrow">Aperçu site public</p>
                <div className="site-home-live-preview site-home-live-preview--vigilance">
                  <CsirtVigilanceSection vigilance={site.home.vigilance} />
                </div>
              </aside>
            </div>
          </SiteCard>
          )}
        </div>
      ) : null}

      <AdminConfirmDialog
        open={Boolean(slideConfirm)}
        onOpenChange={(open) => !open && setSlideConfirm(null)}
        title={
          slideConfirm?.mode === 'purge'
            ? 'Supprimer définitivement ?'
            : 'Mettre cette slide en corbeille ?'
        }
        message={
          slideConfirm?.mode === 'purge'
            ? 'La diapositive sera définitivement retirée. Cette action est irréversible après enregistrement.'
            : 'La slide quittera le diaporama public et restera en corbeille pendant 3 mois. Enregistrez pour confirmer.'
        }
        confirmLabel={slideConfirm?.mode === 'purge' ? 'Supprimer' : 'Corbeille'}
        intent="destructive"
        onConfirm={() => {
          if (!slideConfirm) return
          if (slideConfirm.mode === 'purge') purgeSlide(slideConfirm.id)
          else archiveSlide(slideConfirm.id)
        }}
      />

      <AdminConfirmDialog
        open={Boolean(searchSuggestConfirm)}
        onOpenChange={(open) => !open && setSearchSuggestConfirm(null)}
        title={
          searchSuggestConfirm?.mode === 'empty'
            ? 'Vider la corbeille des suggestions ?'
            : 'Supprimer définitivement ?'
        }
        message={
          searchSuggestConfirm?.mode === 'empty'
            ? 'Toutes les suggestions archivées seront définitivement retirées. Enregistrez pour confirmer.'
            : 'Cette suggestion sera définitivement retirée. Enregistrez pour confirmer.'
        }
        confirmLabel="Supprimer"
        intent="destructive"
        onConfirm={() => {
          if (!searchSuggestConfirm) return
          if (searchSuggestConfirm.mode === 'empty') emptySearchSuggestTrash()
          else purgeSearchSuggestion(searchSuggestConfirm.id)
        }}
      />

      <AdminConfirmDialog
        open={Boolean(actionLinkConfirm)}
        onOpenChange={(open) => !open && setActionLinkConfirm(null)}
        title={
          actionLinkConfirm?.mode === 'empty'
            ? 'Vider la corbeille des accès rapides ?'
            : 'Supprimer définitivement ?'
        }
        message={
          actionLinkConfirm?.mode === 'empty'
            ? 'Tous les accès rapides archivés seront définitivement retirés. Enregistrez pour confirmer.'
            : 'Ce lien sera définitivement retiré. Enregistrez pour confirmer.'
        }
        confirmLabel="Supprimer"
        intent="destructive"
        onConfirm={() => {
          if (!actionLinkConfirm) return
          if (actionLinkConfirm.mode === 'empty') emptyActionLinkTrash()
          else purgeActionLink(actionLinkConfirm.id)
        }}
      />
    </SiteShell>
  )
}
