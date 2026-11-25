import { createDefaultSiteContent } from '@/lib/site/defaults'
import { DEFAULT_ABOUT_CONTENT, sanitizeAboutContent } from '@/lib/site/about-defaults'
import { DEFAULT_DISCOVER_CONTENT, sanitizeDiscoverContent } from '@/lib/site/discover-defaults'
import {
  DEFAULT_A11Y_CONTENT,
  DEFAULT_MENTIONS_CONTENT,
  DEFAULT_PRIVACY_CONTENT,
  LEGAL_PLACEHOLDER_LEADS,
  isLegalTipTapSeedBody,
  sanitizeA11yContent,
  sanitizeMentionsContent,
  sanitizePrivacyContent,
} from '@/lib/site/legal-defaults'
import { DEFAULT_SITEMAP_CONTENT, sanitizeSitemapContent } from '@/lib/site/sitemap-defaults'
import { formatSiteNewsDates } from '@/lib/site/ids'
import { menusToNavItems, navItemsToMenus, sanitizeMenus } from '@/lib/site/menus'
import { resolveCyberNewsImage } from '@/lib/site/news-images'
import { decodeHtmlEntities } from '@/lib/site/news-scrape'
import { scrubCmsUploadUrls } from '@/lib/site/asset-urls'
import { isExpiredTrash } from '@/lib/utils/trash-retention'
import {
  DEFAULT_NEWS_TOPICS,
  isAlertNewsCategory,
  normalizeSiteNewsCategory,
  type SiteNewsCollectedItem,
  type SiteNewsSource,
  type SiteNewsTopic,
} from '@/lib/site/news-sources'
import type {
  SiteFooter,
  SiteHome,
  SiteLink,
  SitePage,
  SitePageDocument,
  SitePublicationCategory,
  SitePageGroup,
  SiteResponsePillar,
  SiteResponseSection,
  SiteContent,
  SiteSearchSuggestion,
  SiteVigilanceLane,
  SiteVigilanceSection,
} from '@/lib/site/types'
import type { CsirtActionLink, CsirtHeroSlide, CsirtNewsItem, CsirtSocialPlatform, CsirtVideo } from '@/lib/csirt/home-content'
import { parseHeroCtaIcon, parseHeroVariant } from '@/lib/csirt/hero-cta'
import type { CsirtMegaCard, CsirtNavItem } from '@/lib/csirt/nav'

const PAGE_GROUPS = new Set<SitePageGroup>([
  'Institution',
  'Réglementations',
  'Accompagnements',
  'Publications',
  'Bonnes pratiques',
  'Services',
  'Légal',
])

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function asBool(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function sanitizeLink(raw: unknown, fallback?: SiteLink): SiteLink | null {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const href = asString(row.href, fallback?.href ?? '')
  const label = asString(row.label, fallback?.label ?? '')
  if (!href || !label) return null
  return { href, label }
}

function sanitizeLinks(raw: unknown, fallback: SiteLink[]): SiteLink[] {
  if (!Array.isArray(raw)) return fallback
  return raw
    .map((item) => sanitizeLink(item))
    .filter((item): item is SiteLink => Boolean(item))
}

/** Liens footer : conserve id + soft-delete (corbeille 90 j). */
function sanitizeFooterLinks(
  raw: unknown,
  fallback: SiteLink[],
  idPrefix: string
): SiteLink[] {
  if (!Array.isArray(raw)) return fallback
  const items: SiteLink[] = []
  for (const [index, item] of raw.entries()) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const href = asString(row.href).trim()
    const label = asString(row.label).trim()
    if (!href || !label) continue
    const archived = asBool(row.archived, false)
    const archivedAt = archived ? asString(row.archivedAt) || null : null
    if (archived && isExpiredTrash(archivedAt)) continue
    items.push({
      id: asString(row.id, `${idPrefix}-${index + 1}`) || `${idPrefix}-${index + 1}`,
      href,
      label,
      archived,
      archivedAt,
    })
  }
  return items.length ? items : fallback
}

