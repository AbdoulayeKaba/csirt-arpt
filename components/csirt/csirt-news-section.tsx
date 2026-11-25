'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowRight, ArrowUpDown, ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, ListFilter } from 'lucide-react'
import { CsirtNewsThumbnail } from '@/components/csirt/csirt-news-thumbnail'
import { useCsirtLocale } from '@/components/csirt/csirt-locale-provider'
import {
  isAlertNewsCategory,
  newsCategoryLabel,
  normalizeSiteNewsCategory,
  resolveNewsTopics,
  type SiteNewsTopic,
} from '@/lib/site/news-sources'
import { newsTeaserText } from '@/lib/site/news-text'
import { monthLabelFromKey } from '@/lib/csirt/localize-public'
import { NEWS_CATEGORY_LABELS_EN } from '@/lib/csirt/content-en'
import { CSIRT_NEWS, type CsirtNewsItem } from '@/lib/csirt/home-content'

const PAGE_SIZE = 3

function monthKey(isoDate: string) {
  return isoDate.slice(0, 7)
}

function categoryLabel(
  category: string,
  topics: readonly SiteNewsTopic[] | undefined,
  language: 'fr' | 'en',
) {
  const label = newsCategoryLabel(category, topics)
  if (language === 'fr') return label
  return NEWS_CATEGORY_LABELS_EN[label] ?? NEWS_CATEGORY_LABELS_EN[category] ?? label
}

