import { CsirtInnerPage } from '@/components/csirt/csirt-inner-page'
import { CsirtSitemap } from '@/components/csirt/csirt-sitemap'
import { findSitePage } from '@/lib/site/merge'
import { DEFAULT_SITEMAP_CONTENT, sanitizeSitemapContent } from '@/lib/site/sitemap-defaults'
import { getSiteContent } from '@/lib/site/store'

export async function generateMetadata() {
  const page = findSitePage(await getSiteContent(), '/plan-du-site')
  return {
    title: `${page?.title || 'Plan du site'} — CSIRT-ARPT`,
    description:
      page?.lead ||
      'Cartographie officielle des pages publiques du CSIRT-ARPT : institution, signalement, réglementations, publications et informations légales.',
  }
}

export default async function Page() {
  const sitePage = findSitePage(await getSiteContent(), '/plan-du-site')
  const sitemap = sanitizeSitemapContent(
    sitePage?.extensions?.sitemap,
    DEFAULT_SITEMAP_CONTENT
  )

  return (
    <CsirtInnerPage variant="full">
      <div className="site-article-shell">
        <div className="site-article-band" aria-hidden />
        <div className="site-article csirt-sitemap-shell">
          <CsirtSitemap
            title={sitePage?.title}
            lead={sitePage?.lead}
            content={sitemap}
          />
        </div>
      </div>
    </CsirtInnerPage>
  )
}
