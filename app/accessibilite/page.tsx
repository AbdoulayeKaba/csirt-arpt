import { CsirtAccessibilitePage } from '@/components/csirt/csirt-accessibilite'
import { CsirtInnerPage } from '@/components/csirt/csirt-inner-page'
import { findSitePage } from '@/lib/site/merge'
import {
  DEFAULT_A11Y_CONTENT,
  sanitizeA11yContent,
} from '@/lib/site/legal-defaults'
import { getSiteContent } from '@/lib/site/store'

export async function generateMetadata() {
  const page = findSitePage(await getSiteContent(), '/accessibilite')
  return {
    title: `${page?.title || 'Accessibilité'} — CSIRT-ARPT`,
    description: page?.lead || undefined,
  }
}

export default async function Page() {
  const sitePage = findSitePage(await getSiteContent(), '/accessibilite')
  const content = sanitizeA11yContent(
    sitePage?.extensions?.a11y,
    DEFAULT_A11Y_CONTENT
  )

  return (
    <CsirtInnerPage variant="full">
      <div className="site-article-shell">
        <div className="site-article-band" aria-hidden />
        <div className="site-article csirt-a11y-shell">
          <CsirtAccessibilitePage
            title={sitePage?.title}
            lead={sitePage?.lead}
            content={content}
          />
        </div>
      </div>
    </CsirtInnerPage>
  )
}
