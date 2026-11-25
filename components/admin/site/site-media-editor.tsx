'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Copy,
  ExternalLink,
  Film,
  Link2,
  Play,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  Youtube,
} from 'lucide-react'
import { AdminConfirmDialog } from '@/components/admin/admin-confirm-dialog'
import { SiteCard, SiteField, SiteRowActions } from '@/components/admin/site/site-fields'
import { SiteShell } from '@/components/admin/site/site-shell'
import { loadMediaLibrary, peekMediaLibrary, rememberMediaLibrary } from '@/components/admin/site/media-library-cache'
import { useSiteEditor } from '@/components/admin/site/use-site-editor'
import { normalizeSiteAssetUrl } from '@/lib/site/asset-urls'
import { newSiteId } from '@/lib/site/ids'
import { archiveNow, isArchivedFlag } from '@/lib/site/news-sources'
import {
  extractYoutubeVideoId,
  isPlayableVideoHref,
  videoProviderLabel,
  youtubeThumbnailUrl,
} from '@/lib/site/video-embed'
import { SITE_THEME_MEDIA } from '@/lib/site/types'
import {
  MEDIA_CATEGORIES,
  type CsirtSocialPlatform,
  type CsirtVideo,
  type CsirtVideoCategory,
} from '@/lib/csirt/home-content'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import '@/components/admin/site/site-admin.css'
import '@/components/admin/site/site-media.css'

const VIDEO_CATEGORY_LABELS: Record<CsirtVideoCategory, string> = {
  sensibilisation: 'Sensibilisation',
  'bonnes-pratiques': 'Bonnes pratiques',
  interventions: 'Interventions',
  ateliers: 'Ateliers',
  evenements: 'Événements',
  reportages: 'Reportages',
  reglementation: 'Réglementation',
  replay: 'Replay',
}

type TabKey = 'videos' | 'images' | 'social'
type VideoScope = 'live' | 'trash'
type VideoConfirm = { id: string; title: string; mode: 'archive' | 'purge' }

function blankVideo(): CsirtVideo {
  return {
    id: newSiteId('video'),
    title: 'Nouvelle vidéo',
    duration: '0:00',
    image: '',
    href: '',
    archived: false,
    archivedAt: null,
  }
}

function swapLiveVideos(videos: CsirtVideo[], id: string, direction: -1 | 1) {
  const liveIds = videos.filter((v) => !isArchivedFlag(v)).map((v) => v.id)
  const from = liveIds.indexOf(id)
  const to = from + direction
  if (from < 0 || to < 0 || to >= liveIds.length) return videos
  const a = videos.findIndex((v) => v.id === liveIds[from])
  const b = videos.findIndex((v) => v.id === liveIds[to])
  if (a < 0 || b < 0) return videos
  const next = [...videos]
  ;[next[a], next[b]] = [next[b], next[a]]
  return next
}

function applyVideoHref(video: CsirtVideo, href: string): CsirtVideo {
  const next = href.trim()
  const yt = extractYoutubeVideoId(next)
  const thumb = yt ? youtubeThumbnailUrl(yt) : video.image
  const wasYtThumb = /i\.ytimg\.com\/vi\//.test(video.image || '')
  return {
    ...video,
    href: next,
    image: yt && (!video.image || wasYtThumb) ? thumb : video.image || thumb || video.image,
  }
}

