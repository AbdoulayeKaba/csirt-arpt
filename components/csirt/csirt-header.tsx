'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Megaphone, Menu, X } from 'lucide-react'
import { ArptLogo } from '@/components/csirt/arpt-logo'
import { CsirtLanguageSwitcher } from '@/components/csirt/csirt-language-switcher'
import { useCsirtLocale } from '@/components/csirt/csirt-locale-provider'
import { CsirtMegaMenu } from '@/components/csirt/csirt-mega-menu'
import type { CsirtPublicationsMenuData } from '@/lib/csirt/publications-menu'
import {
  CSIRT_CONTACTS_HREF,
  CSIRT_NAV,
  CSIRT_TICKER,
  type CsirtNavItem,
} from '@/lib/csirt/nav'

type Props = {
  institutionLogoUrl?: string
  certLogoUrl?: string
  nav?: readonly CsirtNavItem[]
  ticker?: readonly string[]
  alertCount?: number
  publications?: CsirtPublicationsMenuData
}

const MOBILE_NAV_ID = 'csirt-mobile-nav'

export function CsirtHeader({
  institutionLogoUrl,
  certLogoUrl,
  nav = CSIRT_NAV,
  ticker = CSIRT_TICKER,
  alertCount = 0,
  publications,
}: Props) {
  const { t } = useCsirtLocale()
  const pathname = usePathname()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const closeTimer = useRef<number | null>(null)
  const hoverZoneRef = useRef<HTMLElement>(null)
  const megaZoneRef = useRef<HTMLDivElement>(null)

  const open = useCallback((label: string) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    setOpenMenu(label)
  }, [])

  const closeSoon = useCallback(() => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setOpenMenu(null), 80)
  }, [])

  const closeNow = useCallback(() => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    closeTimer.current = null
    setOpenMenu(null)
  }, [])

  const cancelClose = useCallback(() => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    closeTimer.current = null
  }, [])

  const isInHoverZone = useCallback((target: EventTarget | null) => {
    if (!(target instanceof Node)) return false
    return Boolean(hoverZoneRef.current?.contains(target) || megaZoneRef.current?.contains(target))
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    closeNow()
  }, [pathname, closeNow])

  useEffect(() => {
    if (!openMenu && !mobileOpen) return

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false)
        closeNow()
      }
    }
    const onScroll = () => closeNow()
    const onPointerDown = (event: PointerEvent) => {
      if (isInHoverZone(event.target)) return
      closeNow()
    }
    const onPointerMove = (event: PointerEvent) => {
      if (!openMenu) return
      if (isInHoverZone(event.target)) {
        cancelClose()
        return
      }
      closeSoon()
    }

    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { capture: true, passive: true })
    document.addEventListener('pointerdown', onPointerDown)
    if (openMenu) document.addEventListener('pointermove', onPointerMove)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, { capture: true })
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('pointermove', onPointerMove)
    }
  }, [openMenu, mobileOpen, closeNow, closeSoon, cancelClose, isInHoverZone])

  useEffect(() => {
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current)
    }
  }, [])

  const items = nav
  const tickerItems = ticker.length ? ticker : CSIRT_TICKER
  const activeItem = items.find((item) => item.label === openMenu)

  return (
    <header className={`csirt-header${activeItem?.mega ? ' is-mega-open' : ''}`}>
      <a href="#contenu" className="csirt-skip">
        {t('skipToContent')}
      </a>
      <div
        className="csirt-ticker"
        role="region"
        aria-label={t('tickerAria')}
        onPointerEnter={closeNow}
      >
        <span className="csirt-ticker-badge">{t('tickerBadge')}</span>
        <div className="csirt-ticker-track-wrap">
          <div className="csirt-ticker-track">
            {[0, 1].map((copy) => (
              <div
                key={copy}
                className="csirt-ticker-copy"
                aria-hidden={copy === 1 ? true : undefined}
              >
                {tickerItems.map((item, index) => (
                  <span key={`${copy}-${index}`} className="csirt-ticker-item">
                    {item}
                    <span className="csirt-ticker-sep" aria-hidden>
                      •
                    </span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="csirt-nav-cluster">
        <div className="csirt-nav-bar">
          <Link
            href="/"
            className="csirt-nav-brand"
            aria-label={t('homeAria')}
            onPointerEnter={closeNow}
          >
            <ArptLogo
              institutionLogoUrl={institutionLogoUrl}
              certLogoUrl={certLogoUrl}
              showWordmark={false}
            />
          </Link>

          <div className="csirt-nav-end">
            <nav
              ref={hoverZoneRef}
              className="csirt-nav-desktop"
              aria-label={t('mainNavAria')}
              onPointerEnter={cancelClose}
              onPointerLeave={(event) => {
                if (isInHoverZone(event.relatedTarget)) return
                closeSoon()
              }}
            >
              {items.map((item) => (
                <NavItem
                  key={item.label}
                  item={item}
                  open={openMenu === item.label}
                  pathname={pathname}
                  onOpen={() => (item.mega ? open(item.label) : closeNow())}
                />
              ))}
            </nav>
            <CsirtLanguageSwitcher id="desktop" />
            <Link
              href={CSIRT_CONTACTS_HREF}
              className="csirt-contacts-btn"
              onPointerEnter={closeNow}
            >
              <Megaphone className="h-4 w-4" aria-hidden />
              {t('contacts')}
            </Link>
          </div>

          <div className="csirt-nav-mobile-tools">
            <CsirtLanguageSwitcher id="mobile" />
            <button
            type="button"
            className="csirt-nav-burger"
            aria-expanded={mobileOpen}
            aria-controls={MOBILE_NAV_ID}
            onClick={() => setMobileOpen((value) => !value)}
          >
            {mobileOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            <span className="sr-only">{mobileOpen ? t('closeMenu') : t('openMenu')}</span>
          </button>
          </div>
        </div>

        {activeItem?.mega ? (
          <div
            ref={megaZoneRef}
            className="csirt-mega-zone"
            onPointerEnter={cancelClose}
            onPointerLeave={(event) => {
              if (isInHoverZone(event.relatedTarget)) return
              closeSoon()
            }}
          >
            <CsirtMegaMenu
              key={activeItem.label}
              item={activeItem}
              alertCount={alertCount}
              publications={publications}
            />
          </div>
        ) : null}
      </div>

      {activeItem?.mega ? (
        <button
          type="button"
          className="csirt-mega-scrim"
          aria-label={t('closeMegaMenu')}
          onPointerEnter={closeNow}
          onClick={closeNow}
        />
      ) : null}

      {mobileOpen ? (
        <nav id={MOBILE_NAV_ID} className="csirt-nav-mobile" aria-label={t('mobileNavAria')}>
          {items.map((item) => (
            <div key={item.label} className="csirt-nav-mobile-group">
              <Link href={item.href} className="csirt-nav-mobile-link">
                {item.label}
              </Link>
              {(item.mega?.cards ?? []).slice(0, 4).map((card) => (
                <Link key={`${card.href}-${card.title}`} href={card.href} className="csirt-nav-mobile-sub">
                  {card.title}
                </Link>
              ))}
            </div>
          ))}
          <Link href={CSIRT_CONTACTS_HREF} className="csirt-contacts-btn csirt-contacts-btn--mobile">
            <Megaphone className="h-4 w-4" aria-hidden />
            {t('contacts')}
          </Link>
        </nav>
      ) : null}
    </header>
  )
}

function NavItem({
  item,
  open,
  pathname,
  onOpen,
}: {
  item: CsirtNavItem
  open: boolean
  pathname: string
  onOpen: () => void
}) {
  const isCurrent = pathname === item.href || pathname.startsWith(`${item.href}/`)

  if (!item.mega) {
    return (
      <Link
        href={item.href}
        className={`csirt-nav-link${isCurrent ? ' is-current' : ''}`}
        onPointerEnter={onOpen}
        onFocus={onOpen}
      >
        {item.label}
      </Link>
    )
  }

  return (
    <div className="csirt-nav-item" onPointerEnter={onOpen} onFocus={onOpen}>
      <Link
        href={item.href}
        className={`csirt-nav-link${open ? ' is-open' : ''}${isCurrent ? ' is-current' : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {item.label}
        <ChevronDown className="csirt-nav-caret" aria-hidden />
      </Link>
    </div>
  )
}