export function CsirtNewsSection({
  items = CSIRT_NEWS,
  topics,
}: {
  items?: readonly CsirtNewsItem[]
  topics?: readonly SiteNewsTopic[]
}) {
  const { language, t } = useCsirtLocale()
  const news = items.length ? items : CSIRT_NEWS
  const topicList = resolveNewsTopics(topics)
  const [category, setCategory] = useState<'all' | string>('all')
  const [month, setMonth] = useState('all')
  const [sort, setSort] = useState<'desc' | 'asc'>('desc')
  const [page, setPage] = useState(0)
  const [featured, setFeatured] = useState(0)

  const monthOptions = useMemo(() => {
    const keys = [...new Set(news.map((item) => monthKey(item.date)))]
    return keys.sort((a, b) => b.localeCompare(a))
  }, [news])

  const filtered = useMemo(() => {
    const list = news.filter((item) => {
      const byCategory =
        category === 'all' ||
        item.category === category ||
        normalizeSiteNewsCategory(item.category, topicList) === category
      const byMonth = month === 'all' || monthKey(item.date) === month
      return byCategory && byMonth
    })
    return [...list].sort((a, b) => {
      if (sort === 'desc') {
        const timeA = (a as any).enabledAt ? Date.parse((a as any).enabledAt) || 0 : 0
        const timeB = (b as any).enabledAt ? Date.parse((b as any).enabledAt) || 0 : 0
        if (timeA !== timeB) return timeB - timeA

        const dateDiff = (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0)
        if (dateDiff !== 0) return dateDiff
        return b.date.localeCompare(a.date)
      } else {
        const dateDiff = (Date.parse(a.date) || 0) - (Date.parse(b.date) || 0)
        if (dateDiff !== 0) return dateDiff
        return a.date.localeCompare(b.date)
      }
    })
  }, [category, month, news, sort, topicList])

  const categoryOptions = useMemo(() => {
    const fromTopics = topicList.map((item) => ({ value: item.id, label: item.label }))
    const known = new Set(fromTopics.map((item) => item.value.toLowerCase()))
    for (const item of news) {
      const raw = item.category?.trim()
      if (!raw) continue
      if (known.has(raw.toLowerCase())) continue
      if (topicList.some((topic) => topic.label.toLowerCase() === raw.toLowerCase())) continue
      known.add(raw.toLowerCase())
      fromTopics.push({ value: raw, label: raw })
    }
    return fromTopics
  }, [news, topicList])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const featuredPool = filtered.length > 0 ? filtered : news
  const safeFeaturedIndex = Math.min(featured, Math.max(0, featuredPool.length - 1))
  const lead = featuredPool[safeFeaturedIndex] ?? news[0]
  if (!lead) return null
  const leadTeaser = newsTeaserText(lead, 320)

  // Articles pour la liste de droite en excluant l'article actuellement mis « À la une »
  const feedItems = useMemo(() => {
    return filtered.filter((item) => item.id !== lead.id)
  }, [filtered, lead])

  const feedPageCount = Math.max(1, Math.ceil(feedItems.length / PAGE_SIZE))
  const safePage = Math.min(page, feedPageCount - 1)
  const pageItems = feedItems.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  const resultLabel =
    filtered.length > 1
      ? `${filtered.length} ${t('newsPublications')}`
      : `${filtered.length} ${t('newsPublication')}`

  return (
    <section className="csirt-news" aria-labelledby="csirt-news-title">
      <article
        className={`csirt-news-featured${isAlertNewsCategory(lead.category, topicList) ? ' is-alert' : ''}`}
      >
        <div className="csirt-news-featured-media">
          {isAlertNewsCategory(lead.category, topicList) ? null : (
            <CsirtNewsThumbnail
              src={lead.image}
              title={lead.title}
              category={lead.category}
              featured
            />
          )}
          <span className="csirt-news-featured-kicker">{t('newsFeaturedKicker')}</span>
          <button
            type="button"
            className="csirt-hero-arrow csirt-hero-arrow--prev"
            aria-label={t('newsPrev')}
            onClick={() => setFeatured((i) => (i - 1 + featuredPool.length) % featuredPool.length)}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="csirt-hero-arrow csirt-hero-arrow--next"
            aria-label={t('newsNext')}
            onClick={() => setFeatured((i) => (i + 1) % featuredPool.length)}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="csirt-news-featured-dots">
            {featuredPool.slice(0, 10).map((item, i) => (
              <button
                key={item.id}
                type="button"
                className={`csirt-hero-dot${i === safeFeaturedIndex ? ' is-active is-green' : ''}`}
                aria-label={`${t('newsFeaturedDot')} ${i + 1}`}
                onClick={() => setFeatured(i)}
              />
            ))}
          </div>
        </div>
        <div className="csirt-news-featured-body">
          <p className="csirt-news-meta">
            {lead.dateShort}
            <span aria-hidden> | </span>
            <span
              className={
                isAlertNewsCategory(lead.category, topicList)
                  ? 'csirt-news-cat csirt-news-cat--red'
                  : 'csirt-news-cat'
              }
            >
              {categoryLabel(lead.category, topicList, language)}
            </span>
          </p>
          <h3>{lead.title}</h3>
          {leadTeaser ? <p className="csirt-news-excerpt">{leadTeaser}</p> : null}
          <div className="csirt-news-actions">
            <Link href={lead.href} className="csirt-btn csirt-btn--green">
              {t('newsSeeMore')}
            </Link>
            {lead.externalHref ? (
              <a
                href={lead.externalHref}
                className="csirt-btn csirt-btn--outline-red"
                target="_blank"
                rel="noreferrer"
              >
                {t('newsExternalLink')}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </a>
            ) : null}
          </div>
        </div>
      </article>

      <div className="csirt-news-feed">
        <header className="csirt-news-feed-head">
          <div>
            <p className="csirt-news-feed-kicker">{t('newsFeedKicker')}</p>
            <h2 id="csirt-news-title">
              <strong>{t('newsFeedTitleStrong')}</strong> {language === 'fr' ? 'et' : '&'}{' '}
              <span>
                <strong>{t('newsFeedTitleSpan')}</strong>
              </span>
            </h2>
          </div>
          <p className="csirt-news-feed-count">{resultLabel}</p>
        </header>

        <div className="csirt-news-filters" role="search" aria-label={t('newsFilterAria')}>
          <label>
            <span>
              <ListFilter aria-hidden />
              {t('newsFilterCategory')}
            </span>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value)
                setPage(0)
                setFeatured(0)
              }}
            >
              <option value="all">{t('newsFilterAllCategories')}</option>
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>
              <CalendarDays aria-hidden />
              {t('newsFilterDate')}
            </span>
            <select
              value={month}
              onChange={(e) => {
                setMonth(e.target.value)
                setPage(0)
                setFeatured(0)
              }}
            >
              <option value="all">{t('newsFilterAllDates')}</option>
              {monthOptions.map((key) => (
                <option key={key} value={key}>
                  {monthLabelFromKey(key, language)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>
              <ArrowUpDown aria-hidden />
              {t('newsFilterSort')}
            </span>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as 'desc' | 'asc')
                setPage(0)
                setFeatured(0)
              }}
            >
              <option value="desc">{t('newsSortDesc')}</option>
              <option value="asc">{t('newsSortAsc')}</option>
            </select>
          </label>
        </div>

        {pageItems.length === 0 ? (
          <p className="csirt-news-empty">{t('newsEmpty')}</p>
        ) : (
          <ul className="csirt-news-list">
            {pageItems.map((item) => {
              const teaser = newsTeaserText(item, 180)
              return (
                <li
                  key={item.id}
                  className={`csirt-news-card${isAlertNewsCategory(item.category, topicList) ? ' is-alert' : ''}`}
                >
                  {isAlertNewsCategory(item.category, topicList) ? null : (
                    <Link href={item.href} className="csirt-news-card-media" tabIndex={-1} aria-hidden>
                      <CsirtNewsThumbnail
                        src={item.image}
                        title={item.title}
                        category={item.category}
                      />
                    </Link>
                  )}
                  <div className="csirt-news-card-body">
                    <div className="csirt-news-card-meta">
                      <span
                        className={`csirt-news-badge${isAlertNewsCategory(item.category, topicList) ? ' is-red' : ' is-green'}`}
                      >
                        {categoryLabel(item.category, topicList, language)}
                      </span>
                      <time className="csirt-news-date" dateTime={item.date}>
                        {item.dateLabel}
                      </time>
                    </div>
                    <h3>
                      <Link href={item.href}>{item.title}</Link>
                    </h3>
                    {teaser ? <p className="csirt-news-card-excerpt">{teaser}</p> : null}
                    <div className="csirt-news-card-actions">
                      <Link href={item.href} className="csirt-news-read">
                        {t('newsReadArticle')}
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                      {item.externalHref ? (
                        <a
                          href={item.externalHref}
                          className="csirt-news-ext"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t('newsSource')}
                          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                        </a>
                      ) : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <div className="csirt-news-pager">
          <span>
            {safePage + 1}/{feedPageCount}
          </span>
          <div className="csirt-news-pager-nav">
            <button
              type="button"
              aria-label={t('newsPrevPage')}
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={t('newsNextPage')}
              disabled={safePage >= feedPageCount - 1}
              onClick={() => setPage((p) => Math.min(feedPageCount - 1, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <Link href="/actualites">{t('newsViewAll')}</Link>
        </div>
      </div>
    </section>
  )
}
