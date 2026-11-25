import { CsirtSimplePage } from '@/components/csirt/csirt-simple-page'

export const metadata = { title: 'Historique — CSIRT-ARPT' }

export default function Page() {
  return (
    <CsirtSimplePage
      path="/historique"
      title="Historique"
      lead="Le CSIRT-ARPT est mis en place progressivement pour assurer une présence officielle de réponse aux incidents."
    />
  )
}
