import type { ReactNode } from 'react'
import { CsirtPublicShellClient } from '@/components/csirt/csirt-public-shell-client'
import { getPublicSiteSnapshot } from '@/lib/site/public-snapshot'
import type { PlatformPublicContact } from '@/lib/dg/platform-branding'
import { getLayoutPlatformBranding } from '@/lib/services/platform-settings-cache'

type Props = {
  institutionLogoUrl?: string
  contact?: PlatformPublicContact
  children: ReactNode
  showFloating?: boolean
  showFooter?: boolean
  showNewsletterCta?: boolean
}

export async function CsirtPublicShell({
  institutionLogoUrl,
  contact,
  children,
  showFloating = true,
  showFooter = true,
  showNewsletterCta = true,
}: Props) {
  const [site, branding] = await Promise.all([
    getPublicSiteSnapshot(),
    getLayoutPlatformBranding(),
  ])
  const { nav, alertCount, publications } = site

  return (
    <CsirtPublicShellClient
      institutionLogoUrl={institutionLogoUrl ?? branding.institutionLogoUrl}
      certLogoUrl={branding.certLogoUrl}
      contact={contact ?? branding.contact}
      nav={nav}
      alertCount={alertCount}
      publications={publications}
      ticker={site.ticker}
      footer={site.footer}
      social={site.social}
      showFloating={showFloating}
      showFooter={showFooter}
      showNewsletterCta={showNewsletterCta}
    >
      {children}
    </CsirtPublicShellClient>
  )
}
