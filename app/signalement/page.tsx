import { CsirtInnerPage } from '@/components/csirt/csirt-inner-page'
import { CsirtSignalementGate } from '@/components/csirt/csirt-signalement-gate'
import { getSiteContent } from '@/lib/site/store'
import '@/components/csirt/csirt-signalement.css'

export const metadata = {
  title: 'Signaler un incident — CSIRT-ARPT',
  description: 'Signalement 24h/24 et 7j/7 auprès du CSIRT-ARPT',
}

type Props = {
  searchParams: Promise<{ invitation?: string }>
}

export default async function SignalementPage({ searchParams }: Props) {
  const params = await searchParams
  const invitation = params.invitation?.trim() || undefined
  const site = await getSiteContent()

  return (
    <CsirtInnerPage variant="full" showNewsletterCta={false}>
      <CsirtSignalementGate
        invitationToken={invitation}
        guideVideoUrl={site.home.signalementGuideVideoUrl}
      />
    </CsirtInnerPage>
  )
}
