import { CsirtInnerPage } from '@/components/csirt/csirt-inner-page'
import { CsirtMediaLibrary } from '@/components/csirt/csirt-media-library'
import { findSitePage } from '@/lib/site/merge'
import { getSiteContent } from '@/lib/site/store'

export const metadata = { title: 'Médiathèque — CSIRT-ARPT' }

export default async function Page() {
  const siteContent = await getSiteContent()
  const page = findSitePage(siteContent, '/mediatheque')
  const storedLead = page?.lead?.trim()
  const lead =
    !storedLead || storedLead === 'Vidéos, reportages et interventions du CSIRT-ARPT.'
      ? 'Vidéos, reportages et interventions du CSIRT-ARPT pour une meilleure culture de la cybersécurité.'
      : storedLead

  return (
    <CsirtInnerPage variant="full">
      <CsirtMediaLibrary
        videos={siteContent.videos}
        title={page?.title || 'Médiathèque'}
        lead={lead}
        youtubeUrl={siteContent.home.mediaYoutubeUrl}
      />
    </CsirtInnerPage>
  )
}