function sanitizeActionLinks(
  raw: unknown,
  fallback: CsirtActionLink[]
): CsirtActionLink[] {
  if (!Array.isArray(raw)) return fallback
  const items: CsirtActionLink[] = []
  for (const [index, item] of raw.entries()) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const href = asString(row.href).trim()
    const label = asString(row.label).trim()
    if (!href || !label) continue
    const archived = asBool(row.archived, false)
    const archivedAt = archived ? asString(row.archivedAt) || null : null
    if (archived && isExpiredTrash(archivedAt)) continue
    items.push({
      id: asString(row.id, `action-${index + 1}`) || `action-${index + 1}`,
      href,
      label,
      archived,
      archivedAt,
    })
  }
  return items.length ? items : fallback
}

function sanitizeSearchSuggestions(
  raw: unknown,
  fallback: SiteSearchSuggestion[]
): SiteSearchSuggestion[] {
  if (!Array.isArray(raw)) return fallback
  const items: SiteSearchSuggestion[] = []
  for (const [index, item] of raw.entries()) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const label = asString(row.label).trim()
    const query = asString(row.query).trim()
    const href = asString(row.href).trim()
    if (!label || (!query && !href)) continue
    const archived = asBool(row.archived, false)
    const archivedAt = archived ? asString(row.archivedAt) || null : null
    if (archived && isExpiredTrash(archivedAt)) continue
    const suggestion: SiteSearchSuggestion = {
      id: asString(row.id, `search-${index + 1}`) || `search-${index + 1}`,
      label,
      query: query || label,
      archived,
      archivedAt,
    }
    if (href) suggestion.href = href
    items.push(suggestion)
  }
  return items.length ? items : fallback
}

const PUBLICATION_CATEGORIES = new Set<SitePublicationCategory>([
  'alertes',
  'rapports',
  'guides',
  'reglementation',
  'notes',
  'procedures',
  'modeles',
  'sensibilisation',
])

function sanitizeDocuments(raw: unknown): SitePageDocument[] {
  return asArray<Record<string, unknown>>(raw)
    .map((row, index) => {
      const url = asString(row.url)
      if (!url) return null
      const title = asString(row.title, `Document ${index + 1}`)
      const id = asString(row.id, `doc-${index + 1}`)
      const mimeType = asString(row.mimeType, 'application/pdf') || undefined
      const sizeRaw = row.size
      const size =
        typeof sizeRaw === 'number' && Number.isFinite(sizeRaw) ? sizeRaw : undefined
      const categoryRaw = asString(row.category)
      const category = PUBLICATION_CATEGORIES.has(categoryRaw as SitePublicationCategory)
        ? (categoryRaw as SitePublicationCategory)
        : undefined
      const excerpt = asString(row.excerpt).trim() || undefined
      const dateIso = /^\d{4}-\d{2}-\d{2}/.test(asString(row.dateIso))
        ? asString(row.dateIso).slice(0, 10)
        : undefined
      return {
        id,
        title,
        url,
        mimeType,
        size,
        category,
        excerpt,
        dateIso,
      } satisfies SitePageDocument
    })
    .filter((item): item is SitePageDocument => Boolean(item))
}

function sanitizeHero(raw: unknown, fallback: CsirtHeroSlide[]): CsirtHeroSlide[] {
  const items: CsirtHeroSlide[] = []
  for (const [index, entry] of asArray<Record<string, unknown>>(raw).entries()) {
    const id = asString(entry.id, `hero-${index + 1}`)
    const src = asString(entry.src)
    // Conserve les brouillons (sans image) pour permettre la création progressive.
    if (!id && !src) continue
    const archived = asBool(entry.archived, false)
    const archivedAt = archived ? asString(entry.archivedAt) || null : null
    if (archived && isExpiredTrash(archivedAt)) continue
    const variant = parseHeroVariant(entry.variant)
    items.push({
      id: id || `hero-${index + 1}`,
      src,
      alt: asString(entry.alt),
      kicker: asString(entry.kicker) || undefined,
      title: asString(entry.title) || undefined,
      cta: asString(entry.cta),
      href: asString(entry.href, '/'),
      variant,
      ctaIcon: parseHeroCtaIcon(entry.ctaIcon, variant),
      enabled: asBool(entry.enabled, true),
      archived,
      archivedAt,
    })
  }
  return items.length ? items : fallback
}

function clampHeroAutoplayMs(value: unknown, fallback: number) {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(15000, Math.max(2000, Math.round(n)))
}

