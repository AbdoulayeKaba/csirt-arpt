import { CsirtInnerPage } from '@/components/csirt/csirt-inner-page'
import { CsirtMentionsLegalesPage } from '@/components/csirt/csirt-mentions-legales'
import { findSitePage } from '@/lib/site/merge'
import {
  DEFAULT_MENTIONS_CONTENT,
  sanitizeMentionsContent,
} from '@/lib/site/legal-defaults'
import { getSiteContent } from '@/lib/site/store'

export async function generateMetadata() {
  const page = findSitePage(await getSiteContent(), '/mentions-legales')
  return {
    title: `${page?.title || 'Mentions légales'} — CSIRT-ARPT`,
    description: page?.lead || undefined,
  }
}

export default async function Page() {
  const sitePage = findSitePage(await getSiteContent(), '/mentions-legales')
  const content = sanitizeMentionsContent(
    sitePage?.extensions?.mentions,
    DEFAULT_MENTIONS_CONTENT
  )

  return (
    <CsirtInnerPage variant="full">
      <div className="site-article-shell">
        <div className="site-article-band" aria-hidden />
        <div className="site-article csirt-legal-shell">
          <CsirtMentionsLegalesPage
            title={sitePage?.title}
            lead={sitePage?.lead}
            content={content}
          />
        </div>
      </div>
    </CsirtInnerPage>
  )
}
