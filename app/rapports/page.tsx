import { CsirtSimplePage } from '@/components/csirt/csirt-simple-page'

export const metadata = { title: 'Rapports — CSIRT-ARPT' }

export default function Page() {
  return (
    <CsirtSimplePage
      path="/rapports"
      title="Rapports"
      lead="Les rapports validés par le CSIRT-ARPT seront publiés ici après recette éditoriale."
    />
  )
}
