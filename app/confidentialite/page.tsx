import { CsirtConfidentialitePage } from '@/components/csirt/csirt-confidentialite'
import { CsirtInnerPage } from '@/components/csirt/csirt-inner-page'
import { findSitePage } from '@/lib/site/merge'
import {
  DEFAULT_PRIVACY_CONTENT,
  sanitizePrivacyContent,
} from '@/lib/site/legal-defaults'
import { getSiteContent } from '@/lib/site/store'

export async function generateMetadata() {
  const page = findSitePage(await getSiteContent(), '/confidentialite')
  return {
    title: `${page?.title || 'Politique de confidentialité'} — CSIRT-ARPT`,
    description: page?.lead || undefined,
  }
}

export default async function Page() {
  const sitePage = findSitePage(await getSiteContent(), '/confidentialite')
  const content = sanitizePrivacyContent(
    sitePage?.extensions?.privacy,
    DEFAULT_PRIVACY_CONTENT
  )

  return (
    <CsirtInnerPage variant="full">
      <div className="site-article-shell">
        <div className="site-article-band" aria-hidden />
        <div className="site-article csirt-privacy-shell">
          <CsirtConfidentialitePage
            title={sitePage?.title}
            lead={sitePage?.lead}
            content={content}
          />
        </div>
      </div>
    </CsirtInnerPage>
  )
}
