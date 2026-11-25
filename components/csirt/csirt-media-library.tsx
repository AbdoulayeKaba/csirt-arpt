'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Download,
  Eye,
  LayoutGrid,
  MessageCircle,
  Play,
  Quote,
  Radio,
  Scale,
  Search,
  Shield,
  Users,
  Youtube,
} from 'lucide-react'
import { CsirtVideoModal } from '@/components/csirt/csirt-media-section'
import { useCsirtLocale } from '@/components/csirt/csirt-locale-provider'
import {
  ARPT_YOUTUBE_URL,
  CSIRT_VIDEOS,
  MEDIA_CATEGORIES,
  publishableVideos,
  type CsirtVideo,
  type CsirtVideoCategory,
  type CsirtVideoFormat,
} from '@/lib/csirt/home-content'
import { extractYoutubeVideoId, youtubeThumbnailUrl } from '@/lib/site/video-embed'
import type { Language } from '@/lib/types'
import './csirt-media-library.css'

const PAGE_SIZES = [8, 16] as const

const CATEGORY_ICON = {
  sensibilisation: Shield,
  'bonnes-pratiques': BookOpen,
  interventions: Users,
  ateliers: LayoutGrid,
  evenements: Calendar,
  reportages: Clapperboard,
  reglementation: Scale,
  replay: Radio,
} as const

const COPY = {
  fr: {
    home: 'Accueil',
    search: 'Rechercher une vidéo, un sujet, un mot-clé…',
    searchBtn: 'Rechercher',
    allCategories: 'Toutes les catégories',
    allDates: 'Toutes les dates',
    all: 'Toutes',
    latest: 'Dernières vidéos',
    seeAll: 'Voir toutes les vidéos',
    empty: 'Aucune vidéo ne correspond à ces critères.',
    range: 'Affichage de {from} à {to} sur {total} vidéos',
    perPage: '{n} par page',
    prev: 'Page précédente',
    next: 'Page suivante',
    play: 'Lire la vidéo',
    quote: 'Informer aujourd’hui pour un numérique plus sûr demain.',
    featured: 'Vidéo à la une',
    youtubeTitle: 'Chaîne ARPT sur YouTube',
    youtubeLead: 'Découvrez toutes nos vidéos en avant-première.',
    youtubeCta: 'Voir la chaîne',
    statsTitle: 'Médiathèque en chiffres',
    statVideos: 'Vidéos',
    statCategories: 'Catégories',
    statViews: 'Vues',
    statReplays: 'Replay webinaires',
    categories: {
      sensibilisation: 'Sensibilisation',
      'bonnes-pratiques': 'Bonnes pratiques',
      interventions: 'Interventions',
      ateliers: 'Ateliers',
      evenements: 'Événements',
      reportages: 'Reportages',
      reglementation: 'Réglementation',
      replay: 'Replay webinaires',
    } satisfies Record<CsirtVideoCategory, string>,
  },
  en: {
    home: 'Home',
    search: 'Search a video, a topic, a keyword…',
    searchBtn: 'Search',
    allCategories: 'All categories',
    allDates: 'All dates',
    all: 'All',
    latest: 'Latest videos',
    seeAll: 'See all videos',
    empty: 'No video matches these filters.',
    range: 'Showing {from} to {to} of {total} videos',
    perPage: '{n} per page',
    prev: 'Previous page',
    next: 'Next page',
    play: 'Play video',
    quote: 'Inform today for a safer digital world tomorrow.',
    featured: 'Featured video',
    youtubeTitle: 'ARPT channel on YouTube',
    youtubeLead: 'Watch all our videos first.',
    youtubeCta: 'Open the channel',
    statsTitle: 'Media library in figures',
    statVideos: 'Videos',
    statCategories: 'Categories',
    statViews: 'Views',
    statReplays: 'Webinar replays',
    categories: {
      sensibilisation: 'Awareness',
      'bonnes-pratiques': 'Best practices',
      interventions: 'Talks',
      ateliers: 'Workshops',
      evenements: 'Events',
      reportages: 'Reports',
      reglementation: 'Regulation',
      replay: 'Webinar replays',
    } satisfies Record<CsirtVideoCategory, string>,
  },
} as const

