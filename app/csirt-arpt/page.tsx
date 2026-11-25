import { CsirtAboutPage } from '@/components/csirt/csirt-about'
import { CsirtInnerPage } from '@/components/csirt/csirt-inner-page'
import { sanitizeAboutContent } from '@/lib/site/about-defaults'
import { CSIRT_BRAND } from '@/lib/csirt/brand'
import { findSitePage } from '@/lib/site/merge'
import { getSiteContent } from '@/lib/site/store'

export async function generateMetadata() {
  const page = findSitePage(await getSiteContent(), '/csirt-arpt')
  return {
    title: `${page?.title || 'À propos'} — ${CSIRT_BRAND.name}`,
    description:
      page?.lead ||
      `Le ${CSIRT_BRAND.name} est le point de contact national pour la détection, la coordination et la réponse aux incidents de cybersécurité.`,
  }
}

export default async function CsirtPresentationPage() {
  const sitePage = findSitePage(await getSiteContent(), '/csirt-arpt')
  const content = sanitizeAboutContent(sitePage?.extensions?.about)

  return (
    <CsirtInnerPage variant="full">
      <CsirtAboutPage content={content} />
    </CsirtInnerPage>
  )
}
