import { Suspense } from 'react'
import { CsirtSimplePage } from '@/components/csirt/csirt-simple-page'
import { NewsletterUnsubscribeClient } from '@/components/csirt/newsletter-unsubscribe-client'

export const metadata = { title: 'Désabonnement — CSIRT-ARPT' }

export default function Page() {
  return (
    <CsirtSimplePage
      path="/abonnement/desinscription"
      title="Désabonnement"
      lead="Arrêtez de recevoir les alertes et publications officielles du CSIRT-ARPT."
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">Chargement…</p>}>
        <NewsletterUnsubscribeClient />
      </Suspense>
    </CsirtSimplePage>
  )
}
