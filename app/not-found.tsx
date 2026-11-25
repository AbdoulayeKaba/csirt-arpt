import type { Metadata } from 'next'
import { Syne } from 'next/font/google'
import { CsirtNotFound } from '@/components/csirt/csirt-not-found'
import { CsirtPublicShell } from '@/components/csirt/csirt-public-shell'
import { getLayoutPlatformBranding } from '@/lib/services/platform-settings-cache'

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Page introuvable — CSIRT-ARPT',
  description:
    'La ressource demandée est introuvable sur le portail CSIRT-ARPT. Retournez à l’accueil ou consultez les actualités.',
  robots: { index: false, follow: true },
}

export default async function NotFound() {
  const branding = await getLayoutPlatformBranding()

  return (
    <div className={syne.variable}>
      <CsirtPublicShell
        institutionLogoUrl={branding.institutionLogoUrl}
        showFloating={false}
        showFooter={false}
      >
        <CsirtNotFound institutionLogoUrl={branding.institutionLogoUrl} />
      </CsirtPublicShell>
    </div>
  )
}