function sanitizeNewsTopics(raw: unknown): SiteNewsTopic[] {
  const items = asArray<Record<string, unknown>>(raw)
    .map((row, index) => {
      const label = asString(row.label).trim()
      if (!label) return null
      const toneRaw = asString(row.tone, 'info')
      const archived = asBool(row.archived, false)
      const archivedAt = archived ? asString(row.archivedAt) || null : null
      if (archived && isExpiredTrash(archivedAt)) return null
      return {
        id: asString(row.id, `ntopic-${index + 1}`),
        label,
        tone: toneRaw === 'alert' ? 'alert' : 'info',
        order: typeof row.order === 'number' ? row.order : index,
        archived,
        archivedAt,
      } satisfies SiteNewsTopic
    })
    .filter((item): item is SiteNewsTopic => Boolean(item))
  return items.length ? items : DEFAULT_NEWS_TOPICS.map((t) => ({ ...t }))
}

function sanitizeNews(
  raw: unknown,
  fallback: CsirtNewsItem[],
  topics: SiteNewsTopic[]
): CsirtNewsItem[] {
  const items = asArray<Record<string, unknown>>(raw)
    .map((row, index) => {
      const title = asString(row.title)
      const date = asString(row.date)
      if (!title || !date) return null
      const dates = formatSiteNewsDates(date)
      const archived = asBool(row.archived, false)
      const archivedAt = archived ? asString(row.archivedAt) || null : null
      if (archived && isExpiredTrash(archivedAt)) return null
      const cat = normalizeSiteNewsCategory(row.category, topics)
      const rawImg = asString(row.image)
      return {
        id: asString(row.id, `news-${index + 1}`),
        date,
        dateLabel: asString(row.dateLabel, dates.dateLabel),
        dateShort: asString(row.dateShort, dates.dateShort),
        category: cat,
        title,
        excerpt: asString(row.excerpt),
        href: `/actualites/${asString(row.id, `news-${index + 1}`)}`,
        externalHref: asString(row.externalHref) || undefined,
        image: resolveCyberNewsImage(title, cat, rawImg),
        archived,
        archivedAt,
      } satisfies CsirtNewsItem
    })
    .filter((item): item is CsirtNewsItem => Boolean(item))
  return items.length ? items : fallback
}

function sanitizeNewsSources(raw: unknown, topics: SiteNewsTopic[]): SiteNewsSource[] {
  return asArray<Record<string, unknown>>(raw)
    .map((row, index) => {
      const url = asString(row.url).trim()
      if (!url) return null
      const typeRaw = asString(row.type, 'rss')
      const type: SiteNewsSource['type'] =
        typeRaw === 'html' || typeRaw === 'api' ? typeRaw : 'rss'
      const archived = asBool(row.archived, false)
      const archivedAt = archived ? asString(row.archivedAt) || null : null
      if (archived && isExpiredTrash(archivedAt)) return null
      return {
        id: asString(row.id, `nsrc-${index + 1}`),
        name: asString(row.name, `Source ${index + 1}`),
        url,
        category: normalizeSiteNewsCategory(row.category, topics),
        enabled: asBool(row.enabled, true),
        type,
        frequency: asString(row.frequency, 'Quotidien') || 'Quotidien',
        country: asString(row.country) || undefined,
        themes: asArray<unknown>(row.themes)
          .map((t) => asString(t).trim())
          .filter(Boolean),
        notes: asString(row.notes) || undefined,
        lastFetchedAt: asString(row.lastFetchedAt) || null,
        lastError: asString(row.lastError) || null,
        archived,
        archivedAt,
      } satisfies SiteNewsSource
    })
    .filter((item): item is SiteNewsSource => Boolean(item))
}

