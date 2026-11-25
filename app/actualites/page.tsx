import { CsirtNewsDesk } from '@/components/csirt/csirt-news-desk'
import { CsirtInnerPage } from '@/components/csirt/csirt-inner-page'
import { resolveNewsTopics } from '@/lib/site/news-sources'
import { getPublicSiteSnapshot } from '@/lib/site/public-snapshot'
import '@/components/csirt/csirt-home.css'

export const metadata = { title: 'Actualités et alertes — CSIRT-ARPT' }

type Props = {
  searchParams: Promise<{ categorie?: string }>
}

export default async function ActualitesPage({ searchParams }: Props) {
  const { categorie } = await searchParams
  const site = await getPublicSiteSnapshot()
  const topics = resolveNewsTopics(site.newsTopics)
  const allItems = site.newsCards

  return (
    <CsirtInnerPage variant="full" showNewsletterCta={false}>
      <CsirtNewsDesk
        topics={topics}
        initialCategory={categorie?.trim() || ''}
        items={allItems.map((item) => ({
          id: item.id,
          date: item.date,
          title: item.title,
          excerpt: item.excerpt,
          href: item.href,
          category: item.category,
          author: item.author,
        }))}
      />
    </CsirtInnerPage>
  )
}
