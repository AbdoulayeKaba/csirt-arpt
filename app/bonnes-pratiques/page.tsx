import { CsirtInnerPage } from '@/components/csirt/csirt-inner-page'
import { CsirtPracticesPage } from '@/components/csirt/csirt-practices'
import { CSIRT_BRAND } from '@/lib/csirt/brand'

export const metadata = {
  title: `Bonnes pratiques — ${CSIRT_BRAND.name}`,
  description:
    'Recommandations du CSIRT-ARPT pour prévenir les risques, réagir en cas d’incident et renforcer la sécurité numérique.',
}

export default function BonnesPratiquesPage() {
  return (
    <CsirtInnerPage variant="full">
      <CsirtPracticesPage />
    </CsirtInnerPage>
  )
}