function sanitizeNewsCollected(
  raw: unknown,
  topics: SiteNewsTopic[]
): SiteNewsCollectedItem[] {
  return asArray<Record<string, unknown>>(raw)
    .map((row, index) => {
      const title = asString(row.title).trim()
      const url = asString(row.url).trim()
      if (!title || !url) return null
      const archived = asBool(row.archived, false)
      const archivedAt = archived ? asString(row.archivedAt) || null : null
      if (archived && isExpiredTrash(archivedAt)) return null
      const cat = normalizeSiteNewsCategory(row.category, topics)
      const rawImg = asString(row.image)
      return {
        id: asString(row.id, `ncol-${index + 1}`),
        title: decodeHtmlEntities(title),
        excerpt: decodeHtmlEntities(asString(row.excerpt)),
        bodyHtml: asString(row.bodyHtml) || undefined,
        author: asString(row.author) || undefined,
        url,
        sourceId: asString(row.sourceId),
        sourceName: asString(row.sourceName, 'Source'),
        category: cat,
        themes: asArray<unknown>(row.themes)
          .map((t) => asString(t).trim())
          .filter(Boolean),
        date: asString(row.date, new Date().toISOString().slice(0, 10)),
        scrapedAt: asString(row.scrapedAt, new Date().toISOString()),
        enabled: asBool(row.enabled, false),
        enabledAt: asString(row.enabledAt) || undefined,
        image: isAlertNewsCategory(cat, topics)
          ? undefined
          : resolveCyberNewsImage(title, cat, rawImg),
        archived,
        archivedAt,
      } satisfies SiteNewsCollectedItem
    })
    .filter((item): item is SiteNewsCollectedItem => Boolean(item))
}

function sanitizeVideos(raw: unknown, fallback: CsirtVideo[]): CsirtVideo[] {
  const items = asArray<Record<string, unknown>>(raw)
    .map((row, index) => {
      const id = asString(row.id, `video-${index + 1}`)
      if (!id) return null
      const title = asString(row.title, `Vidéo ${index + 1}`)
      const rawHref = asString(row.href)
      const archived = asBool(row.archived, false)
      const archivedAt = archived ? asString(row.archivedAt) || null : null
      if (archived && isExpiredTrash(archivedAt)) return null
      const category = asString(row.category)
      const format = asString(row.format)
      const dateIso = asString(row.dateIso).slice(0, 10)
      return {
        id,
        title: title || `Vidéo ${index + 1}`,
        duration: asString(row.duration, '0:00'),
        image: asString(row.image, fallback[index]?.image || '/csirt/media-1.png'),
        href: rawHref,
        category:
          category === 'sensibilisation' ||
          category === 'bonnes-pratiques' ||
          category === 'interventions' ||
          category === 'ateliers' ||
          category === 'evenements' ||
          category === 'reportages' ||
          category === 'reglementation' ||
          category === 'replay'
            ? category
            : undefined,
        excerpt: asString(row.excerpt) || undefined,
        dateIso: /^\d{4}-\d{2}-\d{2}$/.test(dateIso) ? dateIso : undefined,
        format: format === 'video' || format === 'audio' || format === 'document' ? format : undefined,
        speaker: asString(row.speaker) || undefined,
        views: typeof row.views === 'number' && row.views >= 0 ? Math.round(row.views) : undefined,
        comments: typeof row.comments === 'number' && row.comments >= 0 ? Math.round(row.comments) : undefined,
        archived,
        archivedAt,
      } satisfies CsirtVideo
    })
    .filter((item): item is CsirtVideo => Boolean(item))
  return items.length ? items : fallback
}

function sanitizeSocial(raw: unknown, fallback: CsirtSocialPlatform[]): CsirtSocialPlatform[] {
  const items = asArray<Record<string, unknown>>(raw)
    .map((row) => {
      const id = row.id
      if (id !== 'facebook' && id !== 'linkedin' && id !== 'tiktok') return null
      return {
        id,
        name: asString(row.name, id),
        handle: asString(row.handle),
        href: asString(row.href, '#'),
        followers: asString(row.followers, '0'),
        posts: asString(row.posts, '0'),
        tags: asArray<string>(row.tags).filter((tag) => typeof tag === 'string').slice(0, 6),
        description: asString(row.description),
        latest: asString(row.latest),
        latestAgo: asString(row.latestAgo),
        image: asString(row.image, '/csirt/hero-1.jpg'),
        theme: id,
      } satisfies CsirtSocialPlatform
    })
    .filter((item): item is CsirtSocialPlatform => Boolean(item))
  return items.length ? items : fallback
}

