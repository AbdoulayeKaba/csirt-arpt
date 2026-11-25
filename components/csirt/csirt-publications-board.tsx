'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Bell,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  FileText,
  Layers,
  Newspaper,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import { useCsirtLocale } from '@/components/csirt/csirt-locale-provider'
import { CsirtNewsletterModal } from '@/components/csirt/csirt-newsletter-modal'
import { NEWS_CATEGORY_LABELS_EN, NEWS_TOPICS_EN } from '@/lib/csirt/content-en'
import { CSIRT_NEWS, type CsirtNewsItem } from '@/lib/csirt/home-content'
import {
  DEFAULT_NEWS_TOPICS,
  newsCategoryLabel,
  normalizeSiteNewsCategory,
  resolveNewsTopics,
  sortNewsTopics,
  type SiteNewsTopic,
} from '@/lib/site/news-sources'
import { newsTeaserText } from '@/lib/site/news-text'
import '@/components/csirt/csirt-news-desk.css'
import '@/components/csirt/csirt-home-desk.css'

const PAGE_SIZES = [20, 50] as const
const HOME_PER_CATEGORY = 3

function localDay(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function periodRange(period: string) {
  if (period === 'all') return { from: '', to: '' }
  const now = new Date()
  const to = localDay(now)
  if (period === 'year') return { from: `${now.getFullYear()}-01-01`, to }
  const start = new Date(now)
  start.setDate(start.getDate() - (period === '30' ? 30 : 365))
  return { from: localDay(start), to }
}
const REF_CODE = /(?:CERT|CSIRT)[-A-Z]{0,8}-\d{4}-[A-Z]{2,5}-\d+/i
const DATE_IN_TITLE = /\(\s*\d{1,2}\s+[A-Za-zÀ-ÿ.]+\s+\d{4}\s*\)/g

function publicationRef(item: CsirtNewsItem) {
  const blob = [item.externalHref, item.title, item.excerpt, item.bodyHtml].filter(Boolean).join(' ')
  const match = blob.match(REF_CODE)
  return match ? match[0].toUpperCase() : null
}

function publicationTitle(item: CsirtNewsItem, ref: string | null) {
  let title = item.title
  if (ref) title = title.replace(new RegExp(ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '')
  title = title.replace(DATE_IN_TITLE, '')
  return title.replace(/^[\s–—:|.-]+|[\s–—:|.-]+$/g, '').replace(/\s{2,}/g, ' ').trim() || item.title
}

function topicLabel(topic: SiteNewsTopic, language: 'fr' | 'en') {
  if (language === 'fr') return topic.label
  return NEWS_TOPICS_EN[topic.id] ?? NEWS_CATEGORY_LABELS_EN[topic.label] ?? topic.label
}

function seeAllLabel(id: string, language: 'fr' | 'en') {
  const fr: Record<string, string> = {
    all: 'Voir toutes les alertes',
    ALERTES_SECURITE: 'Voir toutes les alertes',
    MENACES_INCIDENTS: 'Voir tous les rapports',
    AVIS_SECURITE: 'Voir tous les avis',
    IOC: 'Voir tous les indicateurs',
    DURCISSEMENT: 'Voir toutes les recommandations',
    BULLETINS: 'Voir tous les bulletins',
  }
  const en: Record<string, string> = {
    all: 'See all alerts',
    ALERTES_SECURITE: 'See all alerts',
    MENACES_INCIDENTS: 'See all reports',
    AVIS_SECURITE: 'See all advisories',
    IOC: 'See all indicators',
    DURCISSEMENT: 'See all recommendations',
    BULLETINS: 'See all bulletins',
  }
  const table = language === 'en' ? en : fr
  return table[id] ?? table.all
}

function homeBoardTopics(topics?: readonly SiteNewsTopic[]) {
  const list = resolveNewsTopics(topics)
  const byId = new Map(list.map((topic) => [topic.id, topic]))
  for (const fallback of DEFAULT_NEWS_TOPICS) {
    if (!byId.has(fallback.id)) byId.set(fallback.id, fallback)
  }
  return sortNewsTopics([...byId.values()])
}

function dayKey(isoDate: string) {
  return isoDate.slice(0, 10)
}

function inDateRange(isoDate: string, from: string, to: string) {
  const day = dayKey(isoDate)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return !from && !to
  const start = from && to && from > to ? to : from
  const end = from && to && from > to ? from : to
  if (start && day < start) return false
  if (end && day > end) return false
  return true
}

function sortItems(list: CsirtNewsItem[], sort: 'desc' | 'asc') {
  return [...list].sort((a, b) => {
    const diff = (Date.parse(a.date) || 0) - (Date.parse(b.date) || 0)
    return sort === 'desc' ? -diff : diff
  })
}

function boardStamp(isoDate: string, language: 'fr' | 'en') {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return { day: '', month: '', year: '' }
  const locale = language === 'en' ? 'en-GB' : 'fr-FR'
  return {
    day: new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(date),
    month: new Intl.DateTimeFormat(locale, { month: 'short' }).format(date).replace('.', ''),
    year: new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(date),
  }
}

function categoryMark(id: string) {
  if (id === 'ALERTES_SECURITE') return { Icon: TriangleAlert, tone: 'rose' }
  if (id === 'MENACES_INCIDENTS') return { Icon: ShieldAlert, tone: 'amber' }
  if (id === 'AVIS_SECURITE') return { Icon: Shield, tone: 'blue' }
  if (id === 'IOC') return { Icon: Crosshair, tone: 'sky' }
  if (id === 'DURCISSEMENT') return { Icon: ShieldCheck, tone: 'green' }
  return { Icon: Newspaper, tone: 'violet' }
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

function HomeFeedRows({
  items,
  topicList,
  language,
}: {
  items: readonly CsirtNewsItem[]
  topicList: readonly SiteNewsTopic[]
  language: 'fr' | 'en'
}) {
  return (
    <ol className="home-feed">
      {items.map((item) => {
        const ref = publicationRef(item)
        const headingText = publicationTitle(item, ref)
        const teaser = newsTeaserText(item, 220)
        const categoryId = normalizeSiteNewsCategory(item.category, topicList)
        const topic = topicList.find((entry) => entry.id === categoryId)
        const categoryName = topic ? topicLabel(topic, language) : newsCategoryLabel(categoryId, topicList)
        const mark = categoryMark(categoryId)
        const stamp = boardStamp(item.date, language)
        return (
          <li key={item.id}>
            <article className={`home-feed__row is-${mark.tone}`}>
              <time dateTime={item.date}>
                <strong>{stamp.day}</strong>
                <span>{stamp.month}</span>
                <small>{stamp.year}</small>
              </time>
              <div>
                <span className={`home-desk__cat is-${mark.tone}`}>{categoryName}</span>
                <h3>
                  <Link href={item.href}>{headingText}</Link>
                </h3>
                {teaser ? <p>{teaser}</p> : null}
              </div>
              <Link href={item.href} className="home-feed__read">
                {language === 'en' ? 'Read' : 'Lire'}
                <ArrowRight aria-hidden />
              </Link>
            </article>
          </li>
        )
      })}
    </ol>
  )
}

function matchesQuery(
  item: CsirtNewsItem,
  query: string,
  title: string,
  ref: string | null,
  categoryLabel: string,
) {
  if (!query) return true
  const hay = [title, item.excerpt, item.bodyHtml, ref, categoryLabel, item.dateShort]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return hay.includes(query)
}

export function CsirtPublicationsBoard({
  items = CSIRT_NEWS,
  topics,
}: {
  items?: readonly CsirtNewsItem[]
  topics?: readonly SiteNewsTopic[]
}) {
  const { language, t } = useCsirtLocale()
  const news = items.length ? items : CSIRT_NEWS
  const topicList = useMemo(() => homeBoardTopics(topics), [topics])
  const [category, setCategory] = useState<'all' | string>('all')
  const [period, setPeriod] = useState('all')
  const [sort, setSort] = useState<'desc' | 'asc'>('desc')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(20)
  const search = query.trim().toLowerCase()

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of news) {
      const id = normalizeSiteNewsCategory(item.category, topicList)
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    return counts
  }, [news, topicList])

  const range = useMemo(() => periodRange(period), [period])

  const filtered = useMemo(() => {
    const rows = news.filter((item) => {
      const id = normalizeSiteNewsCategory(item.category, topicList)
      if (category !== 'all' && id !== category && item.category !== category) return false
      if (!inDateRange(item.date, range.from, range.to)) return false
      const ref = publicationRef(item)
      const title = publicationTitle(item, ref)
      const topic = topicList.find((entry) => entry.id === id)
      const categoryLabel = topic ? topicLabel(topic, language) : newsCategoryLabel(id, topicList)
      return matchesQuery(item, search, title, ref, categoryLabel)
    })
    return sortItems(rows, sort)
  }, [category, language, news, range.from, range.to, search, sort, topicList])

  useEffect(() => {
    setPage(0)
  }, [category, pageSize, period, search, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount - 1)
  const rows = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize)
  const rangeStart = filtered.length === 0 ? 0 : safePage * pageSize + 1
  const rangeEnd = safePage * pageSize + rows.length
  const alertCount = categoryCounts.get('ALERTES_SECURITE') ?? 0
  const fr = language !== 'en'
  const previewByCategory = category === 'all' && !search && period === 'all'
  const categoryPreview = useMemo(() => {
    if (!previewByCategory) return []
    const buckets = new Map<string, CsirtNewsItem[]>()
    for (const item of filtered) {
      const id = normalizeSiteNewsCategory(item.category, topicList)
      const bucket = buckets.get(id)
      if (!bucket) buckets.set(id, [item])
      else if (bucket.length < HOME_PER_CATEGORY) bucket.push(item)
    }
    return topicList
      .map((topic) => ({ topic, items: buckets.get(topic.id) ?? [] }))
      .filter((group) => group.items.length > 0)
  }, [filtered, previewByCategory, topicList])
  return (
    <>
    <header className="news-desk home-alerts-intro">
      <div className="news-desk__hero">
        <div className="news-desk__hero-inner">
          <div>
            <h1>
              {fr ? 'Actualités' : 'News'} <span>{fr ? '& alertes' : '& alerts'}</span>
            </h1>
            <p className="news-desk__lead">
              {fr
                ? 'Suivez les dernières informations, alertes et publications du CSIRT-ARPT.'
                : 'Follow the latest information, alerts and publications from CSIRT-ARPT.'}
            </p>
          </div>
          <ul className="news-desk__stats" aria-label={fr ? 'Indicateurs' : 'Figures'}>
            <li>
              <span className="is-green" aria-hidden>
                <FileText />
              </span>
              <div>
                <strong>{news.length}</strong>
                <small>{fr ? 'Publications' : 'Publications'}</small>
              </div>
            </li>
            <li>
              <span className="is-red" aria-hidden>
                <ShieldAlert />
              </span>
              <div>
                <strong>{alertCount}</strong>
                <small>{fr ? 'Alertes de sécurité' : 'Security alerts'}</small>
              </div>
            </li>
          </ul>
        </div>
        <form
          className="news-desk__search"
          role="search"
          onSubmit={(event) => event.preventDefault()}
        >
          <label className="news-desk__search-field">
            <Search aria-hidden />
            <span className="sr-only">{t('newsSearchLabel')}</span>
            <input
              type="search"
              value={query}
              placeholder={
                fr
                  ? 'Rechercher une actualité, un mot-clé, une référence…'
                  : 'Search a news item, keyword or reference…'
              }
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label>
            <span className="sr-only">{fr ? 'Période' : 'Period'}</span>
            <select value={period} onChange={(event) => setPeriod(event.target.value)}>
              <option value="all">{fr ? 'Toutes les périodes' : 'All periods'}</option>
              <option value="30">{fr ? '30 derniers jours' : 'Last 30 days'}</option>
              <option value="365">{fr ? '12 derniers mois' : 'Last 12 months'}</option>
              <option value="year">{fr ? 'Cette année' : 'This year'}</option>
            </select>
          </label>
          <label>
            <span className="sr-only">{fr ? 'Type' : 'Type'}</span>
            <select
              value={category === 'all' ? '' : category}
              onChange={(event) => setCategory(event.target.value || 'all')}
            >
              <option value="">{fr ? 'Tous les types' : 'All types'}</option>
              {topicList.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topicLabel(topic, language)}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">
            {fr ? 'Rechercher' : 'Search'}
            <ArrowRight aria-hidden />
          </button>
        </form>
      </div>
    </header>
    <div className="home-desk" id="publications">
      <div className="home-desk__panel">
        <aside className="home-desk__cats">
          <p>
            <Layers aria-hidden />
            {language === 'en' ? 'Categories' : 'Catégories'}
          </p>
          <nav role="tablist" aria-label={t('newsFilterCategory')}>
            <button
              type="button"
              role="tab"
              aria-selected={category === 'all'}
              className={category === 'all' ? 'is-current is-green' : 'is-green'}
              onClick={() => setCategory('all')}
            >
              <span aria-hidden>
                <Layers strokeWidth={1.8} />
              </span>
              <strong>{t('newsFilterAllCategories')}</strong>
              <b>{news.length}</b>
            </button>
            {topicList.map((topic) => {
              const mark = categoryMark(topic.id)
              const Icon = mark.Icon
              return (
                <button
                  key={topic.id}
                  type="button"
                  role="tab"
                  aria-selected={category === topic.id}
                  className={category === topic.id ? `is-current is-${mark.tone}` : `is-${mark.tone}`}
                  onClick={() => setCategory(topic.id)}
                >
                  <span aria-hidden>
                    <Icon strokeWidth={1.8} />
                  </span>
                  <strong>{topicLabel(topic, language)}</strong>
                  <b>{categoryCounts.get(topic.id) ?? 0}</b>
                </button>
              )
            })}
          </nav>
          <CsirtNewsletterModal
            title={fr ? 'S’abonner aux alertes' : 'Subscribe to alerts'}
            description={
              fr
                ? 'Recevez les alertes et publications officielles du CSIRT-ARPT.'
                : 'Receive official CSIRT-ARPT alerts and publications.'
            }
            submitLabel={fr ? 'Confirmer l’abonnement' : 'Confirm subscription'}
            trigger={
              <button type="button" className="home-desk__subscribe">
                <Bell aria-hidden />
                <span>
                  <strong>{fr ? 'S’abonner aux alertes' : 'Subscribe to alerts'}</strong>
                  <small>
                    {fr ? 'Alertes et publications officielles' : 'Official alerts and publications'}
                  </small>
                </span>
              </button>
            }
          />
        </aside>
        <div className="home-desk__main">
          <header className="home-desk__head">
            <h2>
              {previewByCategory
                ? language === 'en'
                  ? 'Latest from each category'
                  : 'Dernières de chaque catégorie'
                : language === 'en'
                  ? 'Latest security alerts'
                  : 'Dernières alertes de sécurité'}
            </h2>
            <div className="home-desk__head-tools">
              <label className="home-desk__select">
                <span className="sr-only">{t('newsFilterSort')}</span>
                <select value={sort} onChange={(event) => setSort(event.target.value as 'desc' | 'asc')}>
                  <option value="desc">{t('newsSortDesc')}</option>
                  <option value="asc">{t('newsSortAsc')}</option>
                </select>
              </label>
              <Link href="/actualites">
                {seeAllLabel('all', language)}
                <ArrowRight aria-hidden />
              </Link>
            </div>
          </header>

          {previewByCategory ? (
            categoryPreview.length === 0 ? (
              <p className="home-desk__empty">{t('newsEmpty')}</p>
            ) : (
              <div className="home-feed-groups">
                {categoryPreview.map(({ topic, items: groupItems }) => {
                  const mark = categoryMark(topic.id)
                  const Icon = mark.Icon
                  const label = topicLabel(topic, language)
                  return (
                    <section key={topic.id} className={`home-feed__group is-${mark.tone}`} aria-label={label}>
                      <h3 className="home-feed__group-title">
                        <span aria-hidden>
                          <Icon strokeWidth={2.1} />
                        </span>
                        {label}
                      </h3>
                      <HomeFeedRows items={groupItems} topicList={topicList} language={language} />
                    </section>
                  )
                })}
              </div>
            )
          ) : rows.length === 0 ? (
            <p className="home-desk__empty">{t('newsEmpty')}</p>
          ) : (
            <HomeFeedRows items={rows} topicList={topicList} language={language} />
          )}

          {!previewByCategory && filtered.length > 0 ? (
            <footer className="home-desk__pager">
              <p>
                {t('newsResultsRange')
                  .replace('{from}', String(rangeStart))
                  .replace('{to}', String(rangeEnd))
                  .replace('{total}', String(filtered.length))}
              </p>
              <nav aria-label={t('newsPagerAria')}>
                <button
                  type="button"
                  aria-label={t('newsPrevPage')}
                  disabled={safePage === 0}
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                >
                  <ChevronLeft size={16} strokeWidth={2.2} />
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
                  aria-label={t('newsNextPage')}
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
                >
                  <ChevronRight size={16} strokeWidth={2.2} />
                </button>
              </nav>
              <label>
                {language === 'en' ? 'Show' : 'Afficher'}
                <select
                  value={pageSize}
                  aria-label={t('newsPerPage').replace('{n}', String(pageSize))}
                  onChange={(event) => setPageSize(Number(event.target.value) as (typeof PAGE_SIZES)[number])}
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                {language === 'en' ? 'per page' : 'par page'}
              </label>
            </footer>
          ) : null}
        </div>
      </div>
    </div>
    </>
  )
}
