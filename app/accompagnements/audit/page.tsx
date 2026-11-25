import { CsirtSimplePage } from '@/components/csirt/csirt-simple-page'

export const metadata = { title: 'Audit et diagnostic — CSIRT-ARPT' }

export default function Page() {
  return (
    <CsirtSimplePage
      path="/accompagnements/audit"
      title="Audit et diagnostic"
      lead="État des lieux de la posture de sécurité et priorisation des actions de remédiation."
    >
      <p>
        Le CSIRT-ARPT oriente les organisations vers un diagnostic proportionné au risque, en
        complément du canal officiel de signalement.
      </p>
    </CsirtSimplePage>
  )
}