function sanitizeCards(raw: unknown, fallback: readonly CsirtMegaCard[]): CsirtMegaCard[] {
  const items = asArray<Record<string, unknown>>(raw)
    .map((row, index) => {
      const title = asString(row.title)
      const href = asString(row.href)
      if (!title || !href) return null
      return {
        title,
        description: asString(row.description),
        href,
        icon: (asString(row.icon, fallback[index]?.icon ?? 'actualites') as CsirtMegaCard['icon']),
        kicker: asString(row.kicker) || undefined,
        badge: asString(row.badge) || undefined,
      } satisfies CsirtMegaCard
    })
    .filter((item): item is CsirtMegaCard => Boolean(item))
  return items.length ? items : [...fallback]
}

function sanitizeNav(raw: unknown, fallback: CsirtNavItem[]): CsirtNavItem[] {
  const items = asArray<Record<string, unknown>>(raw)
    .map((row, index) => {
      const label = asString(row.label)
      const href = asString(row.href)
      if (!label || !href) return null
      const fallbackItem = fallback[index]
      const megaRaw = row.mega && typeof row.mega === 'object' ? (row.mega as Record<string, unknown>) : null
      const megaFallback = fallbackItem?.mega
      const item: CsirtNavItem = { label, href }
      if (megaRaw || megaFallback) {
        const featuredRaw =
          megaRaw?.featured && typeof megaRaw.featured === 'object'
            ? (megaRaw.featured as Record<string, unknown>)
            : null
        item.mega = {
          kicker: asString(megaRaw?.kicker, megaFallback?.kicker ?? 'Rubrique'),
          title: asString(megaRaw?.title, megaFallback?.title ?? label),
          description: asString(megaRaw?.description, megaFallback?.description ?? ''),
          featured: megaFallback?.featured
            ? {
                label: asString(featuredRaw?.label, megaFallback.featured.label),
                title: asString(featuredRaw?.title, megaFallback.featured.title),
                description: asString(featuredRaw?.description, megaFallback.featured.description),
              }
            : featuredRaw
              ? {
                  label: asString(featuredRaw.label, 'À la une'),
                  title: asString(featuredRaw.title),
                  description: asString(featuredRaw.description),
                }
              : undefined,
          cta: {
            label: asString(
              (megaRaw?.cta as Record<string, unknown> | undefined)?.label,
              megaFallback?.cta.label ?? 'Voir'
            ),
            href: asString(
              (megaRaw?.cta as Record<string, unknown> | undefined)?.href,
              megaFallback?.cta.href ?? href
            ),
          },
          sectionLabel: asString(megaRaw?.sectionLabel, megaFallback?.sectionLabel ?? 'Navigation rapide'),
          seeAllHref: asString(megaRaw?.seeAllHref, megaFallback?.seeAllHref ?? href),
          cards: sanitizeCards(megaRaw?.cards, megaFallback?.cards ?? []),
        }
      }
      return item
    })
    .filter((item): item is CsirtNavItem => Boolean(item))
  return items.length ? items : fallback
}

function sanitizeResponse(raw: unknown, fallback: SiteResponseSection): SiteResponseSection {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const pillars = asArray<Record<string, unknown>>(row.pillars)
    .map((item, index) => {
      const id = asString(item.id, fallback.pillars[index]?.id || `pillar-${index + 1}`)
      const title = asString(item.title, fallback.pillars[index]?.title || '')
      const href = asString(item.href, fallback.pillars[index]?.href || '/')
      if (!title || !href) return null
      return {
        id,
        index: asString(item.index, fallback.pillars[index]?.index || String(index + 1).padStart(2, '0')),
        title,
        body: asString(item.body, fallback.pillars[index]?.body || ''),
        href,
      } satisfies SiteResponsePillar
    })
    .filter((item): item is SiteResponsePillar => Boolean(item))

  return {
    kicker: asString(row.kicker, fallback.kicker),
    title: asString(row.title, fallback.title),
    lead: asString(row.lead, fallback.lead),
    statusLabel: asString(row.statusLabel, fallback.statusLabel),
    pillars: pillars.length ? pillars : fallback.pillars,
    ctaLabel: asString(row.ctaLabel, fallback.ctaLabel),
    ctaHref: asString(row.ctaHref, fallback.ctaHref),
    secondaryLabel: asString(row.secondaryLabel, fallback.secondaryLabel),
    secondaryHref: asString(row.secondaryHref, fallback.secondaryHref),
  }
}

