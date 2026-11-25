'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Clapperboard,
  FileText,
  ImagePlus,
  Link2,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { SiteField, SiteToggle } from '@/components/admin/site/site-fields'
import { SiteRichEditor } from '@/components/admin/site/site-rich-editor-lazy'
import { useSiteEditor } from '@/components/admin/site/use-site-editor'
import { CsirtAccessibilitePage } from '@/components/csirt/csirt-accessibilite'
import { CsirtConfidentialitePage } from '@/components/csirt/csirt-confidentialite'
import { CsirtAboutPage } from '@/components/csirt/csirt-about'
import { CsirtMentionsLegalesPage } from '@/components/csirt/csirt-mentions-legales'
import { CsirtSitemap } from '@/components/csirt/csirt-sitemap'
import { toast } from '@/hooks/use-toast'
import { publishableVideos } from '@/lib/csirt/home-content'
import { siteBodyToEditorHtml } from '@/lib/site/body-html'
import { newSiteId } from '@/lib/site/ids'
import { RESOURCE_CATEGORY_OPTIONS } from '@/lib/site/resource-categories'
import type {
  SiteAboutContent,
  SiteA11yContent,
  SiteDiscoverContent,
  SiteMentionsContent,
  SitePage,
  SitePageDocument,
  SitePageGroup,
  SitePageLayout,
  SitePrivacyContent,
  SitePublicationCategory,
  SiteSitemapContent,
} from '@/lib/site/types'
import { DEFAULT_ABOUT_CONTENT, sanitizeAboutContent } from '@/lib/site/about-defaults'
import { DEFAULT_DISCOVER_CONTENT, sanitizeDiscoverContent } from '@/lib/site/discover-defaults'
import {
  DEFAULT_A11Y_CONTENT,
  DEFAULT_MENTIONS_CONTENT,
  DEFAULT_PRIVACY_CONTENT,
  sanitizeA11yContent,
  sanitizeMentionsContent,
  sanitizePrivacyContent,
} from '@/lib/site/legal-defaults'
import { DEFAULT_SITEMAP_CONTENT, sanitizeSitemapContent } from '@/lib/site/sitemap-defaults'
import { cn } from '@/lib/utils'
import { DG_SITE_ROUTES, dgSitePageEditHref } from '@/lib/dg/site-routes'
import { CSIRT_BRAND } from '@/lib/csirt/brand'
import '@/components/admin/site/site-admin.css'
import '@/components/csirt/csirt-home.css'
import '@/components/csirt/csirt-discover.css'
import '@/components/csirt/csirt-sitemap.css'
import '@/components/csirt/csirt-mentions-legales.css'
import '@/components/csirt/csirt-confidentialite.css'
import '@/components/csirt/csirt-accessibilite.css'
import '@/components/csirt/csirt-legal-edit.css'

const DEFAULT_PAGE_GROUP: SitePageGroup = 'Services'
const DISCOVER_PATH = '/csirt-arpt'
const SITEMAP_PATH = '/plan-du-site'
const MENTIONS_PATH = '/mentions-legales'
const PRIVACY_PATH = '/confidentialite'
const A11Y_PATH = '/accessibilite'
const DISCOVER_HERO_FALLBACK = '/csirt/discover-hero.jpg?v=3'

const NON_EDITORIAL_PATHS = new Set(['/signalement', '/contacts', '/recherche', '/actualites'])
const NON_EDITORIAL_HINT: Record<string, string> = {
  '/signalement': 'Cette page est un formulaire métier. L’édition TipTap n’affecte pas le portail public.',
  '/contacts': 'Les coordonnées se gèrent dans /dg/contact (réglages plateforme).',
  '/recherche': 'Le moteur de recherche a une interface figée ; seul le titre/lead catalogue est stocké.',
  '/actualites': 'L’archive actualités se gère via Actualités / Collected, pas via ce corps de page.',
}

type PageForm = {
  originalPath: string | null
  path: string
  title: string
  lead: string
  body: string
  /** Conservé en base, plus exposé dans l’UI (non pertinent pour ce projet). */
  group: SitePageGroup
  published: boolean
  featuredImage: string
  layout: SitePageLayout
  videoIds: string[]
  documentsEnabled: boolean
  documents: SitePageDocument[]
  discover: SiteDiscoverContent
  about: SiteAboutContent
  sitemap: SiteSitemapContent
  mentions: SiteMentionsContent
  privacy: SitePrivacyContent
  a11y: SiteA11yContent
}

