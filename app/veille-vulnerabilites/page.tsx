import { CsirtSimplePage } from '@/components/csirt/csirt-simple-page'

export const metadata = { title: 'Veille de vulnérabilités — CSIRT-ARPT' }

export default function Page() {
  return (
    <CsirtSimplePage
      path="/veille-vulnerabilites"
      title="Veille de vulnérabilités"
      lead="Suivi des vulnérabilités critiques et diffusion d’alertes aux opérateurs, FAI et administrations."
    >
      <p>
        Le CSIRT-ARPT consolide les avis de sécurité pertinents pour le secteur des postes et
        télécommunications et oriente les mesures de remédiation.
      </p>
    </CsirtSimplePage>
  )
}
