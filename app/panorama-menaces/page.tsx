import { CsirtSimplePage } from '@/components/csirt/csirt-simple-page'

export const metadata = { title: 'Panorama des menaces — CSIRT-ARPT' }

export default function Page() {
  return (
    <CsirtSimplePage
      path="/panorama-menaces"
      title="Panorama des menaces"
      lead="Cette rubrique accueillera le panorama des menaces dès la publication des alertes en v3.0."
    />
  )
}
