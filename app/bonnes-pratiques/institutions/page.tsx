import { CsirtSimplePage } from '@/components/csirt/csirt-simple-page'

export const metadata = { title: 'Bonnes pratiques — Institutions' }

export default function Page() {
  return (
    <CsirtSimplePage
      path="/bonnes-pratiques/institutions"
      title="Pour les institutions"
      lead="Recommandations pour les administrations et opérateurs d’infrastructures essentielles."
    >
      <ul>
        <li>Désigner un interlocuteur RSSI et un canal de crise 24h/24</li>
        <li>Documenter les actifs critiques et les dépendances réseau</li>
        <li>Signaler sans délai tout incident susceptible d’impacter les services publics</li>
      </ul>
    </CsirtSimplePage>
  )
}
