import { CsirtSimplePage } from '@/components/csirt/csirt-simple-page'
import { CSIRT_BRAND } from '@/lib/csirt/brand'

export const metadata = { title: 'Abonnement aux alertes — CSIRT-ARPT' }

export default function Page() {
  return (
    <CsirtSimplePage
      path="/abonnement"
      title="Abonnement"
      lead="Recevez les alertes et publications officielles du CSIRT-ARPT."
    >
      <p>
        Pour vous inscrire à la liste de diffusion, écrivez à{' '}
        <a href={CSIRT_BRAND.mailto}>{CSIRT_BRAND.email}</a> en précisant votre organisation et
        votre fonction.
      </p>
    </CsirtSimplePage>
  )
}
