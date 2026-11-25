import { unstable_cache } from 'next/cache'
import { cache } from 'react'
import { buildPublicationsMenu } from '@/lib/csirt/publications-menu'
import type { CsirtNewsItem } from '@/lib/csirt/home-content'
import { menusToNavItems } from '@/lib/site/menus'
import { normalizeSiteNewsCategory, resolveNewsTopics } from '@/lib/site/news-sources'
import { resolvePublicNews } from '@/lib/site/news-scrape'
import { readMergedSiteContent } from '@/lib/site/store'
import type { SiteContent } from '@/lib/site/types'

export type PublicSiteSnapshot = {
  home: SiteContent['home']
  newsTopics: SiteContent['newsTopics']
  videos: SiteContent['videos']
  social: SiteContent['social']
  ticker: SiteContent['ticker']
  footer: SiteContent['footer']
  nav: ReturnType<typeof menusToNavItems>
  alertCount: number
  publications: ReturnType<typeof buildPublicationsMenu>
  newsCards: CsirtNewsItem[]
}

function withoutArticleBody(item: CsirtNewsItem): CsirtNewsItem {
  const card = { ...item }
  delete card.bodyHtml
  return card
}

async function buildPublicSiteSnapshot(): Promise<PublicSiteSnapshot> {
  const site = await readMergedSiteContent()
  const topics = resolveNewsTopics(site.newsTopics)
  const collected = site.newsCollected ?? []
  const published = collected.filter((item) => item.enabled && item.archived !== true)
  const pool =
    published.length > 0
      ? published
      : (site.news ?? []).filter((item) => item.archived !== true)
  const alertCount = pool.filter(
    (item) => normalizeSiteNewsCategory(item.category, topics) === 'ALERTES_SECURITE'
  ).length

  return {
    home: site.home,
    newsTopics: site.newsTopics,
    videos: site.videos,
    social: site.social,
    ticker: site.ticker,
    footer: site.footer,
    nav: menusToNavItems(site.menus),
    alertCount,
    publications: buildPublicationsMenu(pool, topics, site.pages),
    newsCards: resolvePublicNews(site).map(withoutArticleBody),
  }
}

const buildPublicSiteSnapshotCached = unstable_cache(
  buildPublicSiteSnapshot,
  ['public-site-snapshot'],
  { revalidate: 120, tags: ['site-content'] }
)

/** Vue publique légère, partagée entre les pages. Un clic ne reconstruit pas le site. */
export const getPublicSiteSnapshot = cache(() => buildPublicSiteSnapshotCached())
