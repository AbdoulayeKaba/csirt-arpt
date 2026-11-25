import { isMockDataEnabled } from '@/lib/mock/config'
import {
  DEFAULT_NEWSLETTER_POPUP,
  normalizeNewsletterPopupConfig,
  normalizePathname,
  type NewsletterPopupConfig,
} from '@/lib/csirt/newsletter-popup-config'
import { getSiteContent } from '@/lib/site/store'
import {
  getPlatformSettingValue,
  upsertPlatformSettingValue,
} from '@/lib/services/platform-settings-store'

export const NEWSLETTER_POPUP_KEY = 'admin.newsletter.popup'

export type NewsletterPopupPageOption = {
  href: string
  label: string
  group: string
  published: boolean
}

export type {
  NewsletterPopupConfig,
  NewsletterPopupPublicConfig,
} from '@/lib/csirt/newsletter-popup-config'

export {
  DEFAULT_NEWSLETTER_POPUP,
  normalizeNewsletterPopupConfig,
  newsletterPopupPathAllowed,
  normalizePathname,
  toPublicNewsletterPopupConfig,
} from '@/lib/csirt/newsletter-popup-config'

const CORE_PUBLIC_PAGES: NewsletterPopupPageOption[] = [
  { href: '/', label: 'Accueil', group: 'Site', published: true },
  { href: '/actualites', label: 'Actualités', group: 'Site', published: true },
  { href: '/contacts', label: 'Contacts', group: 'Site', published: true },
  { href: '/mediatheque', label: 'Médiathèque', group: 'Site', published: true },
  { href: '/plan-du-site', label: 'Plan du site', group: 'Site', published: true },
]

const BLOCKED_PAGE_PREFIXES = [
  '/dg',
  '/login',
  '/api',
  '/abonnement',
  '/signalement',
  '/account',
  '/dashboard',
]

function isBlockedPath(href: string): boolean {
  const path = normalizePathname(href)
  return BLOCKED_PAGE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  )
}

let mockPopup: NewsletterPopupConfig | null = null

function parseConfig(raw: string | null): NewsletterPopupConfig {
  if (!raw) return { ...DEFAULT_NEWSLETTER_POPUP }
  try {
    return normalizeNewsletterPopupConfig(JSON.parse(raw) as unknown)
  } catch {
    return { ...DEFAULT_NEWSLETTER_POPUP }
  }
}

export async function getNewsletterPopupConfig(): Promise<NewsletterPopupConfig> {
  if (isMockDataEnabled()) {
    return mockPopup ? { ...mockPopup } : { ...DEFAULT_NEWSLETTER_POPUP }
  }
  return parseConfig(await getPlatformSettingValue(NEWSLETTER_POPUP_KEY))
}

export async function updateNewsletterPopupConfig(
  patch: Partial<NewsletterPopupConfig>,
  updatedById?: string
): Promise<NewsletterPopupConfig> {
  const current = await getNewsletterPopupConfig()
  const paths =
    patch.paths !== undefined
      ? patch.paths.filter((p) => !isBlockedPath(p))
      : current.paths

  const requestedEnabled =
    patch.enabled !== undefined ? Boolean(patch.enabled) : current.enabled
  // Impossible d’activer sans page ciblée
  const enabled = requestedEnabled && paths.length > 0

  const next = normalizeNewsletterPopupConfig({
    ...current,
    ...patch,
    paths,
    enabled,
    excludePaths: patch.excludePaths ?? current.excludePaths,
    updatedAt: new Date().toISOString(),
  })
  const payload = JSON.stringify(next)

  if (isMockDataEnabled()) {
    mockPopup = next
    return { ...next }
  }

  const ok = await upsertPlatformSettingValue(NEWSLETTER_POPUP_KEY, payload, updatedById)
  if (!ok) {
    throw new Error('NEWSLETTER_POPUP_SAVE_FAILED')
  }
  return { ...next }
}

/** Catalogue des pages proposées dans le multi-select admin. */
export async function listNewsletterPopupPageOptions(): Promise<NewsletterPopupPageOption[]> {
  const site = await getSiteContent()
  const byHref = new Map<string, NewsletterPopupPageOption>()

  for (const page of CORE_PUBLIC_PAGES) {
    byHref.set(page.href, page)
  }

  for (const page of site.pages) {
    const href = normalizePathname(page.path)
    if (isBlockedPath(href)) continue
    byHref.set(href, {
      href,
      label: page.title,
      group: page.group,
      published: page.published,
    })
  }

  return [...byHref.values()].sort((a, b) => {
    const byGroup = a.group.localeCompare(b.group, 'fr')
    if (byGroup !== 0) return byGroup
    return a.label.localeCompare(b.label, 'fr')
  })
}
