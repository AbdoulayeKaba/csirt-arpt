import type { ReactNode } from 'react'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { SitePageDocuments } from '@/components/csirt/site-page-documents'
import { CsirtInnerPage } from '@/components/csirt/csirt-inner-page'
import { findSitePage } from '@/lib/site/merge'
import { SiteRichText } from '@/lib/site/rich-text'
import { getSiteContent } from '@/lib/site/store'

export async function CsirtSimplePage({
  path,
  title,
  lead,
  children,
}: {
  path?: string
  title: string
  lead: string
  children?: ReactNode
}) {
  const sitePage = path ? findSitePage(await getSiteContent(), path) : undefined
  const resolvedTitle = sitePage?.title || title
  const resolvedLead = sitePage?.lead || lead
  const links = sitePage?.extraLinks ?? []
  const documents =
    sitePage?.extensions?.documents && sitePage.documents?.length ? sitePage.documents : []

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
            </div>
            <h1>{resolvedTitle}</h1>
            {resolvedLead ? <p className="site-article__lead">{resolvedLead}</p> : null}
          </header>

          {sitePage?.featuredImage ? (
            <figure className="site-featured-image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sitePage.featuredImage} alt="" />
            </figure>
          ) : null}

          {sitePage?.body ? (
            <div className="site-article__body">
              <SiteRichText value={sitePage.body} />
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