function sanitizeVigilanceLane(raw: unknown, fallback: SiteVigilanceLane): SiteVigilanceLane {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    kicker: asString(row.kicker, fallback.kicker),
    title: asString(row.title, fallback.title),
    ctaLabel: asString(row.ctaLabel, fallback.ctaLabel),
    href: asString(row.href, fallback.href),
  }
}

function sanitizeVigilance(raw: unknown, fallback: SiteVigilanceSection): SiteVigilanceSection {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const assuranceRaw = asArray<unknown>(row.assurance)
    .map((item) => asString(item))
    .filter(Boolean)
  return {
    title: asString(row.title, fallback.title),
    statusLabel: asString(row.statusLabel, fallback.statusLabel),
    lead: asString(row.lead, fallback.lead),
    newsLane: sanitizeVigilanceLane(row.newsLane, fallback.newsLane),
    alertLane: sanitizeVigilanceLane(row.alertLane, fallback.alertLane),
    assurance: [
      assuranceRaw[0] ?? fallback.assurance[0],
      assuranceRaw[1] ?? fallback.assurance[1],
      assuranceRaw[2] ?? fallback.assurance[2],
    ],
  }
}

function sanitizeHome(raw: unknown, fallback: SiteHome): SiteHome {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const missionsRaw = row.missions && typeof row.missions === 'object' ? (row.missions as Record<string, unknown>) : {}
  const fieldRaw =
    row.fieldBanner && typeof row.fieldBanner === 'object' ? (row.fieldBanner as Record<string, unknown>) : {}
  const actionLinks = sanitizeActionLinks(row.actionLinks, fallback.actionLinks)

  return {
    searchEnabled: asBool(row.searchEnabled, fallback.searchEnabled),
    searchEyebrow: asString(row.searchEyebrow, fallback.searchEyebrow),
    searchTitle: asString(row.searchTitle, fallback.searchTitle),
    searchPlaceholder: asString(row.searchPlaceholder, fallback.searchPlaceholder),
    searchSubmitLabel: asString(row.searchSubmitLabel, fallback.searchSubmitLabel),
    searchSuggestionsLabel: asString(
      row.searchSuggestionsLabel,
      fallback.searchSuggestionsLabel
    ),
    searchSuggestions: sanitizeSearchSuggestions(
      row.searchSuggestions,
      fallback.searchSuggestions
    ),
    heroEnabled: asBool(row.heroEnabled, fallback.heroEnabled),
    heroAutoplayMs: clampHeroAutoplayMs(row.heroAutoplayMs, fallback.heroAutoplayMs ?? 7000),
    heroSlides: sanitizeHero(row.heroSlides, fallback.heroSlides),
    actionsEnabled: asBool(row.actionsEnabled, fallback.actionsEnabled),
    actionLinks,
    responseEnabled: asBool(row.responseEnabled, fallback.responseEnabled ?? true),
    response: sanitizeResponse(row.response, fallback.response),
    newsEnabled: asBool(row.newsEnabled, fallback.newsEnabled),
    mediaEnabled: asBool(row.mediaEnabled, fallback.mediaEnabled),
    mediaTitle: asString(row.mediaTitle, fallback.mediaTitle),
    mediaLead: asString(row.mediaLead, fallback.mediaLead),
    mediaYoutubeUrl: asString(row.mediaYoutubeUrl, fallback.mediaYoutubeUrl),
    signalementGuideVideoUrl: asString(row.signalementGuideVideoUrl, fallback.signalementGuideVideoUrl ?? ''),
    socialEnabled: asBool(row.socialEnabled, fallback.socialEnabled),
    missionsEnabled: asBool(row.missionsEnabled, fallback.missionsEnabled),
    missions: {
      title: asString(missionsRaw.title, fallback.missions.title),
      body: asString(missionsRaw.body, fallback.missions.body),
      ctaLabel: asString(missionsRaw.ctaLabel, fallback.missions.ctaLabel),
      ctaHref: asString(missionsRaw.ctaHref, fallback.missions.ctaHref),
    },
    fieldEnabled: asBool(row.fieldEnabled, fallback.fieldEnabled),
    fieldBanner: {
      src: asString(fieldRaw.src, fallback.fieldBanner.src),
      alt: asString(fieldRaw.alt, fallback.fieldBanner.alt),
    },
    vigilance: sanitizeVigilance(row.vigilance, fallback.vigilance),
  }
}

