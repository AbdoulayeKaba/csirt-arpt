'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { CsirtNewsletterModal } from '@/components/csirt/csirt-newsletter-modal'
import {
  newsletterPopupPathAllowed,
  type NewsletterPopupPublicConfig,
} from '@/lib/csirt/newsletter-popup-config'

/** Persistance uniquement après abonnement réussi */
const SUBSCRIBE_KEY = 'csirt_nl_popup_subscribed_until'
const CONFIG_KEY = 'csirt_nl_scroll_popup_cfg'
/** Anciennes clés (fermeture) — nettoyées au chargement */
const LEGACY_KEYS = ['csirt_nl_scroll_popup_until', 'csirt_nl_scroll_popup_session'] as const

function clearLegacyDismiss() {
  try {
    window.localStorage.removeItem(LEGACY_KEYS[0])
    window.sessionStorage.removeItem(LEGACY_KEYS[1])
  } catch {
    /* ignore */
  }
}

function isSubscribedSuppressed(configUpdatedAt?: string): boolean {
  try {
    if (configUpdatedAt) {
      const seen = window.localStorage.getItem(CONFIG_KEY)
      if (seen !== configUpdatedAt) {
        window.localStorage.removeItem(SUBSCRIBE_KEY)
        window.localStorage.setItem(CONFIG_KEY, configUpdatedAt)
        return false
      }
    }
    const raw = window.localStorage.getItem(SUBSCRIBE_KEY)
    if (!raw) return false
    const n = Number(raw)
    return Number.isFinite(n) && n > Date.now()
  } catch {
    return false
  }
}

function writeSubscribedUntil(days: number) {
  try {
    if (days <= 0) {
      // Session navigateur uniquement
      window.sessionStorage.setItem(SUBSCRIBE_KEY, '1')
      return
    }
    const until = Date.now() + days * 24 * 60 * 60 * 1000
    window.localStorage.setItem(SUBSCRIBE_KEY, String(until))
  } catch {
    /* ignore */
  }
}

function isSessionSubscribed(): boolean {
  try {
    return window.sessionStorage.getItem(SUBSCRIBE_KEY) === '1'
  } catch {
    return false
  }
}

let popupConfigRequest: Promise<NewsletterPopupPublicConfig | null> | null = null

function loadPopupConfig() {
  if (!popupConfigRequest) {
    popupConfigRequest = fetch('/api/newsletter/popup', { cache: 'no-store' })
      .then(async (res) => (res.ok ? ((await res.json()) as NewsletterPopupPublicConfig) : null))
      .catch(() => null)
  }
  return popupConfigRequest
}

function scrollProgress(): number {
  const doc = document.documentElement
  const body = document.body
  const scrollTop = window.scrollY || doc.scrollTop || body?.scrollTop || 0
  const scrollHeight = Math.max(doc.scrollHeight, body?.scrollHeight || 0)
  const height = scrollHeight - window.innerHeight
  if (height <= 40) return 100
  return Math.min(100, Math.max(0, (scrollTop / height) * 100))
}

export function CsirtNewsletterScrollPopup() {
  const pathname = usePathname() || '/'
  const [config, setConfig] = useState<NewsletterPopupPublicConfig | null>(null)
  const [open, setOpen] = useState(false)
  const armedRef = useRef(false)
  const shownRef = useRef(false)
  const needsScrollResetRef = useRef(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    clearLegacyDismiss()
    let cancelled = false
    const run = () => {
      void loadPopupConfig().then((json) => {
        if (!cancelled && json) setConfig(json)
      })
    }
    let idleId = 0
    let timerId = 0
    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(run, { timeout: 2000 })
    } else {
      timerId = window.setTimeout(run, 1200)
    }
    return () => {
      cancelled = true
      if (idleId) window.cancelIdleCallback?.(idleId)
      if (timerId) window.clearTimeout(timerId)
    }
  }, [])

  useEffect(() => {
    armedRef.current = false
    shownRef.current = false
    needsScrollResetRef.current = false
    setOpen(false)
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [pathname])

  useEffect(() => {
    if (!config?.enabled) return
    if (!newsletterPopupPathAllowed(pathname, config)) return
    if (isSubscribedSuppressed(config.updatedAt) || isSessionSubscribed()) return

    function clearTimer() {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }

    function show() {
      if (shownRef.current) return
      if (isSubscribedSuppressed(config!.updatedAt) || isSessionSubscribed()) return
      shownRef.current = true
      setOpen(true)
    }

    function arm() {
      const progress = scrollProgress()

      // Après fermeture : attendre un retour sous le seuil, puis un nouveau scroll
      if (needsScrollResetRef.current) {
        if (progress >= config!.scrollPercent) return
        needsScrollResetRef.current = false
        armedRef.current = false
        shownRef.current = false
      }

      if (shownRef.current || armedRef.current) return
      if (progress < config!.scrollPercent) return

      armedRef.current = true
      clearTimer()
      timerRef.current = window.setTimeout(show, Math.max(0, config!.delayMs))
    }

    arm()
    window.addEventListener('scroll', arm, { passive: true, capture: true })
    document.addEventListener('scroll', arm, { passive: true, capture: true })
    window.addEventListener('resize', arm, { passive: true })
    return () => {
      window.removeEventListener('scroll', arm, true)
      document.removeEventListener('scroll', arm, true)
      window.removeEventListener('resize', arm)
      clearTimer()
    }
  }, [config, pathname])

  function handleClose() {
    // Fermeture seule : peut réapparaître après un nouveau cycle de scroll
    needsScrollResetRef.current = true
    armedRef.current = false
    shownRef.current = false
  }

  function handleSubscribed() {
    if (config) writeSubscribedUntil(config.cookieDays)
    needsScrollResetRef.current = false
    armedRef.current = true
    shownRef.current = true
  }

  if (!config?.enabled) return null
  if (!newsletterPopupPathAllowed(pathname, config)) return null

  return (
    <CsirtNewsletterModal
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) handleClose()
      }}
      title={config.title}
      description={config.description}
      submitLabel={config.ctaLabel}
      onSubscribed={handleSubscribed}
    />
  )
}
