import { CsirtSimplePage } from '@/components/csirt/csirt-simple-page'

export const metadata = { title: 'Assistance technique — CSIRT-ARPT' }

export default function Page() {
  return (
    <CsirtSimplePage
      path="/accompagnements/assistance"
      title="Assistance technique"
      lead="Soutien opérationnel pendant et après un incident de cybersécurité."
    >
      <p>
        En cas d’incident, privilégiez d’abord le signalement officiel. L’assistance technique
        complète la qualification et la coordination de la réponse.
      </p>
    </CsirtSimplePage>
  )
}
