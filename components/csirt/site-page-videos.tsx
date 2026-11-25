'use client'

import { useMemo, useState, type ComponentType } from 'react'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  Play,
  Scale,
  Search,
  Shield,
  ShieldCheck,
  Star,
  Video,
} from 'lucide-react'
import { CsirtVideoModal } from '@/components/csirt/csirt-media-section'
import { useCsirtLocale } from '@/components/csirt/csirt-locale-provider'
import {
  MEDIA_CATEGORIES,
  publishableVideos,
  type CsirtVideo,
  type CsirtVideoCategory,
} from '@/lib/csirt/home-content'
import { extractYoutubeVideoId, youtubeThumbnailUrl } from '@/lib/site/video-embed'
import { cn } from '@/lib/utils'
import './site-page-videos.css'

const CATEGORY_LABELS: Record<CsirtVideoCategory, string> = {
  sensibilisation: 'Sensibilisation',
  'bonnes-pratiques': 'Bonnes pratiques',
  interventions: 'Interventions',
  ateliers: 'Ateliers',
  evenements: 'Événements',
  reportages: 'Reportages',
  reglementation: 'Réglementation',
  replay: 'Replay',
}

const CATEGORY_ICONS: Record<CsirtVideoCategory, ComponentType<{ className?: string; 'aria-hidden'?: boolean }>> = {
  sensibilisation: Shield,
  'bonnes-pratiques': ShieldCheck,
  interventions: Video,
  ateliers: FileText,
  evenements: Calendar,
  reportages: Video,
  reglementation: Scale,
  replay: Play,
}

const PAGE_SIZES = [6, 12, 24] as const

type SortKey = 'recent' | 'oldest' | 'title'

function posterOf(video: CsirtVideo) {
  const image = video.image?.trim()
  const youtubeId = extractYoutubeVideoId(video.href)
  if (youtubeId && (!image || image.startsWith('/csirt/media-'))) {
    return youtubeThumbnailUrl(youtubeId)
  }
  return image || ''
}

function isPlaceholderTitle(value: string) {
  return /^vid[eé]os?$/i.test(value.trim())
}

function visibleDuration(value?: string) {
  const text = value?.trim() ?? ''
  if (!text || text === '0:00' || text === '00:00' || text === '0') return ''
  return text
}

