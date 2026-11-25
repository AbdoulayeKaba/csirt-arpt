import { CsirtInnerPage } from '@/components/csirt/csirt-inner-page'
import { findSitePage } from '@/lib/site/merge'
import { resolvePublicNews } from '@/lib/site/news-scrape'
import { getSiteContent } from '@/lib/site/store'
import { publishableVideos } from '@/lib/csirt/home-content'

type Props = {
  searchParams: Promise<{ q?: string }>
}

export const metadata = { title: 'Recherche — CSIRT-ARPT' }

export default async function RecherchePage({ searchParams }: Props) {
  const { q = '' } = await searchParams
  const needle = q.trim().toLowerCase()
  const siteContent = await getSiteContent()
  const page = findSitePage(siteContent, '/recherche')
  const allNews = resolvePublicNews(siteContent)
  const news = needle
    ? allNews.filter((item) => `${item.title} ${item.excerpt}`.toLowerCase().includes(needle))
    : allNews
  const videos = needle
    ? publishableVideos(siteContent.videos).filter((item) =>
        item.title.toLowerCase().includes(needle)
      )
    : publishableVideos(siteContent.videos)

  return (
    <CsirtInnerPage>
      <h1>{page?.title || 'Recherche'}</h1>
      <p className="csirt-lead">
        {needle ? `Résultats pour « ${q} »` : page?.lead || 'Saisissez un mot-clé depuis la page d’accueil.'}
      </p>
      <h2>Actualités</h2>
      {news.length === 0 ? (
        <p>Aucun résultat dans les actualités.</p>
      ) : (
        <ul>
          {news.map((item) => (
            <li key={item.id}>
              <a href={item.externalHref || item.href}>{item.title}</a>
            </li>
          ))}
        </ul>
      )}
      <h2>Médiathèque</h2>
      {videos.length === 0 ? (
        <p>Aucun résultat dans la médiathèque.</p>
      ) : (
        <ul>
          {videos.map((item) => (
            <li key={item.id}>
              <a href={item.href}>{item.title}</a>
            </li>
          ))}
        </ul>
      )}
    </CsirtInnerPage>
  )
}
