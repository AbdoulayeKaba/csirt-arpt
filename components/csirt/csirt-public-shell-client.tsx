'use client'

import { useMemo, type ReactNode } from 'react'
import { CsirtFloatingActionsLazy } from '@/components/csirt/csirt-floating-actions-lazy'
import { CsirtHeader } from '@/components/csirt/csirt-header'
import { CsirtLocaleProvider, useCsirtLocale } from '@/components/csirt/csirt-locale-provider'
import { CsirtNewsletterScrollPopup } from '@/components/csirt/csirt-newsletter-scroll-popup'
import { CsirtSiteFooter } from '@/components/csirt/csirt-site-footer'
import { localizeNavItems, localizeTicker } from '@/lib/csirt/localize-nav'
import { localizeFooter } from '@/lib/csirt/localize-public'
import type { CsirtPublicationsMenuData } from '@/lib/csirt/publications-menu'
import type { CsirtNavItem } from '@/lib/csirt/nav'
import type { SiteFooter } from '@/lib/site/types'
import type { CsirtSocialPlatform } from '@/lib/csirt/home-content'
import type { PlatformPublicContact } from '@/lib/dg/platform-branding'
import '@/components/csirt/csirt-home.css'

type Props = {
  institutionLogoUrl?: string
  certLogoUrl?: string
  contact?: PlatformPublicContact
  nav: readonly CsirtNavItem[]
  alertCount?: number
  publications?: CsirtPublicationsMenuData
  ticker: readonly string[]
  footer: SiteFooter
  social: readonly CsirtSocialPlatform[]
  showFloating?: boolean
  showFooter?: boolean
  showNewsletterCta?: boolean
  children: ReactNode
}

export function CsirtPublicShellClient(props: Props) {
  return (
    <CsirtLocaleProvider>
      <CsirtPublicShellInner {...props} />
    </CsirtLocaleProvider>
  )
}

function CsirtPublicShellInner({
  institutionLogoUrl,
  certLogoUrl,
  contact,
  nav,
  alertCount = 0,
  publications,
  ticker,
  footer,
  social,
  showFloating = true,
  showFooter = true,
  showNewsletterCta = true,
  children,
}: Props) {
  const { language } = useCsirtLocale()

  const localizedNav = useMemo(() => localizeNavItems(nav, language), [nav, language])
  const localizedTicker = useMemo(() => localizeTicker(ticker, language), [ticker, language])
  const localizedFooter = useMemo(() => localizeFooter(footer, language), [footer, language])

  return (
    <div className="csirt-site">
      <CsirtHeader
        institutionLogoUrl={institutionLogoUrl}
        certLogoUrl={certLogoUrl}
        nav={localizedNav}
        alertCount={alertCount}
        publications={publications}
        ticker={localizedTicker}
      />
      <main id="contenu" className="csirt-main">
        {children}
      </main>
      {showFooter ? (
        <CsirtSiteFooter
          institutionLogoUrl={institutionLogoUrl}
          certLogoUrl={certLogoUrl}
          contact={contact}
          footer={localizedFooter}
          social={social}
          showNewsletterCta={showNewsletterCta}
        />
      ) : null}
      {showFloating ? <CsirtFloatingActionsLazy /> : null}
      <CsirtNewsletterScrollPopup />
    </div>
  )
}
