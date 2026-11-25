import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CsirtNewsDetail } from '@/components/csirt/csirt-news-detail'
import { findPublicNewsById, resolvePublicNews } from '@/lib/site/news-scrape'
import { normalizeSiteNewsCategory, resolveNewsTopics } from '@/lib/site/news-sources'
import { getSiteContent } from '@/lib/site/store'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const site = await getSiteContent()
  const item = findPublicNewsById(site, id)
  if (!item) {
    return { title: 'Actualité introuvable — CSIRT-ARPT' }
  }
  return {
    title: `${item.title} — CSIRT-ARPT`,
    description: item.excerpt || undefined,
  }
}

export default async function ActualiteDetailPage({ params }: Props) {
  const { id } = await params
  const site = await getSiteContent()
  const item = findPublicNewsById(site, id)
  if (!item) notFound()

  const topics = resolveNewsTopics(site.newsTopics)
  const category = normalizeSiteNewsCategory(item.category, topics)
  const others = resolvePublicNews(site)
    .filter(
      (row) =>
        row.id !== item.id && normalizeSiteNewsCategory(row.category, topics) === category
    )
    .slice(0, 4)
    .map((row) => ({
      id: row.id,
      href: row.href,
      title: row.title,
      date: row.date,
      dateLabel: row.dateLabel,
      dateShort: row.dateShort,
      category: row.category,
      excerpt: row.excerpt,
      image: row.image,
    }))

  return (
    <CsirtNewsDetail
      item={item}
      others={others}
      topics={site.newsTopics}
    />
  )
}
