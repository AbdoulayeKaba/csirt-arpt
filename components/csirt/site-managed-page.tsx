import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { FileText, ImageIcon } from 'lucide-react'
import { SitePageDocuments } from '@/components/csirt/site-page-documents'
import { SitePageResourceCatalog } from '@/components/csirt/site-page-resources'
import { SitePageVideoCatalog } from '@/components/csirt/site-page-videos'
import { CsirtInnerPage } from '@/components/csirt/csirt-inner-page'
import { publishableVideos } from '@/lib/csirt/home-content'
import { findSitePage } from '@/lib/site/merge'
import { SiteRichText } from '@/lib/site/rich-text'
import { getSiteContent } from '@/lib/site/store'

export async function sitePageMetadata(path: string, fallbackTitle: string): Promise<Metadata> {
  const page = findSitePage(await getSiteContent(), path)
  const title = page?.title || fallbackTitle
  return {
    title: `${title} — CSIRT-ARPT`,
    description: page?.lead || undefined,
  }
}

export async function SiteManagedPage({
  path,
  children,
}: {
  path: string
  children?: ReactNode
}) {
  const site = await getSiteContent()
  const page = findSitePage(site, path)
  const title = page?.title || 'CSIRT-ARPT'
  const lead = page?.lead || ''
  const layout = page?.extensions?.layout ?? 'article'

  if (layout === 'videos') {
    const selected = new Set(page?.extensions?.videoIds ?? [])
    const videos = publishableVideos(site.videos).filter(
      (video) => selected.size === 0 || selected.has(video.id)
    )
    return (
      <CsirtInnerPage variant="full" showNewsletterCta={false}>
        <SitePageVideoCatalog
          title={title}
          lead={lead}
          videos={selected.size === 0 ? [] : videos}
        />
      </CsirtInnerPage>
    )
  }

  if (layout === 'resources') {
    return (
      <CsirtInnerPage variant="full" showNewsletterCta={false}>
        <SitePageResourceCatalog title={title} lead={lead} documents={page?.documents ?? []} />
      </CsirtInnerPage>
    )
  }

  const links = page?.extraLinks ?? []
  const documents =
    page?.extensions?.documents && page.documents?.length ? page.documents : []
  const hasBody = Boolean(page?.body?.trim())
  const hasImage = Boolean(page?.featuredImage)

  return (
    <CsirtInnerPage variant="full">
      <div className="site-article-shell">
        <div className="site-article-band" aria-hidden />
        <article className="site-article">
          <header className="site-article__header">
            <div className="site-article__meta">
              {documents.length ? (
                <span className="site-article__chip">
                  <FileText className="h-3 w-3" aria-hidden />
                  {documents.length} PDF
                </span>
              ) : null}
              {hasImage ? (
                <span className="site-article__chip is-muted">
                  <ImageIcon className="h-3 w-3" aria-hidden />
                  Visuel
                </span>
              ) : null}
            </div>
            <h1>{title}</h1>
            {lead ? <p className="site-article__lead">{lead}</p> : null}
          </header>

          {hasImage ? (
            <figure className="site-featured-image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={page!.featuredImage!} alt="" />
            </figure>
          ) : null}

          {hasBody ? (
            <div className="site-article__body">
              <SiteRichText value={page!.body} />
            </div>
          ) : null}

          <SitePageDocuments documents={documents} />

          {links.length ? (
            <nav className="site-article__links" aria-label="Liens associés">
              <h2>Voir aussi</h2>
              <ul>
                {links.map((item) => (
                  <li key={`${item.href}-${item.label}`}>
                    <Link href={item.href}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          {children}
        </article>
      </div>
    </CsirtInnerPage>
  )
}