function formatDate(iso?: string) {
  if (!iso) return ''
  const date = new Date(`${iso.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function VideoPoster({ video }: { video: CsirtVideo }) {
  const poster = posterOf(video)
  const youtubeId = extractYoutubeVideoId(video.href)
  return (
    <>
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          onError={(event) => {
            if (!youtubeId) return
            const next = youtubeThumbnailUrl(youtubeId)
            if (event.currentTarget.src.includes(`/vi/${youtubeId}/`)) return
            event.currentTarget.src = next
          }}
        />
      ) : (
        <span className="vlib-fallback" aria-hidden />
      )}
    </>
  )
}

export function SitePageVideoCatalog({
  title,
  lead,
  videos,
}: {
  title: string
  lead: string
  videos: readonly CsirtVideo[]
}) {
  const { t } = useCsirtLocale()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<'all' | CsirtVideoCategory>('all')
  const [sort, setSort] = useState<SortKey>('recent')
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(6)
  const [page, setPage] = useState(1)
  const [playing, setPlaying] = useState<CsirtVideo | null>(null)

  const catalog = useMemo(() => {
    const list = publishableVideos(videos).filter((video) => (video.format ?? 'video') !== 'document')
    const sorted = list.slice().sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title, 'fr')
      const byDate = (a.dateIso || '').localeCompare(b.dateIso || '')
      return sort === 'oldest' ? byDate : -byDate
    })
    return sorted
  }, [videos, sort])

  const categories = MEDIA_CATEGORIES.filter((id) => catalog.some((video) => video.category === id))
  const filtered = catalog.filter((video) => {
    if (category !== 'all' && video.category !== category) return false
    const needle = query.trim().toLowerCase()
    if (!needle) return true
    return [video.title, video.excerpt, video.speaker, video.category ? CATEGORY_LABELS[video.category] : '']
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(needle)
  })

  const showFeatured = !query.trim() && filtered.length > 0
  const featured = showFeatured ? filtered[0] : null
  const grid = showFeatured ? filtered.slice(1) : filtered
  const pageCount = Math.max(1, Math.ceil(grid.length / pageSize) || 1)
  const currentPage = Math.min(page, pageCount)
  const start = (currentPage - 1) * pageSize
  const visible = grid.slice(start, start + pageSize)
  const from = grid.length === 0 ? 0 : start + 1
  const to = Math.min(grid.length, start + visible.length)

  const resetPage = () => setPage(1)
  const heading = isPlaceholderTitle(title) ? 'Médiathèque' : title.trim()
  const intro = lead.trim()
  const showIntro = Boolean(intro) && intro.toLowerCase() !== title.trim().toLowerCase() && intro.toLowerCase() !== heading.toLowerCase()

  return (
    <section className="vlib" aria-label={heading}>
      <header className="vlib-hero">
        <div className="vlib-hero__copy">
          {heading === 'Médiathèque' ? null : <p className="vlib-kicker">Médiathèque</p>}
          <h1>{heading}</h1>
          <p className="vlib-count">{`${catalog.length} vidéo${catalog.length > 1 ? 's' : ''}`}</p>
          {showIntro ? <p>{intro}</p> : null}
        </div>
      </header>

      {featured ? (
        <article className="vlib-feature">
          <VideoPoster video={featured} />
          <span className="vlib-feature__shade" aria-hidden />
          <div className="vlib-feature__body">
            <p>
              <Star aria-hidden />À la une
            </p>
            <h2>{featured.title}</h2>
            {featured.excerpt ? <p>{featured.excerpt}</p> : null}
            <button type="button" onClick={() => setPlaying(featured)}>
              <Play aria-hidden fill="currentColor" />
              Regarder la vidéo
            </button>
          </div>
          {visibleDuration(featured.duration) ? <span className="vlib-feature__time">{visibleDuration(featured.duration)}</span> : null}
        </article>
      ) : null}

      <div className="vlib-tools">
        <form className="vlib-search" onSubmit={(event) => event.preventDefault()}>
          <label>
            <span className="sr-only">Rechercher une vidéo</span>
            <Search aria-hidden />
            <input
              value={query}
              placeholder="Rechercher une vidéo, un sujet, un mot-clé…"
              onChange={(event) => {
                setQuery(event.target.value)
                resetPage()
              }}
            />
          </label>
        </form>
        <div className="vlib-tools__row">
          <div className="vlib-chips" role="tablist" aria-label="Catégories">
            <button
              type="button"
              role="tab"
              aria-selected={category === 'all'}
              className={cn(category === 'all' && 'is-active')}
              onClick={() => {
                setCategory('all')
                resetPage()
              }}
            >
              Toutes
            </button>
            {categories.map((id) => {
              const Icon = CATEGORY_ICONS[id]
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={category === id}
                  className={cn(`is-${id}`, category === id && 'is-active')}
                  onClick={() => {
                    setCategory(id)
                    resetPage()
                  }}
                >
                  <Icon aria-hidden />
                  {CATEGORY_LABELS[id]}
                </button>
              )
            })}
          </div>
          <label className="vlib-sort">
            <span className="sr-only">Trier les vidéos</span>
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as SortKey)
                resetPage()
              }}
            >
              <option value="recent">Plus récentes</option>
              <option value="oldest">Plus anciennes</option>
              <option value="title">Titre</option>
            </select>
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="vlib-empty">Aucune vidéo ne correspond à cette recherche.</p>
      ) : visible.length === 0 ? null : (
        <ul className="vlib-grid">
          {visible.map((video) => {
            const date = formatDate(video.dateIso)
            return (
              <li key={video.id}>
                <article className="vlib-card">
                  <button type="button" onClick={() => setPlaying(video)}>
                    <span className="vlib-card__media">
                      <VideoPoster video={video} />
                      <span className="vlib-card__play" aria-hidden>
                        <Play fill="currentColor" />
                      </span>
                      {visibleDuration(video.duration) ? <span className="vlib-card__time">{visibleDuration(video.duration)}</span> : null}
                    </span>
                    <span className="vlib-card__body">
                      {video.category ? (
                        <span className={cn('vlib-tag', `is-${video.category}`)}>{CATEGORY_LABELS[video.category]}</span>
                      ) : null}
                      <strong>{video.title}</strong>
                      {video.excerpt ? <span className="vlib-card__excerpt">{video.excerpt}</span> : null}
                      {date ? (
                        <span className="vlib-card__date">
                          <Calendar aria-hidden />
                          {date}
                        </span>
                      ) : null}
                    </span>
                    <span className="sr-only">Lire la vidéo</span>
                  </button>
                </article>
              </li>
            )
          })}
        </ul>
      )}

      {grid.length > 0 ? (
        <footer className="vlib-pager">
          <p>
            {`Affichage de ${from} à ${to} sur ${grid.length} résultat${grid.length > 1 ? 's' : ''}`}
          </p>
          {pageCount > 1 ? (
            <nav aria-label="Pagination des vidéos">
              <button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} aria-label="Page précédente">
                <ChevronLeft aria-hidden />
              </button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
                <button
                  key={number}
                  type="button"
                  className={number === currentPage ? 'is-active' : undefined}
                  aria-current={number === currentPage ? 'page' : undefined}
                  onClick={() => setPage(number)}
                >
                  {number}
                </button>
              ))}
              <button
                type="button"
                disabled={currentPage >= pageCount}
                onClick={() => setPage(currentPage + 1)}
                aria-label="Page suivante"
              >
                <ChevronRight aria-hidden />
              </button>
            </nav>
          ) : (
            <span />
          )}
          <label>
            Résultats par page
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value) as (typeof PAGE_SIZES)[number])
                resetPage()
              }}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </footer>
      ) : null}

      <CsirtVideoModal
        video={playing}
        open={Boolean(playing)}
        onOpenChange={(open) => {
          if (!open) setPlaying(null)
        }}
        t={t}
      />
    </section>
  )
}
