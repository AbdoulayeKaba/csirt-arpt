import { CsirtSimplePage } from '@/components/csirt/csirt-simple-page'

export const metadata = { title: 'Communiqués — CSIRT-ARPT' }

export default function Page() {
  return (
    <CsirtSimplePage
      path="/publications/communiques"
      title="Communiqués"
      lead="Communiqués officiels et notes d’information à destination du public et des acteurs du secteur."
    >
      <p>
        Les communiqués validés par le CSIRT-ARPT seront publiés ici après chaque recette
        éditoriale.
      </p>
    </CsirtSimplePage>
  )
}
