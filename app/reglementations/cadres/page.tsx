import { CsirtSimplePage } from '@/components/csirt/csirt-simple-page'

export const metadata = { title: 'Cadres de référence — CSIRT-ARPT' }

export default function Page() {
  return (
    <CsirtSimplePage
      path="/reglementations/cadres"
      title="Cadres de référence"
      lead="Alignement du CSIRT-ARPT sur les référentiels FIRST, CERT-FR, ENISA et le cadre national."
    >
      <p>
        Ces cadres guident la veille, le signalement, la qualification des incidents et la
        coopération avec les homologues.
      </p>
    </CsirtSimplePage>
  )
}
