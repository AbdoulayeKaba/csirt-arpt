import { CsirtSimplePage } from '@/components/csirt/csirt-simple-page'

export const metadata = { title: 'Lois et décrets — CSIRT-ARPT' }

export default function Page() {
  return (
    <CsirtSimplePage
      path="/reglementations/lois-decrets"
      title="Lois et décrets"
      lead="Textes nationaux encadrant la sécurité des systèmes d’information et des réseaux régulés."
    >
      <p>
        Cette rubrique rassemble progressivement les lois, décrets et arrêtés applicables, dont les
        dispositions du RGSSI 2025.
      </p>
    </CsirtSimplePage>
  )
}
