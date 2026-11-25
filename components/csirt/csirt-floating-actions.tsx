'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowUp, ArrowUpRight } from 'lucide-react'
import { CsirtHelpDialog, useCsirtHelp } from '@/components/csirt/csirt-help-dialog'
import { useCsirtLocale } from '@/components/csirt/csirt-locale-provider'
import { CSIRT_SIGNALEMENT_HREF } from '@/lib/csirt/nav'

const SCROLL_SHOW_AFTER = 420

export function CsirtFloatingActions() {
  const pathname = usePathname()
  const { t } = useCsirtLocale()
  const { open, closeHelp, toggleHelp } = useCsirtHelp()
  const onSignalement = pathname.startsWith(CSIRT_SIGNALEMENT_HREF)
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    const sync = () => {
      setShowTop(window.scrollY > SCROLL_SHOW_AFTER)
    }
    sync()
    window.addEventListener('scroll', sync, { passive: true })
    return () => window.removeEventListener('scroll', sync)
  }, [pathname])

  function scrollToTop() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
  }

  return (
    <CsirtHelpDialog
      open={onSignalement ? false : open}
      onClose={closeHelp}
      scope={onSignalement ? 'signalement' : 'site'}
    >
      <button
        type="button"
        className={showTop ? 'csirt-fab-top is-visible' : 'csirt-fab-top'}
        aria-label={t('backToTop')}
        tabIndex={showTop ? 0 : -1}
        onClick={scrollToTop}
      >
        <ArrowUp className="h-5 w-5" strokeWidth={2.4} aria-hidden />
      </button>
      {onSignalement ? null : (
        <div className="csirt-fab-bar">
          <button
            type="button"
            className={open ? 'csirt-fab-help is-open' : 'csirt-fab-help'}
            aria-expanded={open}
            aria-controls="csirt-help-dialog"
            onClick={toggleHelp}
          >
            <span className="csirt-fab-help-mark" aria-hidden>
              N
            </span>
            {t('needHelp')}
          </button>
          <Link href={CSIRT_SIGNALEMENT_HREF} className="csirt-fab-report">
            {t('reportIncident')}
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      )}
    </CsirtHelpDialog>
  )
}
