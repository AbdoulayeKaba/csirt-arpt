'use client'

import { useMemo, type ReactNode } from 'react'
import { CsirtFloatingActionsLazy } from '@/components/csirt/csirt-floating-actions-lazy'
import { CsirtHeader } from '@/components/csirt/csirt-header'
import { CsirtLocaleProvider, useCsirtLocale } from '@/components/csirt/csirt-locale-provider'
import { CsirtSiteFooter } from '@/components/csirt/csirt-site-footer'
import { localizeNavItems, localizeTicker } from '@/lib/csirt/localize-nav'
import type { CsirtNavItem } from '@/lib/csirt/nav'
import type { SiteFooter } from '@/lib/site/types'
import type { CsirtSocialPlatform } from '@/lib/csirt/home-content'
import type { PlatformPublicContact } from '@/lib/dg/platform-branding'

type Props = {
  institutionLogoUrl?: string
  contact?: PlatformPublicContact
  nav: readonly CsirtNavItem[]
  ticker: readonly string[]
  footer: SiteFooter
  social: readonly CsirtSocialPlatform[]
  showFloating?: boolean
  children: ReactNode
}

export function CsirtPublicLayout(props: Props) {
  return (
    <CsirtLocaleProvider>
      <CsirtPublicLayoutInner {...props} />
    </CsirtLocaleProvider>
  )
}

function CsirtPublicLayoutInner({
  institutionLogoUrl,
  contact,
  nav,
  ticker,
  footer,
  social,
  showFloating = true,
  children,
}: Props) {
  const { language } = useCsirtLocale()

  const localizedNav = useMemo(() => localizeNavItems(nav, language), [nav, language])
  const localizedTicker = useMemo(() => localizeTicker(ticker, language), [ticker, language])

  return (
    <div className="csirt-site">
      <CsirtHeader
        institutionLogoUrl={institutionLogoUrl}
        nav={localizedNav}
        ticker={localizedTicker}
      />
      <main id="contenu" className="csirt-main">
        {children}
      </main>
      <CsirtSiteFooter
        institutionLogoUrl={institutionLogoUrl}
        contact={contact}
        footer={footer}
        social={social}
      />
      {showFloating ? <CsirtFloatingActionsLazy /> : null}
    </div>
  )
}
