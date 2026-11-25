import { revalidateTag, unstable_cache } from 'next/cache'
import { cache } from 'react'
import { createDefaultSiteContent, DEFAULT_VIGILANCE_SECTION } from '@/lib/site/defaults'
import { PUBLICATION_SAMPLE_DOCUMENTS } from '@/lib/site/publication-samples'
import { mergeSiteContent } from '@/lib/site/merge'
import {
  PREVIOUS_SITE_CONTENT_KEY,
  SITE_CONTENT_KEY,
  type SiteContent,
} from '@/lib/site/types'
import {
  getPlatformSettingValue,
  upsertPlatformSettingValue,
} from '@/lib/services/platform-settings-store'

function publicationsNeedSeed(raw: string): boolean {
  try {
    const parsed = JSON.parse(raw) as {
      pages?: Array<{ path?: string; documents?: unknown }>
    }
    if (!Array.isArray(parsed.pages)) return true
    const page = parsed.pages.find((item) => item.path === '/publications')
    if (!page) return true
    return !Array.isArray(page.documents) || page.documents.length === 0
  } catch {
    return false
  }
}

async function loadSiteContentRaw(): Promise<string | null> {
  const current = await getPlatformSettingValue(SITE_CONTENT_KEY)
  if (current) return current
  return getPlatformSettingValue(PREVIOUS_SITE_CONTENT_KEY)
}

export async function readMergedSiteContent(): Promise<SiteContent> {
  const raw = await loadSiteContentRaw()
  if (!raw) return createDefaultSiteContent()
  try {
    const next = mergeSiteContent(JSON.parse(raw) as unknown)
    const vigilance = next.home.vigilance
    if (vigilance.title === 'Restez en vigilance') {
      vigilance.title = DEFAULT_VIGILANCE_SECTION.title
    }
    if (
      vigilance.lead === 'Consultez les alertes officielles ou signalez immédiatement un incident.'
    ) {
      vigilance.lead = DEFAULT_VIGILANCE_SECTION.lead
    }
    if (publicationsNeedSeed(raw)) {
      const page = next.pages.find((item) => item.path === '/publications')
      if (page) {
        page.documents = PUBLICATION_SAMPLE_DOCUMENTS.map((doc) => ({ ...doc }))
        page.extensions = { ...page.extensions, documents: true }
      }
    }
    return next
  } catch {
    return createDefaultSiteContent()
  }
}

const readMergedSiteContentCached = unstable_cache(readMergedSiteContent, ['site-content'], {
  revalidate: 120,
  tags: ['site-content'],
})

/** Contenu public mis en cache : un clic ne relit plus le JSON complet en base. */
export const getSiteContent = cache(async (): Promise<SiteContent> => readMergedSiteContentCached())

export async function saveSiteContent(
  input: unknown,
  updatedById?: string
): Promise<SiteContent> {
  const next = mergeSiteContent(input)
  next.updatedAt = new Date().toISOString()
  const payload = JSON.stringify(next)
  let ok = await upsertPlatformSettingValue(SITE_CONTENT_KEY, payload, updatedById)
  if (!ok) {
    // Nouvelle tentative (MySQL XAMPP coupe parfois les grosses écritures)
    await new Promise((r) => setTimeout(r, 400))
    ok = await upsertPlatformSettingValue(SITE_CONTENT_KEY, payload, updatedById)
  }
  if (!ok) {
    throw new Error('SITE_SAVE_FAILED')
  }
  revalidateTag('site-content', 'max')
  return next
}
