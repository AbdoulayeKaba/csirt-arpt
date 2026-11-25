import { CsirtSimplePage } from '@/components/csirt/csirt-simple-page'

export const metadata = { title: 'Bonnes pratiques — Particuliers' }

export default function Page() {
  return (
    <CsirtSimplePage
      path="/bonnes-pratiques/particuliers"
      title="Pour les particuliers"
      lead="Gestes essentiels pour protéger vos comptes, appareils et données personnelles."
    >
      <ul>
        <li>Utiliser des mots de passe uniques et l’authentification à deux facteurs</li>
        <li>Méfier des messages demandant un code, un paiement ou une pièce d’identité</li>
        <li>Mettre à jour le système et les applications dès qu’un correctif est disponible</li>
      </ul>
    </CsirtSimplePage>
  )
}
