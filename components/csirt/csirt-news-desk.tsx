'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  Bug,
  ChevronLeft,
  ChevronRight,
  FileText,
  Headphones,
  Layers,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import {
  newsCategoryLabel,
  normalizeSiteNewsCategory,
  resolveNewsTopics,
  type SiteNewsTopic,
} from '@/lib/site/news-sources'
import '@/components/csirt/csirt-news-desk.css'

const PAGE_SIZES = [20, 50] as const

const MONTHS = ['JANV', 'FÉVR', 'MARS', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEPT', 'OCT', 'NOV', 'DÉC']
const MONTHS_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

type DeskItem = {
  id: string
  date: string
  title: string
  excerpt: string
  href: string
  category: string
  author?: string
}

type Props = {
  items: DeskItem[]
  topics: SiteNewsTopic[]
  initialCategory?: string
}

const CATEGORY_ICONS: Record<string, { icon: LucideIcon; tone: string }> = {
  ALERTES_SECURITE: { icon: ShieldAlert, tone: 'red' },
  MENACES_INCIDENTS: { icon: TriangleAlert, tone: 'orange' },
  AVIS_SECURITE: { icon: Bug, tone: 'violet' },
  IOC: { icon: Bug, tone: 'sky' },
  DURCISSEMENT: { icon: ShieldCheck, tone: 'amber' },
  BULLETINS: { icon: FileText, tone: 'blue' },
}

function plain(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function formatLong(iso: string) {
  const [year = '', month = '', day = ''] = iso.slice(0, 10).split('-')
  const label = MONTHS_LONG[Number(month) - 1]
  if (!label) return iso.slice(0, 10)
  return `${Number(day)} ${label} ${year}`
}

function splitDate(iso: string) {
  const [year = '', month = '', day = ''] = iso.slice(0, 10).split('-')
  return {
    day: day.replace(/^0/, ''),
    month: MONTHS[Number(month) - 1] ?? '',
    year,
  }
}

function findRef(text: string) {
  return text.match(/\b((?:CERTFR|CERT-FR)-\d{4}-[A-Z]+-\d+|CVE-\d{4}-\d+)\b/i)?.[1]
}

export function CsirtNewsDesk({ items, topics, initialCategory = '' }: Props) {
  const topicList = resolveNewsTopics(topics)
  const [category, setCategory] = useState(initialCategory)
  const [sort, setSort] = useState<'desc' | 'asc'>('desc')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(20)

  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of items) {
      const id = normalizeSiteNewsCategory(item.category, topicList)
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    return topicList.map((topic) => ({
      id: topic.id,
      label: topic.label,
      count: counts.get(topic.id) ?? 0,
      tone: topic.tone,
    }))
  }, [items, topicList])

  const filtered = useMemo(() => {
    return items
      .filter((item) => {
        const id = normalizeSiteNewsCategory(item.category, topicList)
        if (category && id !== category) return false
        return true
      })
      .sort((a, b) => {
        const diff = a.date.localeCompare(b.date)
        return sort === 'asc' ? diff : -diff
      })
  }, [items, topicList, category, sort])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pages - 1)
  const start = safePage * pageSize
  const visible = filtered.slice(start, start + pageSize)
  const from = filtered.length === 0 ? 0 : start + 1
  const to = start + visible.length
  const activeLabel = category ? newsCategoryLabel(category, topicList) : 'Toutes les actualités'

  const applyFilters = (next: { category?: string; sort?: 'desc' | 'asc' }) => {
    if (next.category !== undefined) setCategory(next.category)
    if (next.sort !== undefined) setSort(next.sort)
    setPage(0)
  }

  return (
    <div className="news-desk">
      <h1 className="sr-only">Actualités et alertes</h1>
      <div className="news-desk__layout">
        <section aria-labelledby="news-desk-list">
          <header className="news-desk__bar">
            <h2 id="news-desk-list">
              {activeLabel} <span>({filtered.length})</span>
            </h2>
            <label>
              <span className="sr-only">Trier</span>
              <select value={sort} onChange={(event) => applyFilters({ sort: event.target.value as 'desc' | 'asc' })}>
                <option value="desc">Plus récentes d’abord</option>
                <option value="asc">Plus anciennes d’abord</option>
              </select>
            </label>
          </header>

          {visible.length === 0 ? (
            <p className="news-desk__empty">Aucune actualité ne correspond à cette recherche.</p>
          ) : (
            <ol className="news-desk__list">
              {visible.map((item) => {
                const id = normalizeSiteNewsCategory(item.category, topicList)
                const label = newsCategoryLabel(id, topicList)
                const tone = CATEGORY_ICONS[id]?.tone ?? (topicList.find((topic) => topic.id === id)?.tone === 'alert' ? 'red' : 'green')
                const when = splitDate(item.date)
                const excerpt = plain(item.excerpt)
                const ref = findRef(`${item.title} ${excerpt}`)
                return (
                  <li key={item.id}>
                    <article className={`is-${tone}`}>
                      <time dateTime={item.date}>
                        <strong>{when.day}</strong>
                        <span>{when.month}</span>
                        <small>{when.year}</small>
                      </time>
                      <div>
                        <h3>
                          <span className={`news-desk__cat is-${tone}`}>{label}</span>
                          <Link href={item.href}>{item.title}</Link>
                        </h3>
                        {ref ? (
                          <p className="news-desk__tags">
                            <span className="is-ref">{ref}</span>
                          </p>
                        ) : null}
                        {excerpt ? <p>{excerpt}</p> : null}
                        <p className="news-desk__meta">
                          <span>{formatLong(item.date)}</span>
                          {item.author ? <span>{item.author}</span> : null}
                        </p>
                      </div>
                    </article>
                  </li>
                )
              })}
            </ol>
          )}

          <footer className="news-desk__foot">
            {pages > 1 ? (
              <nav className="news-desk__pager" aria-label="Pagination des actualités">
                <button type="button" aria-label="Page précédente" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
                  <ChevronLeft aria-hidden />
                </button>
                {Array.from({ length: pages }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    aria-current={index === safePage ? 'page' : undefined}
                    onClick={() => setPage(index)}
                  >
                    {index + 1}
                  </button>
                ))}
                <button type="button" aria-label="Page suivante" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}>
                  <ChevronRight aria-hidden />
                </button>
              </nav>
            ) : (
              <span />
            )}
            <label className="news-desk__pagesize">
              Afficher
              <select
                value={pageSize}
                aria-label={`Afficher ${pageSize} par page`}
                onChange={(event) => {
                  setPageSize(Number(event.target.value) as (typeof PAGE_SIZES)[number])
                  setPage(0)
                }}
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              par page
            </label>
          </footer>
        </section>

        <aside className="news-desk__side">
          <section aria-labelledby="news-desk-cats">
            <h2 id="news-desk-cats">Filtrer par catégorie</h2>
            <ul>
              <li>
                <button type="button" className={!category ? 'is-active' : ''} onClick={() => applyFilters({ category: '' })}>
                  <Layers aria-hidden />
                  <span>Toutes</span>
                  <em>{items.length}</em>
                </button>
              </li>
              {categories.map((cat) => {
                const Icon = CATEGORY_ICONS[cat.id]?.icon ?? FileText
                const tone = CATEGORY_ICONS[cat.id]?.tone ?? (cat.tone === 'alert' ? 'red' : 'green')
                return (
                  <li key={cat.id}>
                    <button
                      type="button"
                      className={category === cat.id ? 'is-active' : ''}
                      onClick={() => applyFilters({ category: cat.id })}
                    >
                      <Icon className={`is-${tone}`} aria-hidden />
                      <span>{cat.label}</span>
                      <em>{cat.count}</em>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="news-desk__help">
            <h2>
              <Headphones aria-hidden />
              Besoin d’aide ?
            </h2>
            <p>Contactez l’équipe du CSIRT-ARPT, disponible 24h/24 et 7j/7.</p>
            <div>
              <Link href="/contacts">Nous contacter</Link>
            </div>
          </section>
        </aside>
      </div>

      <p className="news-desk__range">
        {filtered.length === 0
          ? 'Aucune publication'
          : `Affichage de ${from} à ${to} sur ${filtered.length} publication${filtered.length > 1 ? 's' : ''}`}
      </p>
    </div>
  )
}