function emptyForm(): PageForm {
  return {
    originalPath: null,
    path: '/',
    title: '',
    lead: '',
    body: '',
    group: DEFAULT_PAGE_GROUP,
    published: true,
    featuredImage: '',
    layout: 'article',
    videoIds: [],
    documentsEnabled: false,
    documents: [],
    discover: DEFAULT_DISCOVER_CONTENT,
    about: DEFAULT_ABOUT_CONTENT,
    sitemap: DEFAULT_SITEMAP_CONTENT,
    mentions: DEFAULT_MENTIONS_CONTENT,
    privacy: DEFAULT_PRIVACY_CONTENT,
    a11y: DEFAULT_A11Y_CONTENT,
  }
}

function formatBytes(size?: number) {
  if (!size || size <= 0) return ''
  if (size < 1024) return `${size} o`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} Ko`
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`
}

function humanizePdfTitle(fileName: string) {
  const base = fileName.replace(/\.pdf$/i, '').trim()
  if (!base) return 'Document PDF'
  if (/^(document|file|pdf)[-_][a-z0-9]{8,}$/i.test(base)) return 'Document PDF'
  return base.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function normalizePath(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return '/'
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return withSlash.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/'
}

function slugifyTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function isStructuredContentPath(path: string) {
  return (
    path === DISCOVER_PATH ||
    path === SITEMAP_PATH ||
    path === MENTIONS_PATH ||
    path === PRIVACY_PATH ||
    path === A11Y_PATH
  )
}

function formFromPage(page: SitePage): PageForm {
  return {
    originalPath: page.path,
    path: page.path,
    title: page.title,
    lead: page.lead,
    body: siteBodyToEditorHtml(page.body),
    group: page.group,
    published: page.published,
    featuredImage: page.featuredImage ?? '',
    layout: page.extensions?.layout === 'videos' || page.extensions?.layout === 'resources'
      ? page.extensions.layout
      : 'article',
    videoIds: page.extensions?.videoIds ?? [],
    documentsEnabled:
      page.extensions?.documents === true || (page.documents?.length ?? 0) > 0,
    documents: page.documents ?? [],
    discover: sanitizeDiscoverContent(page.extensions?.discover),
    about: sanitizeAboutContent(page.extensions?.about),
    sitemap: sanitizeSitemapContent(page.extensions?.sitemap),
    mentions: sanitizeMentionsContent(page.extensions?.mentions),
    privacy: sanitizePrivacyContent(page.extensions?.privacy),
    a11y: sanitizeA11yContent(page.extensions?.a11y),
  }
}

export function sitePageEditHref(path: string) {
  return dgSitePageEditHref(path)
}

type Props = {
  mode: 'create' | 'edit'
  /** Chemin de la page à éditer (mode edit). */
  editPath?: string | null
}

export function SitePageWorkspace({ mode, editPath }: Props) {
  const router = useRouter()
  const { site, persistSite, loading, saving, canEdit } = useSiteEditor()
  const [form, setForm] = useState<PageForm>(emptyForm)
  const [hydrated, setHydrated] = useState(mode === 'create')
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const pages = site?.pages ?? []
  const libraryVideos = useMemo(
    () =>
      publishableVideos(site?.videos).filter((video) => (video.format ?? 'video') !== 'document'),
    [site?.videos]
  )
  const normalizedPath = normalizePath(form.path)
  const isDiscoverPage = normalizedPath === DISCOVER_PATH
  const isSitemapPage = normalizedPath === SITEMAP_PATH
  const isMentionsPage = normalizedPath === MENTIONS_PATH
  const isPrivacyPage = normalizedPath === PRIVACY_PATH
  const isA11yPage = normalizedPath === A11Y_PATH
  const isLegalLayoutPage = isMentionsPage || isPrivacyPage || isA11yPage
  const isNonEditorial = NON_EDITORIAL_PATHS.has(normalizedPath)
  const portalHeroSrc = form.featuredImage.trim() || (isDiscoverPage ? DISCOVER_HERO_FALLBACK : '')

  const pageToEdit = useMemo(() => {
    if (mode !== 'edit' || !editPath) return null
    const normalized = normalizePath(editPath)
    return pages.find((page) => page.path === normalized) ?? null
  }, [mode, editPath, pages])

  useEffect(() => {
    if (mode !== 'edit') return
    if (loading) return
    if (!site) return
    if (hydrated) return
    if (!editPath) {
      toast({
        variant: 'destructive',
        title: 'Page introuvable',
        description: 'Aucun chemin fourni.',
      })
      router.replace(DG_SITE_ROUTES.pages)
      return
    }
    if (!pageToEdit) {
      toast({
        variant: 'destructive',
        title: 'Page introuvable',
        description: `Aucune page pour ${normalizePath(editPath)}.`,
      })
      router.replace(DG_SITE_ROUTES.pages)
      return
    }
    setForm(() => {
      const next = formFromPage(pageToEdit)
      if (
        next.path === DISCOVER_PATH &&
        (!next.title.trim() || next.title.trim() === 'Découvrir le CSIRT-ARPT')
      ) {
        next.title = 'Centre national de réponse aux incidents'
      }
      if (
        next.path === DISCOVER_PATH &&
        !next.lead.trim()
      ) {
        next.lead = `Service de l'${CSIRT_BRAND.parent} — présence officielle pour informer, coordonner et recevoir les signalements de cybersécurité.`
      }
      return next
    })
    setHydrated(true)
  }, [mode, loading, site, editPath, pageToEdit, router, hydrated])

  const uploadCover = async (file: File) => {
    setUploadingCover(true)
    try {
      const body = new FormData()
      body.set('file', file)
      const res = await fetch('/api/admin/site/media', { method: 'POST', body })
      const json = (await res.json().catch(() => ({}))) as { url?: string }
      if (!res.ok || !json.url) {
        toast({
          variant: 'destructive',
          title: 'Import impossible',
          description: 'Formats acceptés : PNG, JPG, WebP, GIF, SVG.',
        })
        return
      }
      setForm((prev) => ({ ...prev, featuredImage: json.url! }))
      toast({ title: 'Image à la une ajoutée' })
    } finally {
      setUploadingCover(false)
    }
  }

  const patchDocument = (id: string, patch: Partial<SitePageDocument>) => {
    setForm((prev) => ({
      ...prev,
      documents: prev.documents.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }))
  }

  const uploadDocument = async (file: File) => {
    setUploadingDoc(true)
    try {
      const body = new FormData()
      body.set('file', file)
      const res = await fetch('/api/admin/site/media', { method: 'POST', body })
      const json = (await res.json().catch(() => ({}))) as {
        url?: string
        mimeType?: string
        size?: number
        message?: string
      }
      if (!res.ok || !json.url) {
        toast({
          variant: 'destructive',
          title: 'PDF non importé',
          description: json.message || 'Fichier PDF uniquement (max. 15 Mo).',
        })
        return
      }
      const doc: SitePageDocument = {
        id: newSiteId('doc'),
        title: humanizePdfTitle(file.name),
        url: json.url,
        mimeType: json.mimeType || 'application/pdf',
        size: json.size,
        dateIso: new Date().toISOString().slice(0, 10),
      }
      setForm((prev) => ({
        ...prev,
        documentsEnabled: true,
        documents: [...prev.documents, doc],
      }))
      toast({ title: 'Document PDF ajouté' })
    } finally {
      setUploadingDoc(false)
    }
  }

  const savePage = async () => {
    if (!site || !canEdit || submitting) return

    const title = form.title.trim()
    const path = normalizePath(form.path || `/${slugifyTitle(title)}`)
    if (!title) {
      toast({
        variant: 'destructive',
        title: 'Titre requis',
        description: 'Indiquez le titre de la page.',
      })
      return
    }
    if (!path || path === '/') {
      toast({
        variant: 'destructive',
        title: 'URL invalide',
        description: 'Choisissez un chemin du type /ma-page.',
      })
      return
    }

    const conflict = pages.some((page) => {
      if (mode === 'edit' && page.path === form.originalPath) return false
      return page.path === path
    })
    if (conflict) {
      toast({
        variant: 'destructive',
        title: 'URL déjà utilisée',
        description: `Le chemin ${path} existe déjà.`,
      })
      return
    }

    const existing =
      mode === 'edit' ? pages.find((page) => page.path === form.originalPath) : undefined

    const nextPage: SitePage = {
      path,
      title,
      lead: form.lead.trim(),
      body: isStructuredContentPath(path) ? '' : form.body,
      group: form.group,
      published: form.published,
      createdAt: existing?.createdAt || new Date().toISOString(),
      featuredImage: form.featuredImage.trim() || undefined,
      extensions: {
        documents: form.layout === 'resources' || form.documentsEnabled,
        layout: form.layout,
        ...(form.layout === 'videos' ? { videoIds: form.videoIds } : {}),
        ...(path === DISCOVER_PATH ? { discover: form.discover, about: form.about } : {}),
        ...(path === SITEMAP_PATH ? { sitemap: form.sitemap } : {}),
        ...(path === MENTIONS_PATH ? { mentions: form.mentions } : {}),
        ...(path === PRIVACY_PATH ? { privacy: form.privacy } : {}),
        ...(path === A11Y_PATH ? { a11y: form.a11y } : {}),
      },
      documents: form.layout === 'resources' || form.documentsEnabled ? form.documents : [],
      archived: existing?.archived ?? false,
      archivedAt: existing?.archivedAt ?? null,
    }

    const nextPages =
      mode === 'create'
        ? [...pages, nextPage]
        : pages.map((page) => (page.path === form.originalPath ? nextPage : page))

    setSubmitting(true)
    try {
      const ok = await persistSite({ ...site, pages: nextPages }, { quiet: true })
      if (!ok) return
      toast({
        title: mode === 'create' ? 'Page créée' : 'Page mise à jour',
        description:
          mode === 'create'
            ? `« ${title} » est enregistrée.`
            : `« ${title} » a été mise à jour.`,
      })
      router.push(DG_SITE_ROUTES.pages)
    } finally {
      setSubmitting(false)
    }
  }

  const busy = loading || !hydrated || saving || submitting
  const readOnly = !canEdit || busy

  return (
    <div className="site-admin site-wp-workspace">
      <header className="site-wp-workspace__header">
        <div className="site-wp-workspace__heading">
          <Link href={DG_SITE_ROUTES.pages} className="site-wp-workspace__back">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Pages
          </Link>
          <div className="site-wp-workspace__titles">
            <div className="site-wp-workspace__title-row">
              <h1>
                {mode === 'create' ? 'Ajouter une page' : 'Modifier la page'}
              </h1>
              <span className={cn('site-wp-workspace__mode', mode === 'create' ? 'is-create' : 'is-edit')}>
                {mode === 'create' ? 'Nouveau' : 'Édition'}
              </span>
            </div>
            <p>Article, médiathèque vidéo ou partage de ressources PDF.</p>
          </div>
        </div>
        <div className="site-wp-workspace__actions">
          {form.path && form.path !== '/' ? (
            <Link
              href={form.path}
              target="_blank"
              rel="noreferrer"
              className="site-btn site-btn-ghost site-btn-sm"
            >
              Aperçu
            </Link>
          ) : null}
          <Link href={DG_SITE_ROUTES.pages} className="site-btn site-btn-ghost site-btn-sm">
            Annuler
          </Link>
          <button
            type="button"
            className="site-btn site-btn-primary site-btn-sm"
            disabled={readOnly}
            onClick={() => void savePage()}
          >
            {submitting || saving
              ? 'Enregistrement…'
              : mode === 'create'
                ? 'Créer'
                : 'Mettre à jour'}
          </button>
        </div>
      </header>

      {loading || !hydrated ? (
        <div className="site-wp-workspace__loading">Chargement de l’éditeur…</div>
      ) : (
        <div className="site-wp-workspace__layout">
          <div className="site-wp-workspace__main">
            {isNonEditorial ? (
              <div className="site-wp-non-editorial" role="status">
                <strong>Page applicative</strong>
                <p>
                  {NON_EDITORIAL_HINT[normalizedPath] ||
                    'Cette page n’est pas un contenu éditorial TipTap du portail.'}
                </p>
              </div>
            ) : null}
            <div
              className={cn(
                'site-wp-portal-canvas',
                isDiscoverPage && 'site-wp-portal-canvas--discover',
                isSitemapPage && 'site-wp-portal-canvas--sitemap',
                isLegalLayoutPage && 'site-wp-portal-canvas--legal'
              )}
            >
              {isDiscoverPage ? (
                <div className="site-article-shell site-wp-portal-shell">
                  <div className="site-article-band" aria-hidden />
                  <CsirtAboutPage
                    editable
                    disabled={readOnly}
                    content={form.about}
                    onContentChange={(about) => setForm((prev) => ({ ...prev, about }))}
                  />
                </div>
              ) : isSitemapPage ? (
                <div className="site-article-shell site-wp-portal-shell">
                  <div className="site-article-band" aria-hidden />
                  <div className="site-article csirt-sitemap-shell">
                    <CsirtSitemap
                      editable
                      disabled={readOnly}
                      title={form.title}
                      lead={form.lead}
                      content={form.sitemap}
                      onContentChange={(sitemap) =>
                        setForm((prev) => ({ ...prev, sitemap }))
                      }
                      titleSlot={
                        <input
                          className="site-wp-portal-hero-title csirt-sitemap__edit-title"
                          value={form.title}
                          disabled={readOnly}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, title: event.target.value }))
                          }
                          placeholder="Titre du plan du site"
                          maxLength={120}
                        />
                      }
                      leadSlot={
                        <textarea
                          className="site-wp-portal-hero-lead csirt-sitemap__edit-lead"
                          value={form.lead}
                          disabled={readOnly}
                          rows={2}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, lead: event.target.value }))
                          }
                          placeholder="Accroche sous le titre"
                          maxLength={400}
                        />
                      }
                    />
                  </div>
                </div>
              ) : isMentionsPage ? (
                <div className="site-article-shell site-wp-portal-shell">
                  <div className="site-article-band" aria-hidden />
                  <div className="site-article csirt-legal-shell">
                    <CsirtMentionsLegalesPage
                      editable
                      disabled={readOnly}
                      title={form.title}
                      lead={form.lead}
                      content={form.mentions}
                      onContentChange={(mentions) =>
                        setForm((prev) => ({ ...prev, mentions }))
                      }
                      titleSlot={
                        <input
                          className="site-wp-portal-hero-title"
                          value={form.title}
                          disabled={readOnly}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, title: event.target.value }))
                          }
                          placeholder="Titre"
                          maxLength={120}
                        />
                      }
                      leadSlot={
                        <textarea
                          className="site-wp-portal-hero-lead"
                          value={form.lead}
                          disabled={readOnly}
                          rows={2}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, lead: event.target.value }))
                          }
                          placeholder="Accroche"
                          maxLength={400}
                        />
                      }
                    />
                  </div>
                </div>
              ) : isPrivacyPage ? (
                <div className="site-article-shell site-wp-portal-shell">
                  <div className="site-article-band" aria-hidden />
                  <div className="site-article csirt-privacy-shell">
                    <CsirtConfidentialitePage
                      editable
                      disabled={readOnly}
                      title={form.title}
                      lead={form.lead}
                      content={form.privacy}
                      onContentChange={(privacy) =>
                        setForm((prev) => ({ ...prev, privacy }))
                      }
                      titleSlot={
                        <input
                          className="site-wp-portal-hero-title"
                          value={form.title}
                          disabled={readOnly}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, title: event.target.value }))
                          }
                          placeholder="Titre"
                          maxLength={120}
                        />
                      }
                      leadSlot={
                        <textarea
                          className="site-wp-portal-hero-lead"
                          value={form.lead}
                          disabled={readOnly}
                          rows={3}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, lead: event.target.value }))
                          }
                          placeholder="Accroche"
                          maxLength={500}
                        />
                      }
                    />
                  </div>
                </div>
              ) : isA11yPage ? (
                <div className="site-article-shell site-wp-portal-shell">
                  <div className="site-article-band" aria-hidden />
                  <div className="site-article csirt-a11y-shell">
                    <CsirtAccessibilitePage
                      editable
                      disabled={readOnly}
                      title={form.title}
                      lead={form.lead}
                      content={form.a11y}
                      onContentChange={(a11y) => setForm((prev) => ({ ...prev, a11y }))}
                      titleSlot={
                        <input
                          className="site-wp-portal-hero-title"
                          value={form.title}
                          disabled={readOnly}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, title: event.target.value }))
                          }
                          placeholder="Titre"
                          maxLength={120}
                        />
                      }
                      leadSlot={
                        <textarea
                          className="site-wp-portal-hero-lead"
                          value={form.lead}
                          disabled={readOnly}
                          rows={3}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, lead: event.target.value }))
                          }
                          placeholder="Accroche"
                          maxLength={500}
                        />
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="site-article-shell site-wp-portal-shell">
                  <div className="site-article-band" aria-hidden />
                  <div className="site-article">
                    <div className="site-page-kind" role="radiogroup" aria-label="Type de page">
                      {(
                        [
                          ['article', 'Article', 'Texte, image et mise en forme'],
                          ['videos', 'Médiathèque vidéos', 'Sélection de vidéos publiées'],
                          ['resources', 'Ressources PDF', 'Documents à télécharger'],
                        ] as const
                      ).map(([id, label, hint]) => (
                        <button
                          key={id}
                          type="button"
                          role="radio"
                          aria-checked={form.layout === id}
                          className={cn('site-page-kind__btn', form.layout === id && 'is-active')}
                          disabled={readOnly}
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              layout: id,
                              documentsEnabled: id === 'resources' ? true : prev.documentsEnabled,
                            }))
                          }
                        >
                          <strong>{label}</strong>
                          <span>{hint}</span>
                        </button>
                      ))}
                    </div>
                    <header className="site-article__header">
                <input
                  className="site-wp-title site-wp-title--in-page"
                  value={form.title}
                  disabled={readOnly}
                  onChange={(event) => {
                    const title = event.target.value
                    setForm((prev) => {
                      const autoPath =
                        mode === 'create' &&
                        (!prev.path ||
                          prev.path === '/' ||
                          prev.path === `/${slugifyTitle(prev.title)}`)
                      return {
                        ...prev,
                        title,
                        path: autoPath
                          ? `/${slugifyTitle(title) || 'nouvelle-page'}`
                          : prev.path,
                      }
                    })
                  }}
                  placeholder="Ajouter un titre"
                  maxLength={120}
                />
                      <textarea
                        className="site-wp-portal-lead-in-page"
                        value={form.lead}
                        disabled={readOnly}
                        rows={2}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, lead: event.target.value }))
                        }
                        placeholder="Introduction / chapô (affiché sous le titre)"
                        maxLength={400}
                      />
                    </header>
                    {form.layout === 'videos' ? (
                      <div className="site-page-picker">
                        <div className="site-page-picker__head">
                          <p>
                            <Clapperboard className="h-4 w-4" aria-hidden />
                            Vidéos de la médiathèque
                          </p>
                          <button
                            type="button"
                            className="site-btn site-btn-ghost site-btn-sm"
                            disabled={readOnly || libraryVideos.length === 0}
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                videoIds:
                                  prev.videoIds.length === libraryVideos.length
                                    ? []
                                    : libraryVideos.map((video) => video.id),
                              }))
                            }
                          >
                            {form.videoIds.length === libraryVideos.length && libraryVideos.length > 0
                              ? 'Tout retirer'
                              : 'Tout sélectionner'}
                          </button>
                        </div>
                        {libraryVideos.length === 0 ? (
                          <p className="site-wp-docs-empty">
                            Aucune vidéo publiable. Ajoutez-les dans{' '}
                            <Link href={DG_SITE_ROUTES.media}>Médiathèque</Link>.
                          </p>
                        ) : (
                          <ul className="site-page-picker__list">
                            {libraryVideos.map((video) => {
                              const checked = form.videoIds.includes(video.id)
                              return (
                                <li key={video.id}>
                                  <label>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      disabled={readOnly}
                                      onChange={() =>
                                        setForm((prev) => ({
                                          ...prev,
                                          videoIds: checked
                                            ? prev.videoIds.filter((id) => id !== video.id)
                                            : [...prev.videoIds, video.id],
                                        }))
                                      }
                                    />
                                    <span>
                                      <strong>{video.title}</strong>
                                      <small>
                                        {[video.category, video.duration].filter(Boolean).join(' · ') ||
                                          'Vidéo'}
                                      </small>
                                    </span>
                                  </label>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                    ) : null}
                    {form.layout === 'resources' ? (
                      <div className="site-page-picker">
                        <div className="site-page-picker__head">
                          <p>
                            <FileText className="h-4 w-4" aria-hidden />
                            Documents à partager
                          </p>
                          <label className="site-btn site-btn-ghost site-btn-sm">
                            <Upload className="h-3.5 w-3.5" aria-hidden />
                            {uploadingDoc ? 'Import…' : 'Ajouter un PDF'}
                            <input
                              type="file"
                              accept="application/pdf,.pdf"
                              hidden
                              disabled={readOnly || uploadingDoc}
                              onChange={(event) => {
                                const file = event.target.files?.[0]
                                if (file) void uploadDocument(file)
                                event.target.value = ''
                              }}
                            />
                          </label>
                        </div>
                        {form.documents.length === 0 ? (
                          <p className="site-wp-docs-empty">
                            Aucun PDF. Le catalogue public n’affichera rien tant qu’un fichier n’est pas joint.
                          </p>
                        ) : (
                          <ul className="site-page-docs">
                            {form.documents.map((doc) => (
                              <li key={doc.id}>
                                <input
                                  className="site-input"
                                  value={doc.title}
                                  disabled={readOnly}
                                  aria-label="Titre du document"
                                  onChange={(event) =>
                                    patchDocument(doc.id, { title: event.target.value })
                                  }
                                />
                                <select
                                  className="site-input"
                                  value={doc.category ?? ''}
                                  disabled={readOnly}
                                  aria-label="Catégorie"
                                  onChange={(event) =>
                                    patchDocument(doc.id, {
                                      category: (event.target.value || undefined) as
                                        | SitePublicationCategory
                                        | undefined,
                                    })
                                  }
                                >
                                  <option value="">Sans catégorie</option>
                                  {RESOURCE_CATEGORY_OPTIONS.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.label}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  className="site-input"
                                  type="date"
                                  value={doc.dateIso ?? ''}
                                  disabled={readOnly}
                                  aria-label="Date"
                                  onChange={(event) =>
                                    patchDocument(doc.id, { dateIso: event.target.value || undefined })
                                  }
                                />
                                <textarea
                                  className="site-textarea"
                                  rows={2}
                                  value={doc.excerpt ?? ''}
                                  disabled={readOnly}
                                  placeholder="Résumé affiché sur la carte"
                                  onChange={(event) =>
                                    patchDocument(doc.id, { excerpt: event.target.value })
                                  }
                                />
                                <div className="site-page-docs__meta">
                                  <span>{formatBytes(doc.size) || 'Taille non indiquée'}</span>
                                  <button
                                    type="button"
                                    className="site-icon-btn site-icon-btn-danger"
                                    disabled={readOnly}
                                    onClick={() =>
                                      setForm((prev) => ({
                                        ...prev,
                                        documents: prev.documents.filter((item) => item.id !== doc.id),
                                      }))
                                    }
                                    aria-label="Retirer le document"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : null}
                    {form.layout === 'article' ? (
                    <>
                    <figure
                      className={cn(
                        'site-featured-image site-wp-portal-cover',
                        !portalHeroSrc && 'is-empty'
                      )}
                    >
                      {portalHeroSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={portalHeroSrc} alt="" />
                      ) : (
                        <div className="site-wp-portal-cover-empty">
                          <ImagePlus className="h-5 w-5" aria-hidden />
                          <span>Aucune image à la une</span>
                        </div>
                      )}
                      <div className="site-wp-portal-cover-bar">
                        <label className="site-wp-portal-cover-btn">
                          <ImagePlus aria-hidden className="h-3.5 w-3.5" />
                          <span>{uploadingCover ? 'Import…' : 'Changer l’image'}</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                            hidden
                            disabled={readOnly || uploadingCover}
                            onChange={(event) => {
                              const file = event.target.files?.[0]
                              if (file) void uploadCover(file)
                              event.target.value = ''
                            }}
                          />
                        </label>
                        {form.featuredImage ? (
                          <button
                            type="button"
                            className="site-wp-portal-cover-btn is-danger"
                            disabled={readOnly}
                            onClick={() => setForm((prev) => ({ ...prev, featuredImage: '' }))}
                          >
                            <X className="h-3.5 w-3.5" aria-hidden />
                            Retirer
                          </button>
                        ) : null}
                      </div>
                    </figure>
                    <div className="site-article__body site-wp-portal-body">
                      <SiteRichEditor
                        key={`${mode}-${form.originalPath ?? 'new'}`}
                        value={form.body}
                        onChange={(body) => setForm((prev) => ({ ...prev, body }))}
                        placeholder="Rédigez le contenu de la page…"
                        variant="document"
                        disabled={readOnly}
                      />
                    </div>
                    </>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>

          <aside className="site-wp-workspace__sidebar">
            <p className="site-wp-workspace__sidebar-label">Propriétés</p>

            {isDiscoverPage ? (
              <section className="site-wp-panel">
                <h4>Titre de la page</h4>
                <p className="site-wp-panel-hint">
                  Titre de l’onglet et du référencement. Le titre visible se modifie dans l’aperçu.
                </p>
                <SiteField label="Titre">
                  <input
                    className="site-input"
                    value={form.title}
                    disabled={readOnly}
                    maxLength={120}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, title: event.target.value }))
                    }
                    placeholder="À propos"
                  />
                </SiteField>
              </section>
            ) : null}

            <section className="site-wp-panel">
              <h4>Publication</h4>
              <SiteToggle
                label="Publiée sur le site"
                checked={form.published}
                disabled={readOnly}
                onChange={(published) => setForm((prev) => ({ ...prev, published }))}
              />
            </section>

            <section className="site-wp-panel">
              <h4>Image à la une</h4>
              <p className="site-wp-panel-hint">
                {isDiscoverPage
                  ? 'Non affichée sur la page À propos.'
                  : isSitemapPage || isLegalLayoutPage
                    ? 'Non utilisée sur cette mise en page structurée.'
                    : 'Affichée sous le titre sur le portail public.'}
              </p>
              {form.featuredImage ? (
                <div className="site-wp-cover">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.featuredImage} alt="" />
                  <button
                    type="button"
                    className="site-wp-cover-remove"
                    disabled={readOnly}
                    onClick={() => setForm((prev) => ({ ...prev, featuredImage: '' }))}
                    aria-label="Retirer l’image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="site-wp-cover-empty">
                  <ImagePlus className="h-5 w-5" aria-hidden />
                  <span>{uploadingCover ? 'Import…' : 'Choisir une image'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                    hidden
                    disabled={readOnly || uploadingCover}
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) void uploadCover(file)
                      event.target.value = ''
                    }}
                  />
                </label>
              )}
              {form.featuredImage ? (
                <label className="site-btn site-btn-ghost site-btn-sm site-wp-cover-replace">
                  <Upload className="h-3.5 w-3.5" aria-hidden />
                  Remplacer
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                    hidden
                    disabled={readOnly || uploadingCover}
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) void uploadCover(file)
                      event.target.value = ''
                    }}
                  />
                </label>
              ) : null}
            </section>

            <section className="site-wp-panel">
              <h4>Documents PDF</h4>
              {form.layout === 'resources' ? (
                <p className="site-wp-panel-hint">
                  Les PDF de cette page se gèrent dans le catalogue, avec catégorie et résumé.
                </p>
              ) : form.layout === 'videos' ? (
                <p className="site-wp-panel-hint">
                  Cette page publie des vidéos. Les PDF se ajoutent sur une page Ressources.
                </p>
              ) : (
              <>
              <SiteToggle
                label="Activer les PDF"
                checked={form.documentsEnabled}
                disabled={readOnly}
                onChange={(documentsEnabled) =>
                  setForm((prev) => ({ ...prev, documentsEnabled }))
                }
              />
              {form.documentsEnabled ? (
                <div className="site-wp-docs">
                  {form.documents.length === 0 ? (
                    <p className="site-wp-docs-empty">Aucun document joint.</p>
                  ) : (
                    <ul className="site-wp-docs-list">
                      {form.documents.map((doc) => (
                        <li key={doc.id}>
                          <FileText className="h-3.5 w-3.5" aria-hidden />
                          <div>
                            <input
                              className="site-input"
                              value={doc.title}
                              disabled={readOnly}
                              onChange={(event) =>
                                setForm((prev) => ({
                                  ...prev,
                                  documents: prev.documents.map((item) =>
                                    item.id === doc.id
                                      ? { ...item, title: event.target.value }
                                      : item
                                  ),
                                }))
                              }
                              aria-label="Titre du document"
                            />
                            <span>
                              PDF{formatBytes(doc.size) ? ` · ${formatBytes(doc.size)}` : ''}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="site-icon-btn site-icon-btn-danger"
                            disabled={readOnly}
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                documents: prev.documents.filter((item) => item.id !== doc.id),
                              }))
                            }
                            aria-label="Retirer le document"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <label className="site-btn site-btn-ghost site-btn-sm site-wp-docs-add">
                    <Upload className="h-3.5 w-3.5" aria-hidden />
                    {uploadingDoc ? 'Import…' : 'Joindre un PDF'}
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      hidden
                      disabled={readOnly || uploadingDoc}
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) void uploadDocument(file)
                        event.target.value = ''
                      }}
                    />
                  </label>
                </div>
              ) : (
                <p className="site-wp-docs-empty">
                  Activez pour joindre des PDF téléchargeables.
                </p>
              )}
              </>
              )}
            </section>

            <section className="site-wp-panel">
              <h4>
                <Link2 className="h-3 w-3" aria-hidden />
                Permalink
              </h4>
              <SiteField label="URL">
                <input
                  className="site-input"
                  value={form.path}
                  disabled={readOnly}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, path: event.target.value }))
                  }
                  onBlur={() =>
                    setForm((prev) => ({ ...prev, path: normalizePath(prev.path) }))
                  }
                  placeholder="/ma-page"
                />
              </SiteField>
            </section>

            <section className="site-wp-panel">
              <h4>
                {isDiscoverPage
                  ? 'Référencement'
                  : isSitemapPage || isLegalLayoutPage
                    ? 'Accroche hero'
                    : 'Introduction'}
              </h4>
              <SiteField
                label={
                  isDiscoverPage
                    ? 'Description'
                    : isSitemapPage || isLegalLayoutPage
                      ? 'Texte sous le titre'
                      : 'Résumé'
                }
              >
                <textarea
                  className="site-textarea"
                  rows={3}
                  value={form.lead}
                  disabled={readOnly}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, lead: event.target.value }))
                  }
                  placeholder={
                    isDiscoverPage
                      ? 'Description pour l’onglet et les moteurs de recherche'
                      : isSitemapPage
                        ? 'Accroche du plan du site'
                        : isLegalLayoutPage
                          ? 'Accroche de la page institutionnelle'
                          : 'Résumé affiché sous le titre'
                  }
                  maxLength={500}
                />
              </SiteField>
            </section>
          </aside>
        </div>
      )}
    </div>
  )
}
