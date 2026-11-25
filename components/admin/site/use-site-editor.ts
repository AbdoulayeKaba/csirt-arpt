'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSiteEditorSeed } from '@/components/admin/site/site-editor-seed'
import { useApp } from '@/lib/app-context'
import type { SiteContent } from '@/lib/site/types'
import { toast } from '@/hooks/use-toast'

let siteMemory: { site: SiteContent; snapshot: string } | null = null
let siteInflight: Promise<SiteContent> | null = null

function rememberSite(site: SiteContent) {
  siteMemory = { site, snapshot: JSON.stringify(site) }
}

function loadSiteFromApi(): Promise<SiteContent> {
  if (!siteInflight) {
    siteInflight = fetch('/api/admin/site', { cache: 'no-store' })
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as { site?: SiteContent }
        if (!res.ok || !json.site) throw new Error('load')
        rememberSite(json.site)
        return json.site
      })
      .finally(() => {
        siteInflight = null
      })
  }
  return siteInflight
}

type SiteSaveResponse = {
  site?: SiteContent
  error?: string
  message?: string
  newsletterQueued?: boolean
  newsletterPending?: { pages: number; collected: number }
}

function newsletterToastDescription(json: SiteSaveResponse) {
  const pending =
    (json.newsletterPending?.pages ?? 0) + (json.newsletterPending?.collected ?? 0)
  if (json.newsletterQueued && pending > 0) {
    return `Notification en cours pour ${pending} publication(s) — abonnés newsletter et déclarants (si alerte).`
  }
  return null
}

export function useSiteEditor() {
  const { permissions } = useApp()
  const canEdit = permissions['action.site.edit'] === true
  const seed = useSiteEditorSeed()
  const starting = siteMemory?.site ?? seed
  const [site, setSite] = useState<SiteContent | null>(starting)
  const [savedSnapshot, setSavedSnapshot] = useState(starting ? JSON.stringify(starting) : '')
  const [loading, setLoading] = useState(!starting)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (siteMemory || seed) {
      if (seed && !siteMemory) rememberSite(seed)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    void loadSiteFromApi()
      .then((next) => {
        if (cancelled || !siteMemory) return
        setSite(next)
        setSavedSnapshot(siteMemory.snapshot)
      })
      .catch(() => {
        if (!cancelled) {
          toast({
            variant: 'destructive',
            title: 'Impossible de charger le site',
            description: 'Vérifiez votre session puis réessayez.',
          })
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [seed])

  const dirty = useMemo(() => {
    if (!site) return false
    return JSON.stringify(site) !== savedSnapshot
  }, [site, savedSnapshot])

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const save = useCallback(async () => {
    if (!site || !canEdit) return false
    setSaving(true)
    try {
      const res = await fetch('/api/admin/site', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site }),
      })
      const json = (await res.json().catch(() => ({}))) as SiteSaveResponse
      if (!res.ok || !json.site) {
        toast({
          variant: 'destructive',
          title: 'Enregistrement refusé',
          description:
            json.message ||
            (json.error === 'SITE_SAVE_FAILED'
              ? 'Enregistrement impossible (contenu trop volumineux ou base indisponible).'
              : 'Le contenu n’a pas pu être enregistré.'),
        })
        return false
      }
      rememberSite(json.site)
      setSite(json.site)
      setSavedSnapshot(siteMemory?.snapshot ?? JSON.stringify(json.site))
      const nl = newsletterToastDescription(json)
      toast({
        title: 'Modifications enregistrées',
        description: nl ?? 'Le site public reflète désormais vos changements.',
      })
      return true
    } finally {
      setSaving(false)
    }
  }, [canEdit, site])

  const hydrateSite = useCallback((next: SiteContent) => {
    rememberSite(next)
    setSite(next)
    setSavedSnapshot(siteMemory?.snapshot ?? JSON.stringify(next))
  }, [])

  /**
   * Persiste immédiatement un site (activer / désactiver…).
   * En mode quiet : pas de barre « non enregistrées », pas de toast générique,
   * pas d’état « Enregistrement… » sur le bouton Enregistrer.
   */
  const persistSite = useCallback(
    async (next: SiteContent, opts?: { quiet?: boolean }) => {
      if (!canEdit) return false
      const quiet = opts?.quiet === true
      const rollbackSite = site
      const rollbackSnap = savedSnapshot

      setSite(next)
      if (quiet) {
        setSavedSnapshot(JSON.stringify(next))
      } else {
        setSaving(true)
      }

      try {
        const res = await fetch('/api/admin/site', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ site: next }),
        })
        const json = (await res.json().catch(() => ({}))) as SiteSaveResponse
        if (!res.ok || !json.site) {
          if (rollbackSite) {
            setSite(rollbackSite)
            setSavedSnapshot(rollbackSnap)
          }
          toast({
            variant: 'destructive',
            title: 'Action non enregistrée',
            description:
              json.message ||
              (json.error === 'SITE_SAVE_FAILED'
                ? 'Enregistrement impossible (contenu trop volumineux ou base indisponible).'
                : 'La modification n’a pas pu être appliquée.'),
          })
          return false
        }
        rememberSite(json.site)
        setSite(json.site)
        setSavedSnapshot(siteMemory?.snapshot ?? JSON.stringify(json.site))
        const nl = newsletterToastDescription(json)
        if (!quiet) {
          toast({
            title: 'Modifications enregistrées',
            description: nl ?? 'Le site public reflète désormais vos changements.',
          })
        } else if (nl) {
          toast({
            title: 'Newsletter',
            description: nl,
          })
        }
        return true
      } finally {
        if (!quiet) setSaving(false)
      }
    },
    [canEdit, site, savedSnapshot]
  )

  return { site, setSite, hydrateSite, persistSite, loading, saving, dirty, canEdit, save }
}

export function moveItem<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const next = [...list]
  const target = index + direction
  if (target < 0 || target >= next.length) return list
  const current = next[index]
  next[index] = next[target]
  next[target] = current
  return next
}
