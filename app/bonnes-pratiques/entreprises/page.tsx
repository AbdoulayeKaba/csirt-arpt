import { CsirtSimplePage } from '@/components/csirt/csirt-simple-page'

export const metadata = { title: 'Bonnes pratiques — Entreprises' }

export default function Page() {
  return (
    <CsirtSimplePage
      path="/bonnes-pratiques/entreprises"
      title="Pour les entreprises"
      lead="Mesures organisationnelles et techniques pour réduire le risque cyber."
    >
      <ul>
        <li>Sauvegarder les données critiques et tester la restauration</li>
        <li>Limiter les droits d’administration et segmenter les réseaux</li>
        <li>Préparer une procédure interne de signalement vers le CSIRT-ARPT</li>
      </ul>
    </CsirtSimplePage>
  )
}