function sanitizePages(raw: unknown, fallback: SitePage[]): SitePage[] {
  const byPath = new Map(fallback.map((page) => [page.path, page]))
  const items = asArray<Record<string, unknown>>(raw)
    .map((row) => {
      const path = asString(row.path)
      if (!path.startsWith('/')) return null
      const base = byPath.get(path)
      const group = PAGE_GROUPS.has(row.group as SitePageGroup)
        ? (row.group as SitePageGroup)
        : base?.group ?? 'Services'
      const extraLinks = asArray<unknown>(row.extraLinks)
        .map((item) => sanitizeLink(item))
        .filter((item): item is SiteLink => Boolean(item))
      const extensionsRaw =
        row.extensions && typeof row.extensions === 'object'
          ? (row.extensions as Record<string, unknown>)
          : null
      const documents = sanitizeDocuments(row.documents)
      const layoutRaw = asString(extensionsRaw?.layout, base?.extensions?.layout ?? 'article')
      const layout = layoutRaw === 'videos' || layoutRaw === 'resources' ? layoutRaw : 'article'
      const videoIds = asArray<unknown>(extensionsRaw?.videoIds ?? base?.extensions?.videoIds)
        .map((value) => asString(value).trim())
        .filter(Boolean)
      const documentsEnabled =
        layout === 'resources' ||
        asBool(
          extensionsRaw?.documents,
          Boolean(base?.extensions?.documents) || documents.length > 0
        )
      const discover =
        path === '/csirt-arpt'
          ? sanitizeDiscoverContent(
              extensionsRaw?.discover,
              base?.extensions?.discover ?? DEFAULT_DISCOVER_CONTENT
            )
          : undefined
      const about =
        path === '/csirt-arpt'
          ? sanitizeAboutContent(
              extensionsRaw?.about,
              base?.extensions?.about ?? DEFAULT_ABOUT_CONTENT
            )
          : undefined
      const sitemap =
        path === '/plan-du-site'
          ? sanitizeSitemapContent(
              extensionsRaw?.sitemap,
              base?.extensions?.sitemap ?? DEFAULT_SITEMAP_CONTENT
            )
          : undefined
      const mentions =
        path === '/mentions-legales'
          ? sanitizeMentionsContent(
              extensionsRaw?.mentions,
              base?.extensions?.mentions ?? DEFAULT_MENTIONS_CONTENT
            )
          : undefined
      const privacy =
        path === '/confidentialite'
          ? sanitizePrivacyContent(
              extensionsRaw?.privacy,
              base?.extensions?.privacy ?? DEFAULT_PRIVACY_CONTENT
            )
          : undefined
      const a11y =
        path === '/accessibilite'
          ? sanitizeA11yContent(
              extensionsRaw?.a11y,
              base?.extensions?.a11y ?? DEFAULT_A11Y_CONTENT
            )
          : undefined
      const archived = asBool(row.archived, false)
      const archivedAt = archived ? asString(row.archivedAt) || null : null
      if (archived && isExpiredTrash(archivedAt)) return null
      const createdAt =
        asString(row.createdAt) ||
        asString(base?.createdAt) ||
        null
      const bodyRaw = asString(row.body)
      const leadRaw = asString(row.lead, base?.lead ?? '')
      const isLegalPath =
        path === '/mentions-legales' ||
        path === '/confidentialite' ||
        path === '/accessibilite'
      const lead =
        isLegalPath && LEGAL_PLACEHOLDER_LEADS.has(leadRaw.trim())
          ? base?.lead ?? leadRaw
          : leadRaw
      const bodyCandidate = bodyRaw.trim() ? bodyRaw : base?.body ?? ''
      const body =
        isLegalPath && isLegalTipTapSeedBody(bodyCandidate) ? '' : bodyCandidate
      return {
        path,
        title: asString(row.title, base?.title ?? path),
        lead,
        body,
        group,
        published: archived ? false : asBool(row.published, base?.published ?? true),
        createdAt,
        featuredImage: asString(row.featuredImage, base?.featuredImage ?? '') || undefined,
        extensions: {
          documents: documentsEnabled,
          layout,
          ...(videoIds.length ? { videoIds } : {}),
          ...(discover ? { discover } : {}),
          ...(about ? { about } : {}),
          ...(sitemap ? { sitemap } : {}),
          ...(mentions ? { mentions } : {}),
          ...(privacy ? { privacy } : {}),
          ...(a11y ? { a11y } : {}),
        },
        documents: documents.length ? documents : base?.documents,
        extraLinks: extraLinks.length ? extraLinks : base?.extraLinks,
        archived,
        archivedAt,
      } satisfies SitePage
    })
    .filter((item): item is SitePage => Boolean(item))

  if (!items.length) return fallback

  const seen = new Set(items.map((page) => page.path))
  for (const page of fallback) {
    if (!seen.has(page.path)) items.push(page)
  }
  return items
}