function inferCategory(video: CsirtVideo): CsirtVideoCategory {
  const title = video.title.toLowerCase()
  if (/webinar|webinaire|replay/.test(title)) return 'replay'
  if (/atelier/.test(title)) return 'ateliers'
  if (/phishing|sensibil/.test(title)) return 'sensibilisation'
  if (/réglement|reglement|table ronde/.test(title)) return 'reglementation'
  if (/reportage/.test(title)) return 'reportages'
  if (/intervention|swat|\bdg\b/.test(title)) return 'interventions'
  if (/événement|evenement|conférence|conference/.test(title)) return 'evenements'
  if (/bonne pratique/.test(title)) return 'bonnes-pratiques'
  return 'sensibilisation'
}

function inferFormat(href: string): CsirtVideoFormat {
  const value = href.toLowerCase()
  if (/\.(mp3|wav|m4a|ogg)(\?|$)/.test(value)) return 'audio'
  if (/\.(pdf|docx?)(\?|$)/.test(value)) return 'document'
  return 'video'
}

function enrichVideo(video: CsirtVideo): CsirtVideo {
  const known = CSIRT_VIDEOS.find((item) => item.id === video.id)
  return {
    ...video,
    category: video.category || known?.category || inferCategory(video),
    excerpt: video.excerpt || known?.excerpt || '',
    dateIso: video.dateIso || known?.dateIso,
    format: video.format || known?.format || inferFormat(video.href),
    speaker: video.speaker || known?.speaker,
    views: video.views ?? known?.views,
    comments: video.comments ?? known?.comments,
  }
}

function videoPoster(video: CsirtVideo) {
  const image = video.image?.trim()
  if (image && !image.startsWith('/csirt/media-')) return image
  const youtubeId = extractYoutubeVideoId(video.href)
  if (youtubeId) return youtubeThumbnailUrl(youtubeId)
  return image || '/csirt/discover-ops.jpg'
}

function formatDate(iso: string | undefined, language: Language) {
  if (!iso) return ''
  const date = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function compactCount(value: number, language: Language) {
  if (value < 1000) return String(value)
  const scaled = value / 1000
  const digits = scaled >= 10 ? 0 : 1
  const text = scaled.toFixed(digits).replace('.', language === 'fr' ? ',' : '.')
  return `${text} k`
}

function pagerTokens(count: number, current: number) {
  if (count <= 7) return Array.from({ length: count }, (_, index) => index)
  const keep = new Set([0, count - 1, current, current - 1, current + 1].filter((n) => n >= 0 && n < count))
  const sorted = [...keep].sort((a, b) => a - b)
  const tokens: Array<number | 'gap'> = []
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1]! > 1) tokens.push('gap')
    tokens.push(page)
  })
  return tokens
}

function LibraryTitle({ title }: { title: string }) {
  if (/^médiathèque$/i.test(title.replace(/\s+/g, ''))) {
    return (
      <>
        Média<span>thèque</span>
      </>
    )
  }
  return <>{title}</>
}

function VideoFace({
  video,
  language,
  categoryLabel,
  onOpen,
  playLabel,
  featured = false,
}: {
  video: CsirtVideo
  language: Language
  categoryLabel: string
  onOpen: () => void
  playLabel: string
  featured?: boolean
}) {
  const tone = video.category || 'sensibilisation'
  const date = formatDate(video.dateIso, language)
  return (
    <button type="button" className={featured ? 'mlib-card is-featured' : 'mlib-card'} onClick={onOpen}>
      <span className="mlib-card__visual">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={videoPoster(video)} alt="" />
        <span className="mlib-card__play" aria-hidden>
          <Play fill="currentColor" />
        </span>
        <span className={`mlib-card__cat is-${tone}`}>{categoryLabel}</span>
        {video.duration && video.duration !== '0:00' ? <span className="mlib-card__time">{video.duration}</span> : null}
      </span>
      <span className="mlib-card__body">
        <strong>{video.title}</strong>
        {video.excerpt ? <small>{video.excerpt}</small> : null}
        <span className="mlib-card__stats">
          {date ? (
            <time dateTime={video.dateIso}>
              <Calendar aria-hidden />
              {date}
            </time>
          ) : null}
          {typeof video.views === 'number' ? (
            <span>
              <Eye aria-hidden />
              {compactCount(video.views, language)}
            </span>
          ) : null}
          {typeof video.comments === 'number' ? (
            <span>
              <MessageCircle aria-hidden />
              {video.comments}
            </span>
          ) : null}
        </span>
      </span>
      <span className="sr-only">{playLabel}</span>
    </button>
  )
}

