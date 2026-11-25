import { CsirtSimplePage } from '@/components/csirt/csirt-simple-page'

export const metadata = { title: 'Conseil et expertise — CSIRT-ARPT' }

export default function Page() {
  return (
    <CsirtSimplePage
      path="/accompagnements/conseil"
      title="Conseil et expertise"
      lead="Appui d’experts pour la gouvernance, la réponse aux incidents et la conformité."
    >
      <p>
        Cet accompagnement s’adresse aux opérateurs, FAI et administrations qui souhaitent
        renforcer leur dispositif de cybersécurité.
      </p>
    </CsirtSimplePage>
  )
}