export function SiteMediaEditor() {
  const { site, setSite, loading, saving, dirty, canEdit, save } = useSiteEditor()
  const [tab, setTab] = useState<TabKey>('videos')
  const [library, setLibrary] = useState(peekMediaLibrary)
  const [uploading, setUploading] = useState(false)
  const [imageQuery, setImageQuery] = useState('')
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)
  const [videoScope, setVideoScope] = useState<VideoScope>('live')
  const [videoConfirm, setVideoConfirm] = useState<VideoConfirm | null>(null)

  const videos = site?.videos ?? []
  const liveVideos = useMemo(
    () => videos.filter((v) => !isArchivedFlag(v)),
    [videos]
  )
  const trashVideos = useMemo(
    () => videos.filter((v) => isArchivedFlag(v)),
    [videos]
  )
  const inTrash = videoScope === 'trash'
  const pool = inTrash ? trashVideos : liveVideos
  const selected =
    pool.find((v) => v.id === selectedVideoId) ?? pool[0] ?? null

  useEffect(() => {
    if (peekMediaLibrary()) return
    let cancelled = false
    void loadMediaLibrary().then((next) => {
      if (!cancelled) setLibrary(next)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!pool.length) {
      setSelectedVideoId(null)
      return
    }
    if (!selectedVideoId || !pool.some((v) => v.id === selectedVideoId)) {
      setSelectedVideoId(pool[0].id)
    }
  }, [pool, selectedVideoId])

  const imageItems = useMemo(() => {
    const all = [...(library?.uploads ?? []), ...(library?.theme ?? [])]
    const q = imageQuery.trim().toLowerCase()
    if (!q) return all
    return all.filter(
      (item) =>
        item.label.toLowerCase().includes(q) || item.src.toLowerCase().includes(q)
    )
  }, [library, imageQuery])

  const copy = async (src: string) => {
    try {
      await navigator.clipboard.writeText(src)
      toast({ title: 'URL copiée', description: src })
    } catch {
      toast({ title: src })
    }
  }

  const upload = async (file: File) => {
    if (!canEdit) return
    setUploading(true)
    try {
      const body = new FormData()
      body.set('file', file)
      const res = await fetch('/api/admin/site/media', { method: 'POST', body })
      const json = (await res.json().catch(() => ({}))) as { url?: string; message?: string }
      if (!res.ok || !json.url) {
        toast({
          variant: 'destructive',
          title: 'Import impossible',
          description: json.message || 'Formats : PNG, JPG, WebP, GIF, SVG.',
        })
        return
      }
      setLibrary((prev) => {
        const next = {
          theme: prev?.theme ?? [...SITE_THEME_MEDIA],
          uploads: [{ src: json.url!, label: file.name }, ...(prev?.uploads ?? [])],
        }
        rememberMediaLibrary(next)
        return next
      })
      toast({ title: 'Image ajoutée', description: 'URL copiée.' })
      await navigator.clipboard.writeText(json.url).catch(() => undefined)
    } finally {
      setUploading(false)
    }
  }

  const updateVideo = (id: string, patch: Partial<CsirtVideo>) => {
    if (!site) return
    setSite({
      ...site,
      videos: site.videos.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })
  }

  const setVideoHref = (id: string, href: string) => {
    if (!site) return
    const current = site.videos.find((item) => item.id === id)
    const previous = current?.href.trim() ?? ''
    const nextHref = href.trim()
    const guide = site.home.signalementGuideVideoUrl.trim()
    setSite({
      ...site,
      videos: site.videos.map((item) =>
        item.id === id ? applyVideoHref(item, href) : item
      ),
      home:
        guide && previous && guide === previous
          ? { ...site.home, signalementGuideVideoUrl: nextHref }
          : site.home,
    })
  }

  const setGuideVideoUrl = (href: string) => {
    if (!site || !canEdit) return
    setSite({
      ...site,
      home: { ...site.home, signalementGuideVideoUrl: href.trim() },
    })
  }

  const addVideo = () => {
    if (!site || !canEdit || inTrash) return
    const next = blankVideo()
    setSite({ ...site, videos: [...site.videos, next] })
    setSelectedVideoId(next.id)
    setVideoScope('live')
    setTab('videos')
    toast({ title: 'Vidéo ajoutée', description: 'Collez une URL YouTube pour démarrer.' })
  }

  const archiveVideo = (id: string) => {
    if (!site || !canEdit) return
    setSite({
      ...site,
      videos: site.videos.map((item) =>
        item.id === id
          ? { ...item, archived: true, archivedAt: archiveNow() }
          : item
      ),
    })
    setVideoConfirm(null)
    toast({ title: 'Vidéo mise en corbeille', description: 'Enregistrez pour publier.' })
  }

  const restoreVideo = (id: string) => {
    if (!site || !canEdit) return
    setSite({
      ...site,
      videos: site.videos.map((item) =>
        item.id === id ? { ...item, archived: false, archivedAt: null } : item
      ),
    })
    setSelectedVideoId(id)
    setVideoScope('live')
    toast({ title: 'Vidéo restaurée', description: 'Enregistrez pour publier.' })
  }

  const purgeVideo = (id: string) => {
    if (!site || !canEdit) return
    setSite({ ...site, videos: site.videos.filter((item) => item.id !== id) })
    setVideoConfirm(null)
    toast({ title: 'Vidéo supprimée définitivement' })
  }

  const updateSocial = (id: CsirtSocialPlatform['id'], patch: Partial<CsirtSocialPlatform>) => {
    if (!site) return
    setSite({
      ...site,
      social: site.social.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })
  }

  const selectedIndex = selected
    ? pool.findIndex((v) => v.id === selected.id)
    : -1
  const selectedOk = selected ? isPlayableVideoHref(selected.href) : false
  const guideUrl = site?.home.signalementGuideVideoUrl.trim() ?? ''
  const guideVideo =
    liveVideos.find((video) => video.href.trim() && video.href.trim() === guideUrl) ?? null
  const selectedIsGuide = Boolean(selected && guideUrl && selected.href.trim() === guideUrl)

  return (
    <SiteShell
      title="Médiathèque"
      description="Vidéos d’accueil, bibliothèque d’images et réseaux sociaux."
      canEdit={canEdit}
      dirty={dirty}
      saving={saving}
      loading={loading}
      onSave={save}
      previewHref="/"
    >
      {site ? (
        <div className="site-media-page">
          <div className="site-media-tabs" role="tablist" aria-label="Sections médiathèque">
            {(
              [
                ['videos', 'Vidéos', liveVideos.length],
                ['images', 'Images', (library?.uploads.length ?? 0) + (library?.theme.length ?? 0)],
                ['social', 'Réseaux', site.social.length],
              ] as const
            ).map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                className={cn('site-media-tab', tab === key && 'is-active')}
                onClick={() => setTab(key)}
              >
                {label}
                <em>{count}</em>
              </button>
            ))}
          </div>

          {tab === 'videos' ? (
            <section className={cn('site-media-video-studio', inTrash && 'is-trash')}>
              <header className="site-media-video-studio__head">
                <div>
                  <p className="site-media-video-studio__eyebrow">
                    <Youtube className="h-3.5 w-3.5" aria-hidden />
                    Section accueil
                  </p>
                  <h2>{inTrash ? 'Corbeille' : 'Vidéos'}</h2>
                  <p>
                    {inTrash
                      ? 'Restaurez une vidéo ou supprimez-la définitivement.'
                      : 'Collez une URL YouTube : la vignette se remplit automatiquement.'}
                  </p>
                </div>
                {!inTrash ? (
                  <button
                    type="button"
                    className="site-btn site-btn-primary site-btn-sm"
                    disabled={!canEdit}
                    onClick={addVideo}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    Nouvelle vidéo
                  </button>
                ) : null}
              </header>

              <div className="site-media-video-scopes" role="tablist" aria-label="Portée vidéos">
                {(
                  [
                    ['live', 'Actives', liveVideos.length],
                    ['trash', 'Corbeille', trashVideos.length],
                  ] as const
                ).map(([key, label, count]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={videoScope === key}
                    className={cn(
                      'site-media-video-scope',
                      videoScope === key && 'is-active',
                      key === 'trash' && 'is-trash'
                    )}
                    onClick={() => setVideoScope(key)}
                  >
                    {key === 'trash' ? <Trash2 className="h-3 w-3" aria-hidden /> : null}
                    {label}
                    <em>{count}</em>
                  </button>
                ))}
              </div>

              {!inTrash ? (
                <div className="site-media-video-settings">
                  <SiteField label="Titre de section">
                    <input
                      value={site.home.mediaTitle}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setSite({
                          ...site,
                          home: { ...site.home, mediaTitle: e.target.value },
                        })
                      }
                    />
                  </SiteField>
                  <SiteField
                    label="Vidéo explicative du signalement"
                    hint="Choisie parmi les vidéos actives, ou URL libre. Le bouton « Comment signaler » de la page de connexion la lance."
                  >
                    <select
                      value={guideVideo?.id ?? (guideUrl ? '__custom__' : '')}
                      disabled={!canEdit}
                      onChange={(event) => {
                        const value = event.target.value
                        if (value === '__custom__') return
                        if (!value) {
                          setGuideVideoUrl('')
                          return
                        }
                        const video = liveVideos.find((item) => item.id === value)
                        if (video) setGuideVideoUrl(video.href)
                      }}
                    >
                      <option value="">Aucune</option>
                      {guideUrl && !guideVideo ? (
                        <option value="__custom__">URL personnalisée</option>
                      ) : null}
                      {liveVideos
                        .filter((video) => isPlayableVideoHref(video.href))
                        .map((video) => (
                          <option key={video.id} value={video.id}>
                            {video.title || 'Sans titre'}
                          </option>
                        ))}
                    </select>
                    <input
                      value={site.home.signalementGuideVideoUrl}
                      disabled={!canEdit}
                      placeholder="https://www.youtube.com/watch?v=… ou /uploads/….mp4"
                      onChange={(e) => setGuideVideoUrl(e.target.value)}
                    />
                  </SiteField>
                  <SiteField label="Lien chaîne YouTube">
                    <input
                      value={site.home.mediaYoutubeUrl}
                      disabled={!canEdit}
                      placeholder="https://www.youtube.com/…"
                      onChange={(e) =>
                        setSite({
                          ...site,
                          home: { ...site.home, mediaYoutubeUrl: e.target.value },
                        })
                      }
                    />
                  </SiteField>
                  <SiteField label="Chapô" className="site-media-span-2">
                    <input
                      value={site.home.mediaLead}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setSite({
                          ...site,
                          home: { ...site.home, mediaLead: e.target.value },
                        })
                      }
                    />
                  </SiteField>
                </div>
              ) : null}

              <div className="site-media-video-studio__body">
                <aside className="site-media-video-rail" aria-label="Liste des vidéos">
                  {pool.length === 0 ? (
                    inTrash ? (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-1.5 text-center px-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-0.5">
                          <Trash2 className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-bold text-foreground">La corbeille est vide</p>
                        <p className="text-[11px] text-muted-foreground max-w-xs">
                          Aucune vidéo archivée. Les vidéos en corbeille sont conservées 3 mois avant purge automatique.
                        </p>
                      </div>
                    ) : (
                      <div className="site-media-empty">
                        <strong>Aucune vidéo</strong>
                        <p>Ajoutez la première vidéo de la section Médiathèque.</p>
                        <button
                          type="button"
                          className="site-btn site-btn-primary site-btn-sm"
                          disabled={!canEdit}
                          onClick={addVideo}
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden />
                          Créer
                        </button>
                      </div>
                    )
                  ) : (
                    <ul>
                      {pool.map((video, index) => {
                        const ok = isPlayableVideoHref(video.href)
                        return (
                          <li key={video.id}>
                            <button
                              type="button"
                              className={cn(
                                'site-media-video-thumb',
                                selected?.id === video.id && 'is-active',
                                !ok && !inTrash && 'is-draft',
                                inTrash && 'is-trash',
                                !inTrash && guideUrl && video.href.trim() === guideUrl && 'is-guide'
                              )}
                              onClick={() => setSelectedVideoId(video.id)}
                            >
                              <span className="site-media-video-thumb__media">
                                {video.image ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={video.image} alt="" />
                                ) : (
                                  <Film className="h-4 w-4" aria-hidden />
                                )}
                                <em>{index + 1}</em>
                              </span>
                              <span className="site-media-video-thumb__meta">
                                <strong>{video.title || `Vidéo ${index + 1}`}</strong>
                                <span>
                                  {inTrash
                                    ? video.archivedAt
                                      ? `Archivée · ${new Date(video.archivedAt).toLocaleDateString('fr-FR')}`
                                      : 'En corbeille'
                                    : ok
                                      ? `${videoProviderLabel(video.href)} · ${video.duration || '—'}`
                                      : 'URL invalide'}
                                  {!inTrash && guideUrl && video.href.trim() === guideUrl
                                    ? ' · Signalement'
                                    : ''}
                                </span>
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </aside>

                <div className="site-media-video-editor">
                  {selected && selectedIndex >= 0 ? (
                    <>
                      <div className="site-media-video-editor__toolbar">
                        <div>
                          <strong>
                            {inTrash ? 'Corbeille' : 'Vidéo'} {selectedIndex + 1}
                          </strong>
                          <span>
                            {inTrash
                              ? 'Absente du site public — restaurez ou supprimez définitivement'
                              : selectedOk
                                ? `${videoProviderLabel(selected.href)} — prête pour le site`
                                : 'Collez une URL YouTube / Vimeo / fichier'}
                          </span>
                        </div>
                        {inTrash ? (
                          <div className="site-row-actions">
                            <button
                              type="button"
                              className="site-icon-btn"
                              disabled={!canEdit}
                              aria-label="Restaurer"
                              title="Restaurer"
                              onClick={() => restoreVideo(selected.id)}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="site-icon-btn site-icon-btn-danger"
                              disabled={!canEdit}
                              aria-label="Supprimer définitivement"
                              title="Supprimer définitivement"
                              onClick={() =>
                                setVideoConfirm({
                                  id: selected.id,
                                  title: selected.title,
                                  mode: 'purge',
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <SiteRowActions
                            disableUp={selectedIndex === 0 || !canEdit}
                            disableDown={
                              selectedIndex === pool.length - 1 || !canEdit
                            }
                            disableRemove={!canEdit}
                            onUp={() =>
                              setSite({
                                ...site,
                                videos: swapLiveVideos(site.videos, selected.id, -1),
                              })
                            }
                            onDown={() =>
                              setSite({
                                ...site,
                                videos: swapLiveVideos(site.videos, selected.id, 1),
                              })
                            }
                            onRemove={() =>
                              setVideoConfirm({
                                id: selected.id,
                                title: selected.title,
                                mode: 'archive',
                              })
                            }
                          />
                        )}
                      </div>

                      <div className="site-media-video-preview">
                        {selected.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={selected.image} alt="" />
                        ) : (
                          <div className="site-media-video-preview__empty">
                            <Youtube className="h-7 w-7" aria-hidden />
                            <strong>Aperçu vignette</strong>
                            <p>Rempli auto via YouTube</p>
                          </div>
                        )}
                        <span className="site-media-video-preview__badge">
                          {selected.duration || '0:00'}
                        </span>
                      </div>

                      {!inTrash ? (
                        <button
                          type="button"
                          className={cn('site-media-guide-toggle', selectedIsGuide && 'is-on')}
                          disabled={!canEdit || !selectedOk}
                          onClick={() => {
                            if (!selected) return
                            if (!selectedOk) return
                            setGuideVideoUrl(selectedIsGuide ? '' : selected.href)
                            toast({
                              title: selectedIsGuide
                                ? 'Vidéo retirée du signalement'
                                : 'Vidéo prête pour le signalement',
                              description: selectedIsGuide
                                ? 'Le bouton « Comment signaler ? » ne lancera plus cette vidéo. Enregistrez pour publier.'
                                : 'Le bouton « Comment signaler ? » ouvrira cette vidéo. Enregistrez pour publier.',
                            })
                          }}
                        >
                          <Play aria-hidden />
                          <span>
                            <strong>
                              {selectedIsGuide
                                ? 'Affichée sur la page Signalement'
                                : 'Afficher sur la page Signalement'}
                            </strong>
                            <em>
                              {selectedOk
                                ? 'Bouton « Comment signaler ? » de la page de connexion'
                                : 'Ajoutez d’abord une URL YouTube, Vimeo ou .mp4'}
                            </em>
                          </span>
                        </button>
                      ) : null}

                      <div className="site-grid-2">
                        <SiteField
                          label="URL vidéo"
                          hint="YouTube, Vimeo ou fichier .mp4"
                          className="site-media-span-2"
                        >
                          <div className="site-media-link-field">
                            <Link2 className="h-3.5 w-3.5" aria-hidden />
                            <input
                              value={selected.href}
                              disabled={!canEdit || inTrash}
                              placeholder="https://www.youtube.com/watch?v=…"
                              onChange={(e) => setVideoHref(selected.id, e.target.value)}
                            />
                            {selected.href ? (
                              <a
                                href={selected.href}
                                target="_blank"
                                rel="noreferrer"
                                className="site-media-link-open"
                                title="Ouvrir"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            ) : null}
                          </div>
                          {selected.href && !selectedOk ? (
                            <p className="site-media-warn">
                              Cette URL n’est pas lisible dans le lecteur intégré.
                            </p>
                          ) : null}
                        </SiteField>
                        <SiteField label="Titre">
                          <input
                            value={selected.title}
                            disabled={!canEdit || inTrash}
                            onChange={(e) =>
                              updateVideo(selected.id, { title: e.target.value })
                            }
                          />
                        </SiteField>
                        <SiteField label="Catégorie" hint="Filtre de la page publique">
                          <select
                            value={selected.category ?? ''}
                            disabled={!canEdit || inTrash}
                            onChange={(event) =>
                              updateVideo(selected.id, {
                                category: (event.target.value || undefined) as CsirtVideoCategory | undefined,
                              })
                            }
                          >
                            <option value="">Aucune</option>
                            {MEDIA_CATEGORIES.map((id) => (
                              <option key={id} value={id}>
                                {VIDEO_CATEGORY_LABELS[id]}
                              </option>
                            ))}
                          </select>
                        </SiteField>
                        <SiteField label="Durée" hint="Ex. 3:42">
                          <input
                            value={selected.duration}
                            disabled={!canEdit || inTrash}
                            placeholder="0:00"
                            onChange={(e) =>
                              updateVideo(selected.id, { duration: e.target.value })
                            }
                          />
                        </SiteField>
                        <SiteField
                          label="Vignette (URL)"
                          hint="Auto YouTube — ou choisissez dans Images"
                          className="site-media-span-2"
                        >
                          <input
                            value={selected.image}
                            disabled={!canEdit || inTrash}
                            placeholder="/csirt/media-1.png ou https://…"
                            onChange={(e) =>
                              updateVideo(selected.id, {
                                image: normalizeSiteAssetUrl(e.target.value),
                              })
                            }
                          />
                        </SiteField>
                      </div>

                      {extractYoutubeVideoId(selected.href) && !inTrash ? (
                        <button
                          type="button"
                          className="site-btn site-btn-ghost site-btn-sm"
                          disabled={!canEdit}
                          onClick={() => {
                            const id = extractYoutubeVideoId(selected.href)
                            if (!id) return
                            updateVideo(selected.id, {
                              image: youtubeThumbnailUrl(id),
                            })
                            toast({ title: 'Vignette YouTube actualisée' })
                          }}
                        >
                          <Youtube className="h-3.5 w-3.5" aria-hidden />
                          Recharger la vignette YouTube
                        </button>
                      ) : null}
                    </>
                  ) : (
                    inTrash ? (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-1.5 text-center px-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-0.5">
                          <Trash2 className="h-5 w-5" />
                        </div>
                        <p className="text-sm font-bold text-foreground">La corbeille est vide</p>
                        <p className="text-xs text-muted-foreground max-w-sm">
                          Sélectionnez une vidéo archivée. Rétention : 3 mois avant suppression définitive automatique.
                        </p>
                      </div>
                    ) : (
                      <div className="site-media-empty is-panel">
                        <strong>Sélectionnez une vidéo</strong>
                        <p>Ou créez-en une pour composer la section.</p>
                      </div>
                    )
                  )}
                </div>
              </div>
            </section>
          ) : null}

          {tab === 'images' ? (
            <SiteCard
              className="site-media-images-card"
              title="Bibliothèque d’images"
              description="Cliquez une vignette pour copier son URL."
              actions={
                <label
                  className="site-btn site-btn-primary site-btn-sm"
                  style={{ cursor: canEdit ? 'pointer' : 'not-allowed' }}
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden />
                  {uploading ? 'Import…' : 'Importer'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                    hidden
                    disabled={!canEdit || uploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) void upload(file)
                      event.target.value = ''
                    }}
                  />
                </label>
              }
            >
              <label className="site-media-search">
                <Search className="h-3.5 w-3.5" aria-hidden />
                <input
                  value={imageQuery}
                  onChange={(e) => setImageQuery(e.target.value)}
                  placeholder="Filtrer les images…"
                />
              </label>
              {imageItems.length === 0 ? (
                <div className="site-media-empty">
                  <strong>Aucune image</strong>
                  <p>Importez une image ou élargissez le filtre.</p>
                </div>
              ) : (
                <div className="site-media-grid site-media-grid--compact">
                  {imageItems.map((item) => (
                    <button
                      key={item.src}
                      type="button"
                      className="site-media-tile"
                      title="Copier l’URL"
                      onClick={() => void copy(item.src)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.src} alt="" />
                      <span>{item.label}</span>
                      <em>
                        <Copy className="h-3 w-3" aria-hidden />
                      </em>
                    </button>
                  ))}
                </div>
              )}
            </SiteCard>
          ) : null}

          {tab === 'social' ? (
            <SiteCard
              className="site-media-social-card"
              title="Réseaux sociaux"
              description="Cartes affichées sur la page d’accueil."
            >
              <div className="site-media-social-list">
                {site.social.map((item) => (
                  <article key={item.id} className="site-media-social-row">
                    <header>
                      <strong>{item.name}</strong>
                      <span>{item.handle}</span>
                    </header>
                    <div className="site-grid-2">
                      <SiteField label="Identifiant">
                        <input
                          value={item.handle}
                          disabled={!canEdit}
                          onChange={(e) =>
                            updateSocial(item.id, { handle: e.target.value })
                          }
                        />
                      </SiteField>
                      <SiteField label="URL">
                        <input
                          value={item.href}
                          disabled={!canEdit}
                          onChange={(e) =>
                            updateSocial(item.id, { href: e.target.value })
                          }
                        />
                      </SiteField>
                      <SiteField label="Abonnés">
                        <input
                          value={item.followers}
                          disabled={!canEdit}
                          onChange={(e) =>
                            updateSocial(item.id, { followers: e.target.value })
                          }
                        />
                      </SiteField>
                      <SiteField label="Publications">
                        <input
                          value={item.posts}
                          disabled={!canEdit}
                          onChange={(e) =>
                            updateSocial(item.id, { posts: e.target.value })
                          }
                        />
                      </SiteField>
                      <SiteField label="Description" className="site-media-span-2">
                        <input
                          value={item.description}
                          disabled={!canEdit}
                          onChange={(e) =>
                            updateSocial(item.id, { description: e.target.value })
                          }
                        />
                      </SiteField>
                      <SiteField label="Dernier post">
                        <input
                          value={item.latest}
                          disabled={!canEdit}
                          onChange={(e) =>
                            updateSocial(item.id, { latest: e.target.value })
                          }
                        />
                      </SiteField>
                      <SiteField label="Datation">
                        <input
                          value={item.latestAgo}
                          disabled={!canEdit}
                          onChange={(e) =>
                            updateSocial(item.id, { latestAgo: e.target.value })
                          }
                        />
                      </SiteField>
                    </div>
                  </article>
                ))}
              </div>
            </SiteCard>
          ) : null}
        </div>
      ) : null}

      <AdminConfirmDialog
        open={Boolean(videoConfirm)}
        onOpenChange={(open) => !open && setVideoConfirm(null)}
        title={
          videoConfirm?.mode === 'purge'
            ? 'Supprimer définitivement ?'
            : 'Mettre en corbeille ?'
        }
        message={
          videoConfirm?.mode === 'purge'
            ? `« ${videoConfirm.title || 'Cette vidéo'} » sera définitivement retirée. Cette action est irréversible.`
            : `« ${videoConfirm?.title || 'Cette vidéo'} » sera retirée de la section Médiathèque. Vous pourrez la restaurer ensuite. Enregistrez pour publier.`
        }
        confirmLabel={
          videoConfirm?.mode === 'purge'
            ? 'Supprimer définitivement'
            : 'Mettre en corbeille'
        }
        intent="destructive"
        onConfirm={() => {
          if (!videoConfirm) return
          if (videoConfirm.mode === 'purge') purgeVideo(videoConfirm.id)
          else archiveVideo(videoConfirm.id)
        }}
      />
    </SiteShell>
  )
}