export function CsirtMediaLibrary({
  videos,
  title,
  lead,
  youtubeUrl = ARPT_YOUTUBE_URL,
}: {
  videos: readonly CsirtVideo[]
  title: string
  lead: string
  youtubeUrl?: string
}) {
  const { language, t } = useCsirtLocale()
  const text = COPY[language]
  const catalog = useMemo(
    () =>
      publishableVideos(videos)
        .map(enrichVideo)
        .sort((a, b) => (b.dateIso || '').localeCompare(a.dateIso || '')),
    [videos],
  )
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<'all' | CsirtVideoCategory>('all')
  const [year, setYear] = useState('all')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(8)
  const [playing, setPlaying] = useState<CsirtVideo | null>(null)

  const years = useMemo(() => {
    const values = new Set<string>()
    catalog.forEach((video) => {
      if (video.dateIso) values.add(video.dateIso.slice(0, 4))
    })
    return [...values].sort((a, b) => b.localeCompare(a))
  }, [catalog])

  const counts = useMemo(() => {
    const map = Object.fromEntries(MEDIA_CATEGORIES.map((id) => [id, 0])) as Record<CsirtVideoCategory, number>
    catalog.forEach((video) => {
      if (video.category) map[video.category] += 1
    })
    return map
  }, [catalog])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const rows = catalog.filter((video) => {
      if (category !== 'all' && video.category !== category) return false
      if (year !== 'all' && video.dateIso?.slice(0, 4) !== year) return false
      if (!needle) return true
      const hay = [video.title, video.excerpt, video.speaker, text.categories[video.category || 'sensibilisation']]
        .join(' ')
        .toLowerCase()
      return hay.includes(needle)
    })
    return rows
  }, [catalog, category, query, text.categories, year])

  const featured = catalog.find((video) => /directeur|à la une|\bdg\b/i.test(video.title)) || catalog[0]
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount - 1)
  const rows = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize)
  const rangeStart = filtered.length === 0 ? 0 : safePage * pageSize + 1
  const rangeEnd = safePage * pageSize + rows.length
  const totalViews = catalog.reduce((sum, video) => sum + (video.views || 0), 0)
  const usedCategories = MEDIA_CATEGORIES.filter((id) => counts[id] > 0).length

  function showAll() {
    setQuery('')
    setCategory('all')
    setYear('all')
    setPage(0)
  }

  return (
    <div className="mlib">
      <header className="mlib-hero">
        <div className="mlib-hero__inner">
          <div className="mlib-hero__copy">
            <nav className="mlib-crumb" aria-label="Fil d’Ariane">
              <Link href="/">{text.home}</Link>
              <ChevronRight aria-hidden />
              <span>{title}</span>
            </nav>
            <h1>
              <LibraryTitle title={title} />
            </h1>
            {lead ? <p>{lead}</p> : null}
            <form
              className="mlib-search"
              onSubmit={(event) => {
                event.preventDefault()
                setPage(0)
              }}
            >
              <label>
                <span className="sr-only">{text.search}</span>
                <Search aria-hidden />
                <input
                  value={query}
                  placeholder={text.search}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    setPage(0)
                  }}
                />
              </label>
              <button type="submit">
                {text.searchBtn}
                <ArrowRight aria-hidden />
              </button>
            </form>
          </div>
          <aside className="mlib-quote">
            <Quote aria-hidden />
            <p>{text.quote}</p>
          </aside>
        </div>
      </header>

      <div className="mlib-layout">
        <div className="mlib-main">
          <div className="mlib-filters">
            <label>
              <span className="sr-only">{text.allCategories}</span>
              <select
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value as 'all' | CsirtVideoCategory)
                  setPage(0)
                }}
              >
                <option value="all">{text.allCategories}</option>
                {MEDIA_CATEGORIES.map((id) => (
                  <option key={id} value={id}>
                    {text.categories[id]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">{text.allDates}</span>
              <select
                value={year}
                onChange={(event) => {
                  setYear(event.target.value)
                  setPage(0)
                }}
              >
                <option value="all">{text.allDates}</option>
                {years.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mlib-chips" role="tablist" aria-label={text.allCategories}>
            <button
              type="button"
              role="tab"
              aria-selected={category === 'all'}
              className={category === 'all' ? 'is-active' : undefined}
              onClick={showAll}
            >
              <LayoutGrid aria-hidden />
              {text.all}
              <em>({catalog.length})</em>
            </button>
            {MEDIA_CATEGORIES.map((id) => {
              const Icon = CATEGORY_ICON[id]
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={category === id}
                  className={category === id ? 'is-active' : undefined}
                  onClick={() => {
                    setCategory(id)
                    setPage(0)
                  }}
                >
                  <Icon aria-hidden />
                  {text.categories[id]}
                  <em>({counts[id]})</em>
                </button>
              )
            })}
          </div>

          <div className="mlib-head">
            <h2>{text.latest}</h2>
            <button type="button" onClick={showAll}>
              {text.seeAll}
              <ArrowRight aria-hidden />
            </button>
          </div>

          {rows.length === 0 ? (
            <p className="mlib-empty">{text.empty}</p>
          ) : (
            <ul className="mlib-grid">
              {rows.map((video) => (
                <li key={video.id}>
                  <VideoFace
                    video={video}
                    language={language}
                    categoryLabel={text.categories[video.category || 'sensibilisation']}
                    onOpen={() => setPlaying(video)}
                    playLabel={text.play}
                  />
                </li>
              ))}
            </ul>
          )}

          {filtered.length > 0 ? (
            <div className="mlib-foot">
              <p>
                {text.range
                  .replace('{from}', String(rangeStart))
                  .replace('{to}', String(rangeEnd))
                  .replace('{total}', String(filtered.length))}
              </p>
              {pageCount > 1 ? (
                <nav className="mlib-pager" aria-label="Pagination">
                  <button type="button" aria-label={text.prev} disabled={safePage === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>
                    <ChevronLeft aria-hidden />
                  </button>
                  {pagerTokens(pageCount, safePage).map((token, index) =>
                    token === 'gap' ? (
                      <span key={`gap-${index}`} aria-hidden>
                        …
                      </span>
                    ) : (
                      <button
                        key={token}
                        type="button"
                        className={token === safePage ? 'is-current' : undefined}
                        aria-current={token === safePage ? 'page' : undefined}
                        aria-label={`Page ${token + 1}`}
                        onClick={() => setPage(token)}
                      >
                        {token + 1}
                      </button>
                    ),
                  )}
                  <button
                    type="button"
                    aria-label={text.next}
                    disabled={safePage >= pageCount - 1}
                    onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
                  >
                    <ChevronRight aria-hidden />
                  </button>
                </nav>
              ) : (
                <span />
              )}
              <label className="mlib-size">
                <span className="sr-only">{text.perPage.replace('{n}', String(pageSize))}</span>
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value) as (typeof PAGE_SIZES)[number])
                    setPage(0)
                  }}
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {text.perPage.replace('{n}', String(size))}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
        </div>

        <aside className="mlib-side">
          {featured ? (
            <section className="mlib-panel" aria-labelledby="mlib-featured">
              <h2 id="mlib-featured">{text.featured}</h2>
              <VideoFace
                video={featured}
                language={language}
                categoryLabel={text.categories[featured.category || 'sensibilisation']}
                onOpen={() => setPlaying(featured)}
                playLabel={text.play}
                featured
              />
            </section>
          ) : null}

          <section className="mlib-youtube">
            <span className="mlib-youtube__mark" aria-hidden>
              <Youtube />
            </span>
            <div>
              <strong>{text.youtubeTitle}</strong>
              <p>{text.youtubeLead}</p>
            </div>
            <a href={youtubeUrl} target="_blank" rel="noreferrer">
              {text.youtubeCta}
              <ArrowRight aria-hidden />
            </a>
          </section>

          <section className="mlib-panel" aria-labelledby="mlib-stats">
            <h2 id="mlib-stats">{text.statsTitle}</h2>
            <ul className="mlib-stats">
              <li>
                <span className="is-green" aria-hidden>
                  <Play />
                </span>
                <b>{catalog.length}</b>
                <small>{text.statVideos}</small>
              </li>
              <li>
                <span className="is-blue" aria-hidden>
                  <LayoutGrid />
                </span>
                <b>{usedCategories}</b>
                <small>{text.statCategories}</small>
              </li>
              <li>
                <span className="is-amber" aria-hidden>
                  <Eye />
                </span>
                <b>{totalViews > 0 ? compactCount(totalViews, language) : '—'}</b>
                <small>{text.statViews}</small>
              </li>
              <li>
                <span className="is-teal" aria-hidden>
                  <Download />
                </span>
                <b>{counts.replay}</b>
                <small>{text.statReplays}</small>
              </li>
            </ul>
          </section>
        </aside>
      </div>

      <CsirtVideoModal
        video={playing}
        open={Boolean(playing)}
        onOpenChange={(open) => {
          if (!open) setPlaying(null)
        }}
        t={t}
      />
    </div>
  )
}