function sanitizeFooter(raw: unknown, fallback: SiteFooter): SiteFooter {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const columns = asArray<Record<string, unknown>>(row.columns)
    .map((col, index) => {
      const id = asString(col.id, `col-${index + 1}`)
      return {
        id,
        title: asString(col.title, fallback.columns[index]?.title ?? 'Rubrique'),
        links: sanitizeFooterLinks(
          col.links,
          fallback.columns[index]?.links ?? [],
          `${id}-link`
        ),
      }
    })
    .filter((col) => col.title)

  const legacySignalementCta =
    asString(row.ctaHref) === '/signalement' ||
    asString(row.ctaTitle).toLowerCase().includes('signalement') ||
    asString(row.ctaLabel).toLowerCase().includes('signaler')

  return {
    ctaTitle: legacySignalementCta
      ? fallback.ctaTitle
      : asString(row.ctaTitle, fallback.ctaTitle),
    ctaLead: legacySignalementCta
      ? fallback.ctaLead
      : asString(row.ctaLead, fallback.ctaLead),
    ctaLabel: legacySignalementCta
      ? fallback.ctaLabel
      : asString(row.ctaLabel, fallback.ctaLabel),
    ctaHref: legacySignalementCta
      ? fallback.ctaHref
      : asString(row.ctaHref, fallback.ctaHref),
    brandText: asString(row.brandText, fallback.brandText),
    twitterHref: asString(row.twitterHref, fallback.twitterHref),
    columns: columns.length ? columns : fallback.columns,
    legal: sanitizeFooterLinks(row.legal, fallback.legal, 'legal'),
  }
}

export function mergeSiteContent(raw: unknown): SiteContent {
  const defaults = createDefaultSiteContent()
  const cleaned = scrubCmsUploadUrls(raw)
  const row = cleaned && typeof cleaned === 'object' ? (cleaned as Record<string, unknown>) : {}
  const ticker = asArray<string>(row.ticker)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12)

  const fallbackNav = menusToNavItems(defaults.menus)
  const hasMenus = Array.isArray(row.menus) && row.menus.length > 0
  const menus = hasMenus
    ? sanitizeMenus(row.menus, fallbackNav)
    : Array.isArray(row.nav) && row.nav.length > 0
      ? sanitizeMenus(navItemsToMenus(sanitizeNav(row.nav, fallbackNav)), fallbackNav)
      : defaults.menus

  const newsTopics = sanitizeNewsTopics(row.newsTopics)

  return {
    updatedAt: asString(row.updatedAt) || null,
    ticker: ticker.length ? ticker : defaults.ticker,
    menus,
    home: sanitizeHome(row.home, defaults.home),
    news: sanitizeNews(row.news, defaults.news, newsTopics),
    newsTopics,
    newsSources: sanitizeNewsSources(row.newsSources, newsTopics),
    newsCollected: sanitizeNewsCollected(row.newsCollected, newsTopics),
    videos: sanitizeVideos(row.videos, defaults.videos),
    social: sanitizeSocial(row.social, defaults.social),
    pages: sanitizePages(row.pages, defaults.pages),
    footer: sanitizeFooter(row.footer, defaults.footer),
  }
}

export function findSitePage(site: SiteContent, path: string): SitePage | undefined {
  const normalized = (path.startsWith('/') ? path : `/${path}`).replace(/\/+$/, '') || '/'
  return site.pages.find((page) => {
    const pagePath = page.path.replace(/\/+$/, '') || '/'
    return pagePath === normalized
  })
}
