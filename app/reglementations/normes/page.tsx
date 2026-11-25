import { CsirtSimplePage } from '@/components/csirt/csirt-simple-page'

export const metadata = { title: 'Normes et standards — CSIRT-ARPT' }

export default function Page() {
  return (
    <CsirtSimplePage
      path="/reglementations/normes"
      title="Normes et standards"
      lead="Normes techniques et bonnes pratiques de conformité pour le secteur des postes et télécommunications."
    >
      <p>
        Les références normatives utiles aux opérateurs et administrations seront publiées ici au
        fil des recettes du site.
      </p>
    </CsirtSimplePage>
  )
}
