'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  isAlertNewsCategory,
  newsCategoryLabel,
  normalizeSiteNewsCategory,
  resolveNewsTopics,
  type SiteNewsTopic,
} from '@/lib/site/news-sources'
import type { CsirtNewsItem } from '@/lib/csirt/home-content'

const PAGE_SIZE = 7

function extractCertReference(item: CsirtNewsItem) {
  const fromUrl = item.externalHref?.match(/CERTFR-\d{4}-[A-Z]+-\d+/i)?.[0]
  if (fromUrl) return fromUrl.toUpperCase()
  const fromTitle = item.title.match(/(?:CERT|CSIRT)[-A-Z]{0,8}-\d{4}-[A-Z]{2,5}-\d+/i)?.[0]
  if (fromTitle) return fromTitle.toUpperCase()
  const fromBody = item.bodyHtml?.match(/CERTFR-\d{4}-[A-Z]+-\d+/i)?.[0]
  return fromBody?.toUpperCase() ?? null
}

function relatedTitle(item: CsirtNewsItem, ref: string | null) {
  let title = item.title
  if (ref) title = title.replace(new RegExp(ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '')
  title = title.replace(/\(\s*\d{1,2}\s+[A-Za-zÀ-ÿ.]+\s+\d{4}\s*\)/g, '')
  return title.replace(/^[\s–—:|.-]+|[\s–—:|.-]+$/g, '').replace(/\s{2,}/g, ' ').trim() || item.title
}

function splitShortDate(label: string) {
  const parts = label.trim().split(/\s+/)
  return { day: parts[0] ?? '', rest: parts.slice(1).join(' ') }
}

export function CsirtNewsMore({
  items,
  topics,
}: {
  items: readonly CsirtNewsItem[]
  topics?: readonly SiteNewsTopic[]
}) {
  const topicList = useMemo(() => resolveNewsTopics(topics), [topics])
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const [page, setPage] = useState(0)
  const safePage = Math.min(page, pageCount - 1)
  const from = safePage * PAGE_SIZE
  const rows = items.slice(from, from + PAGE_SIZE)
  const rangeEnd = from + rows.length

  if (items.length === 0) return null

  return (
    <section className="csirt-news-more" aria-labelledby="csirt-news-more-title">
      <header className="csirt-news-more__head">
        <div>
          <p className="csirt-news-more__kicker">À lire aussi</p>
          <h2 id="csirt-news-more-title">Autres actualités</h2>
        </div>
        <p className="csirt-news-more__count">
          <b>{items.length}</b>
          publication{items.length > 1 ? 's' : ''}
        </p>
      </header>

      <ul className="csirt-news-more__list">
        {rows.map((row, index) => {
          const categoryId = normalizeSiteNewsCategory(row.category, topicList)
          const ioc = categoryId === 'IOC'
          const alert = !ioc && isAlertNewsCategory(row.category, topicList)
          const ref = extractCertReference(row)
          const heading = relatedTitle(row, ref)
          const stamp = splitShortDate(row.dateShort || row.dateLabel)
          const position = from + index + 1
          return (
            <li key={row.id} aria-posinset={position} aria-setsize={items.length}>
              <Link
                href={row.href}
                className={`csirt-news-more__row${ioc ? ' is-ioc' : ''}${alert ? ' is-alert' : ''}`}
              >
                <span className="csirt-news-more__index" aria-hidden>
                  {String(position).padStart(2, '0')}
                </span>
                <time dateTime={row.date}>
                  <b>{stamp.day}</b>
                  <span>{stamp.rest}</span>
                </time>
                <span className="csirt-news-more__copy">
                  <span className="csirt-news-more__meta">
                    <em>{newsCategoryLabel(row.category, topicList)}</em>
                    {ref ? <b>{ref}</b> : null}
                  </span>
                  <strong>{heading}</strong>
                </span>
                <ArrowRight className="csirt-news-more__go" size={16} strokeWidth={2.2} aria-hidden />
              </Link>
            </li>
          )
        })}
      </ul>

      {pageCount > 1 ? (
        <nav className="csirt-news-more__pager" aria-label="Pagination des autres actualités">
          <p>
            {from + 1}–{rangeEnd} sur {items.length}
          </p>
          <div className="csirt-news-more__pager-nav">
            <button
              type="button"
              aria-label="Page précédente"
              disabled={safePage === 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              <ChevronLeft size={16} strokeWidth={2.2} />
            </button>
            {Array.from({ length: pageCount }, (_, index) => (
              <button
                key={index}
                type="button"
                className={index === safePage ? 'is-current' : undefined}
                aria-current={index === safePage ? 'page' : undefined}
                aria-label={`Page ${index + 1}`}
                onClick={() => setPage(index)}
              >
                {index + 1}
              </button>
            ))}
            <button
              type="button"
              aria-label="Page suivante"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
            >
              <ChevronRight size={16} strokeWidth={2.2} />
            </button>
          </div>
        </nav>
      ) : null}
    </section>
  )
}
