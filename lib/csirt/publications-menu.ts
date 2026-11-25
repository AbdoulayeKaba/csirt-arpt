import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { decodeHtmlEntities } from '@/lib/site/news-text'
import { normalizeSiteNewsCategory, type SiteNewsTopic } from '@/lib/site/news-sources'
import type { SitePage, SitePageDocument } from '@/lib/site/types'

type PoolItem = {
  id: string
  title: string
  date: string
  category: string
  href?: string
}

export type CsirtPublicationsMenuData = {
  actualites: number
  rapports: number
  guides: number
  communiques: number
  alerts: number
  themes: {
    menaces: number
    avis: number
    ioc: number
    recommandations: number
    reglementation: number
  }
  latest: { title: string; date: string; iso: string; href: string }[]
}

export const EMPTY_PUBLICATIONS_MENU: CsirtPublicationsMenuData = {
  actualites: 0,
  rapports: 0,
  guides: 0,
  communiques: 0,
  alerts: 0,
  themes: { menaces: 0, avis: 0, ioc: 0, recommandations: 0, reglementation: 0 },
  latest: [],
}

function countTopic(pool: readonly PoolItem[], topics: readonly SiteNewsTopic[], id: string) {
  return pool.filter((item) => normalizeSiteNewsCategory(item.category, topics) === id).length
}

function publishedDocs(pages: readonly SitePage[]) {
  const docs: { page: SitePage; doc: SitePageDocument }[] = []
  for (const page of pages) {
    if (!page.published || page.archived) continue
    if (!page.extensions?.documents) continue
    for (const doc of page.documents ?? []) {
      if (!doc.url?.trim()) continue
      docs.push({ page, doc })
    }
  }
  return docs
}

function shortDate(iso: string) {
  const raw = iso.trim().slice(0, 10)
  const date = new Date(`${raw}T12:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return format(date, 'd MMM yyyy', { locale: fr })
}

export function buildPublicationsMenu(
  pool: readonly PoolItem[],
  topics: readonly SiteNewsTopic[],
  pages: readonly SitePage[],
): CsirtPublicationsMenuData {
  const docs = publishedDocs(pages)
  const countDocs = (category: SitePageDocument['category']) =>
    docs.filter((entry) => entry.doc.category === category).length

  const latest = [...pool]
    .sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0))
    .slice(0, 4)
    .map((item) => ({
      title: decodeHtmlEntities(item.title || '').replace(/\s+/g, ' ').trim(),
      date: shortDate(item.date),
      iso: item.date.trim().slice(0, 10),
      href: item.href || `/actualites/${item.id}`,
    }))

  return {
    actualites: pool.length,
    rapports: countDocs('rapports'),
    guides: countDocs('guides'),
    communiques: docs.filter(
      ({ page, doc }) =>
        doc.category === 'notes' || /communiqu/i.test(`${page.path} ${page.title} ${doc.title}`),
    ).length,
    alerts: countTopic(pool, topics, 'ALERTES_SECURITE'),
    themes: {
      menaces: countTopic(pool, topics, 'MENACES_INCIDENTS'),
      avis: countTopic(pool, topics, 'AVIS_SECURITE'),
      ioc: countTopic(pool, topics, 'IOC'),
      recommandations: countTopic(pool, topics, 'DURCISSEMENT'),
      reglementation: countDocs('reglementation'),
    },
    latest,
  }
}
