import { CsirtSimplePage } from '@/components/csirt/csirt-simple-page'

export const metadata = { title: 'Espace de confiance — CSIRT-ARPT' }

export default function Page() {
  return (
    <CsirtSimplePage
      path="/espace-confiance"
      title="Espace de confiance"
      lead="Accès dédié aux partenaires, experts et responsables de la sécurité des systèmes d’information."
    />
  )
}
