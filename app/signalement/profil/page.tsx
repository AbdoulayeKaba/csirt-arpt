import { CsirtInnerPage } from '@/components/csirt/csirt-inner-page'
import { CsirtCorrespondentProfile } from '@/components/csirt/csirt-correspondent-profile'

export const metadata = {
  title: 'Mon profil — CSIRT-ARPT',
  description: 'Profil du correspondant : informations, mot de passe et authentification à deux facteurs',
}

export default function CorrespondentProfilePage() {
  return (
    <CsirtInnerPage variant="full" showNewsletterCta={false}>
      <CsirtCorrespondentProfile />
    </CsirtInnerPage>
  )
}
