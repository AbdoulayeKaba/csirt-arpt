import { formatSiteNewsDates, newSiteId } from '@/lib/site/ids'
import { isInvalidOrBlackCyberImage, resolveCyberNewsImage } from '@/lib/site/news-images'
import {
  isAlertNewsCategory,
  isArchivedFlag,
  type SiteNewsCollectedItem,
  type SiteNewsSource,
} from '@/lib/site/news-sources'
import { listDueNewsSources } from '@/lib/site/news-sync-schedule'
import { decodeHtmlEntities, newsTeaserText, cleanTeaserText } from '@/lib/site/news-text'
import type { SiteContent } from '@/lib/site/types'
import type { CsirtNewsItem } from '@/lib/csirt/home-content'

function coverForNews(
  title: string | undefined,
  category: string | undefined,
  image?: string | null
) {
  if (isAlertNewsCategory(category || '')) return undefined
  return resolveCyberNewsImage(title, category, image)
}

export type ScrapedDraft = {
  title: string
  excerpt: string
  url: string
  date: string
  image?: string
  bodyHtml?: string
  author?: string
}

export { decodeHtmlEntities, newsTeaserText, cleanTeaserText, isJunkTeaserText } from '@/lib/site/news-text'

function decodeXmlEntities(value: string) {
  return decodeHtmlEntities(value)
}

function absoluteUrl(href: string, base: string) {
  try {
    return new URL(href, base).toString()
  } catch {
    return ''
  }
}

function isDecorativeSiteAsset(url: string) {
  if (isInvalidOrBlackCyberImage(url)) return true
  return /logo_rf|print\.svg|json_icon|icon_toppage|mastodon|twitter|bluesky|favicon|sprite|\/static\/images\/(?:logo|icon)|Logo-Guinee|logo[-_]?arpt|logo[-_]?site/i.test(
    url
  )
}

function firstImageUrl(html: string, baseUrl: string) {
  const patterns = [
    /<media:content[^>]+url=["']([^"']+)["']/i,
    /<media:thumbnail[^>]+url=["']([^"']+)["']/i,
    /<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image\//i,
    /<enclosure[^>]+type=["']image\/[^"']*["'][^>]+url=["']([^"']+)["']/i,
    /og:image["']\s+content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<img\b[^>]+src=["']([^"']+)["']/gi,
  ]
  for (const re of patterns) {
    if (re.global) {
      let match: RegExpExecArray | null
      while ((match = re.exec(html))) {
        const raw = match[1]?.trim()
        if (!raw || raw.startsWith('data:')) continue
        const abs = absoluteUrl(raw, baseUrl)
        if (abs && /^https?:\/\//i.test(abs) && !isDecorativeSiteAsset(abs)) return abs
      }
      continue
    }
    const match = html.match(re)
    const raw = match?.[1]?.trim()
    if (!raw) continue
    if (raw.startsWith('data:')) continue
    const abs = absoluteUrl(raw, baseUrl)
    if (abs && /^https?:\/\//i.test(abs) && !isDecorativeSiteAsset(abs)) return abs
  }
  return ''
}

function pickTag(block: string, names: string[]) {
  for (const name of names) {
    const re = new RegExp(
      `<${name}[^>]*>([\\s\\S]*?)<\\/${name}>|<${name}[^>]*href=["']([^"']+)["'][^>]*\\/?>`,
      'i'
    )
    const match = block.match(re)
    if (!match) continue
    const raw = match[1] ?? match[2] ?? ''
    const cleaned = decodeXmlEntities(raw)
    if (cleaned) return cleaned
  }
  return ''
}

const FR_MONTH_INDEX: Record<string, number> = {
  janvier: 1,
  fevrier: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  aout: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  decembre: 12,
}

function normalizeFrenchMonthToken(token: string) {
  return token
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
}

export function normalizePublicationDate(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const frMatch = trimmed.match(/(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})/)
  if (frMatch) {
    const month = FR_MONTH_INDEX[normalizeFrenchMonthToken(frMatch[2] ?? '')]
    if (month) {
      const day = frMatch[1].padStart(2, '0')
      const monthStr = String(month).padStart(2, '0')
      return `${frMatch[3]}-${monthStr}-${day}`
    }
  }

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

export function extractPublicationDate(html: string): string | undefined {
  const scoped = html.match(/<article\b[\s\S]*?<\/article>/i)?.[0] ?? html

  const entryMeta = scoped.match(
    /<ul[^>]*\bentry-meta\b[^>]*>[\s\S]*?<li[^>]*\bitem-date\b[^>]*>([\s\S]*?)<\/li>/i
  )?.[1]
  if (entryMeta) {
    const iso = normalizePublicationDate(stripInlineHtmlText(entryMeta))
    if (iso) return iso
  }

  const metaPatterns = [
    /property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*property=["']article:published_time["']/i,
    /property=["']og:published_time["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*property=["']og:published_time["']/i,
    /name=["']date["'][^>]*content=["']([^"']+)["']/i,
    /"datePublished"\s*:\s*"([^"]+)"/i,
  ]
  for (const re of metaPatterns) {
    const match = html.match(re)
    const iso = match?.[1] ? normalizePublicationDate(match[1]) : null
    if (iso) return iso
  }

  for (const match of scoped.matchAll(/<time\b[^>]*datetime=["']([^"']+)["'][^>]*>([\s\S]*?)<\/time>/gi)) {
    const iso =
      normalizePublicationDate(match[1] || '') ||
      normalizePublicationDate(stripInlineHtmlText(match[2] || ''))
    if (iso) return iso
  }

  const itemDate = scoped.match(/<li[^>]*\bitem-date\b[^>]*>([\s\S]*?)<\/li>/i)?.[1]
  if (itemDate) {
    const iso = normalizePublicationDate(stripInlineHtmlText(itemDate))
    if (iso) return iso
  }

  const visibleDate = scoped.match(
    /class=["'][^"']*(?:entry-date|post-date|published|date)[^"']*["'][^>]*>([\s\S]*?)<\//i
  )?.[1]
  if (visibleDate) {
    const iso = normalizePublicationDate(stripInlineHtmlText(visibleDate))
    if (iso) return iso
  }

  const frMatch = scoped.match(
    /(\d{1,2}\s+(?:janvier|f[eé]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[eé]cembre)\s+\d{4})/i
  )
  if (frMatch?.[1]) {
    const iso = normalizePublicationDate(frMatch[1])
    if (iso) return iso
  }

  return undefined
}

function stripInlineHtmlText(value: string) {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
}

function parseRss(xml: string, baseUrl: string): ScrapedDraft[] {
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) ?? []
  return blocks.slice(0, 25).flatMap((block) => {
    const title = pickTag(block, ['title'])
    const link = pickTag(block, ['link', 'id', 'guid'])
    const url = absoluteUrl(link, baseUrl)
    if (!title || !url) return []
    const excerpt = pickTag(block, ['description', 'summary', 'content', 'content:encoded'])
    const image = firstImageUrl(block, baseUrl) || undefined
    const dateRaw =
      pickTag(block, ['pubDate', 'published', 'dc:date']) || pickTag(block, ['updated'])
    const parsed = dateRaw ? new Date(dateRaw) : new Date()
    const date = Number.isNaN(parsed.getTime())
      ? new Date().toISOString().slice(0, 10)
      : parsed.toISOString().slice(0, 10)
    return [
      {
        title: title.slice(0, 220),
        excerpt: excerpt.slice(0, 480),
        url,
        date,
        image,
      },
    ]
  })
}

function excerptNearAnchor(html: string, anchorIndex: number, title: string) {
  const start = Math.max(0, anchorIndex - 200)
  const end = Math.min(html.length, anchorIndex + 900)
  const window = html.slice(start, end)
  // Préférer un vrai paragraphe à proximité
  const paragraphs = [...window.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => cleanTeaserText(m[1] || '', 320))
    .filter(Boolean)
  if (paragraphs[0]) return paragraphs[0].slice(0, 280)

  // Sinon : retirer images / srcset avant décodage
  const withoutMedia = window
    .replace(/<img\b[^>]*>/gi, ' ')
    .replace(/\bsrcset=["'][^"']*["']/gi, ' ')
    .replace(/\bsizes=["'][^"']*["']/gi, ' ')
    .replace(/\bsrc=["'][^"']*["']/gi, ' ')
  let cleaned = cleanTeaserText(withoutMedia, 320)
  if (!cleaned) return ''
  if (title && cleaned.toLowerCase().includes(title.toLowerCase())) {
    cleaned = cleaned.replace(new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), ' ')
    cleaned = cleanTeaserText(cleaned, 280)
  }
  return cleaned.slice(0, 280)
}

const HTML_NAV_PATH_RE =
  /\/(presentation|directions|appel-doffres|offre-demplois|contact|category\/|tag\/|feed\/?$|wp-|xmlrpc|lois-et|decrets|arretes|decisions|observatoire|rapports-annuels|liste-des|produits-et|gestion-des|controle-qualite|operateurs|radiocommunication|les-valeurs|mentions-legales|politique-de|cookies?)/i

function isLikelyArticleHref(url: string, title: string) {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname.replace(/\/+$/, '') || '/'
    if (path === '/' || path.length < 2) return false
    if (HTML_NAV_PATH_RE.test(path)) return false
    if (/[?&]p=\d+/i.test(url)) return true
    const slug = path.split('/').filter(Boolean).pop() || ''
    const hyphens = (slug.match(/-/g) || []).length
    if (hyphens >= 3 && slug.length >= 28) return true
    if (hyphens >= 2 && title.length >= 36) return true
    if (/\/(actualit|avis|alerte|communique|article|nouvelle|presse|blog)\b/i.test(path) && hyphens >= 1) {
      return true
    }
    return false
  } catch {
    return false
  }
}

function parseHtml(html: string, baseUrl: string): ScrapedDraft[] {
  const seen = new Set<string>()
  const drafts: ScrapedDraft[] = []
  const loose: ScrapedDraft[] = []
  const pageImage = firstImageUrl(html, baseUrl)
  const re = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(html)) && drafts.length + loose.length < 40) {
    const href = match[1]?.trim() ?? ''
    if (!href || href.startsWith('javascript:') || href.startsWith('mailto:')) continue
    const url = absoluteUrl(href, baseUrl)
    if (!url || seen.has(url)) continue
    const title = decodeXmlEntities(match[2] ?? '').slice(0, 220)
    if (title.length < 12) continue
    if (/^(accueil|home|menu|connexion|login|cookie|lire la suite|en savoir plus)/i.test(title)) {
      continue
    }
    seen.add(url)
    const blockStart = Math.max(0, match.index - 400)
    const block = html.slice(blockStart, match.index + match[0].length + 500)
    const localImage = firstImageUrl(block, baseUrl) || pageImage || undefined
    const excerpt = excerptNearAnchor(html, match.index, title)
    const draft: ScrapedDraft = {
      title,
      excerpt,
      url,
      date: new Date().toISOString().slice(0, 10),
      image: localImage,
    }
    if (isLikelyArticleHref(url, title)) drafts.push(draft)
    else loose.push(draft)
  }
  const picked = (drafts.length >= 3 ? drafts : [...drafts, ...loose]).slice(0, 20)
  return picked
}

function parseJsonFeed(payload: unknown, baseUrl: string): ScrapedDraft[] {
  if (!payload || typeof payload !== 'object') return []
  const root = payload as Record<string, unknown>
  const list = Array.isArray(root.items)
    ? root.items
    : Array.isArray(root.data)
      ? root.data
      : Array.isArray(root.results)
        ? root.results
        : []
  return list.slice(0, 25).flatMap((row) => {
    if (!row || typeof row !== 'object') return []
    const item = row as Record<string, unknown>
    const title = String(item.title ?? item.name ?? '').trim()
    const link = String(item.url ?? item.link ?? item.href ?? '').trim()
    const url = absoluteUrl(link, baseUrl)
    if (!title || !url) return []
    const excerpt = String(item.excerpt ?? item.summary ?? item.description ?? '').trim()
    const imageRaw = String(
      item.image ?? item.image_url ?? item.imageUrl ?? item.thumbnail ?? item.cover ?? ''
    ).trim()
    const image = imageRaw ? absoluteUrl(imageRaw, baseUrl) || undefined : undefined
    const dateRaw = String(item.date ?? item.published_at ?? item.publishedAt ?? '')
    const parsed = dateRaw ? new Date(dateRaw) : new Date()
    const date = Number.isNaN(parsed.getTime())
      ? new Date().toISOString().slice(0, 10)
      : parsed.toISOString().slice(0, 10)
    return [
      {
        title: title.slice(0, 220),
        excerpt: excerpt.slice(0, 480),
        url,
        date,
        image,
      },
    ]
  })
}

async function fetchSource(source: SiteNewsSource): Promise<ScrapedDraft[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20_000)
  try {
    const res = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'CSIRT-ARPT-Site-Scraper/1.0',
        accept: 'application/rss+xml, application/atom+xml, application/json, text/html, */*',
      },
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const contentType = res.headers.get('content-type')?.toLowerCase() ?? ''
    const body = await res.text()

    let drafts: ScrapedDraft[] = []
    if (source.type === 'api' || contentType.includes('json')) {
      try {
        drafts = parseJsonFeed(JSON.parse(body), source.url)
      } catch {
        drafts = []
      }
    } else if (
      source.type === 'rss' ||
      contentType.includes('xml') ||
      contentType.includes('rss') ||
      contentType.includes('atom') ||
      /<(rss|feed)\b/i.test(body)
    ) {
      drafts = parseRss(body, source.url)
    } else {
      drafts = parseHtml(body, source.url)
    }

    // Métadonnées (extrait / image) uniquement — le corps HTML est chargé à la demande
    // sur la page détail pour éviter un payload trop lourd (échec MySQL).
    const enriched: ScrapedDraft[] = []
    for (let i = 0; i < drafts.length; i++) {
      const draft = drafts[i]
      if (i < 25) {
        const detail = await enrichDraftFromArticle(draft)
        enriched.push({
          ...detail,
          bodyHtml: undefined,
        })
      } else {
        enriched.push(draft)
      }
    }
    return enriched
  } finally {
    clearTimeout(timer)
  }
}

function stripUnwantedBlocks(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
}

/** CERT-FR / ANSSI : conserver meta + contenu + pied de document (tables, listes CVE…). */
function extractCertFrArticle(html: string) {
  const articleMatch = html.match(
    /<article\b[^>]*class=["'][^"']*\barticle\b[^"']*["'][^>]*>([\s\S]*?)<\/article>/i
  )
  if (!articleMatch?.[1] || articleMatch[1].length < 200) return null
  let inner = articleMatch[1]
  // Retirer barre Imprimer / JSON (hors contenu officiel)
  const docStart = inner.search(
    /<div[^>]+class=["'][^"']*(?:meta-logo|meta-certfr|meta-title|meta-document)[^"']*["']/i
  )
  if (docStart > 0) inner = inner.slice(docStart)
  return inner
}

function extractMainContent(html: string) {
  const certFr = extractCertFrArticle(html)
  if (certFr) return certFr

  const articleContent = html.match(
    /<section\b[^>]*class=["'][^"']*article-content[^"']*["'][^>]*>([\s\S]*?)<\/section>/i
  )
  if (articleContent?.[1] && articleContent[1].length > 120) {
    return articleContent[1]
  }

  const entryStart = html.search(
    /<div[^>]+class=["'][^"']*entry-content[^"']*["'][^>]*>/i
  )
  if (entryStart >= 0) {
    const after = html.slice(entryStart)
    const cut = after.search(
      /<(?:div[^>]+class=["'][^"']*(?:post-share|entry-footer|post-footer|nav-links|sharedaddy)|\/article\b)/i
    )
    const chunk = cut > 80 ? after.slice(0, cut) : after.slice(0, 120_000)
    if (chunk.length > 120) return chunk
  }

  const patterns = [
    /<article\b[^>]*>([\s\S]*?)<\/article>/i,
    /<main\b[^>]*>([\s\S]*?)<\/main>/i,
  ]
  for (const re of patterns) {
    const match = html.match(re)
    if (match?.[1] && match[1].length > 120) return match[1]
  }
  return html
}

const ARTICLE_ALLOWED_TAGS = new Set([
  'p',
  'br',
  'hr',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'dl',
  'dt',
  'dd',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'caption',
  'a',
  'strong',
  'em',
  'b',
  'i',
  'u',
  'code',
  'pre',
  'blockquote',
  'figure',
  'figcaption',
  'img',
  'span',
  'div',
  'section',
])

const CERTFR_LAYOUT_CLASSES = new Set([
  'meta-logo',
  'meta-certfr',
  'meta-gauche',
  'meta-droite',
  'meta-affaire',
  'meta-title',
  'meta-document',
  'meta-post-type',
  'meta-table',
  'article-meta',
  'article-content',
  'article-footer',
  'premier-ministre',
  'logo-rf',
  'post-type-title',
  'cert-avis',
  'table',
  'table-condensed',
  'row',
  'col-md-12',
  'col-md-8',
  'col-md-4',
  'col-md-offset-2',
  'col-md-offset-4',
  'col-xs-4',
  'col-xs-8',
])

function pickLayoutClasses(attrs: string) {
  const raw = attrs.match(/\bclass=["']([^"']+)["']/i)?.[1]
  if (!raw) return ''
  const kept = raw
    .split(/\s+/)
    .map((c) => c.trim())
    .filter((c) => CERTFR_LAYOUT_CLASSES.has(c))
  return kept.length ? ` class="${kept.join(' ')}"` : ''
}

function sanitizeTagAttributes(tag: string, attrs: string, baseUrl: string) {
  const name = tag.toLowerCase()
  const keep: string[] = []
  const layoutClass = pickLayoutClasses(attrs)
  if (layoutClass) keep.push(layoutClass.trim())

  if (name === 'a') {
    const href = attrs.match(/\bhref=["']([^"']+)["']/i)?.[1]
    if (href && !/^javascript:/i.test(href)) {
      const abs = absoluteUrl(href, baseUrl) || href
      keep.push(`href="${abs}"`)
      if (/^https?:\/\//i.test(abs) && !abs.includes('arpt.gov.gn')) {
        keep.push('target="_blank"', 'rel="noopener noreferrer"')
      }
    }
  }

  if (name === 'img') {
    const src = attrs.match(/\bsrc=["']([^"']+)["']/i)?.[1]
    if (!src || src.startsWith('data:')) return null
    const abs = absoluteUrl(src, baseUrl)
    if (!abs || !/^https?:\/\//i.test(abs)) return null
    // Exclure logos / icônes UI CERT-FR (dont le drapeau RF)
    if (
      /logo_rf|print\.svg|json_icon|icon_toppage|mastodon|twitter|bluesky|favicon/i.test(
        abs
      )
    ) {
      return null
    }
    keep.push(`src="${abs}"`)
    const alt = attrs.match(/\balt=["']([^"']*)["']/i)?.[1]
    keep.push(`alt="${alt ?? ''}"`)
  }

  if ((name === 'td' || name === 'th') && /\bcolspan=["'](\d+)["']/i.test(attrs)) {
    const colspan = attrs.match(/\bcolspan=["'](\d+)["']/i)?.[1]
    if (colspan) keep.push(`colspan="${colspan}"`)
  }

  return keep.length ? ` ${keep.join(' ')}` : ''
}

/** CERT-FR : rattache les liens orphelins aux <li> et nettoie le bruit de structure. */
function normalizeOfficialBodyHtml(html: string) {
  let out = html
  // Pas de drapeau / logo République Française dans le relais CSIRT-ARPT
  out = out.replace(/<img\b[^>]*src=["'][^"']*logo_rf[^"']*["'][^>]*>/gi, '')
  out = out.replace(
    /<img\b[^>]*alt=["'][^"']*République Française[^"']*["'][^>]*>/gi,
    ''
  )
  out = out.replace(
    /<div\b[^>]*class=["'][^"']*\bpremier-ministre\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
    ''
  )
  out = out.replace(
    /<div\b[^>]*class=["'][^"']*\bmeta-logo\b[^"']*["'][^>]*>\s*<\/div>/gi,
    ''
  )
  // Markup source : </li><a>...</a> → lien dans le <li>
  out = out.replace(
    /<\/li>\s*(<a\b[^>]*>[\s\S]*?<\/a>)/gi,
    '<span class="certfr-doc-link">$1</span></li>'
  )
  // Retirer wrappers vides inutiles (div/section sans attribut ni contenu utile répété)
  for (let i = 0; i < 4; i++) {
    out = out.replace(/<(div|section)(\s[^>]*)?>\s*<\/\1>/gi, '')
  }
  // Espaces excessifs entre balises
  out = out.replace(/>\s{2,}</g, '>\n<')
  return out.trim()
}

/**
 * Conserve la structure officielle (tableaux CERT-FR, titres, listes, liens)
 * sans scripts / boutons / classes de mise en page parasites.
 */
function sanitizeArticleHtml(raw: string, baseUrl: string, options?: { official?: boolean }) {
  let html = stripUnwantedBlocks(raw)
  html = html
    .replace(/\r\n?/g, '\n')
    .replace(/<button\b[^>]*>[\s\S]*?<\/button>/gi, '')
    .replace(/<\/?(?:iframe|form|svg|path|object|embed|input|select|textarea)[^>]*>/gi, '')
    .replace(/\son\w+=["'][^"']*["']/gi, '')

  html = html.replace(/<\/?([a-z0-9]+)(\s[^>]*)?>/gi, (full, tag: string, attrPart = '') => {
    const name = tag.toLowerCase()
    const isClose = full.startsWith('</')
    if (!ARTICLE_ALLOWED_TAGS.has(name)) return ''
    if (isClose) return `</${name}>`
    if (full.endsWith('/>') || name === 'br' || name === 'hr' || name === 'img') {
      if (name === 'br' || name === 'hr') return `<${name}>`
      const attrs = sanitizeTagAttributes(name, attrPart, baseUrl)
      if (attrs === null) return ''
      return `<${name}${attrs}>`
    }
    const attrs = sanitizeTagAttributes(name, attrPart, baseUrl)
    if (attrs === null) return ''
    return `<${name}${attrs}>`
  })

  html = html.replace(/\n{3,}/g, '\n\n').trim()
  if (options?.official || /cert\.ssi\.gouv\.fr/i.test(baseUrl)) {
    html = normalizeOfficialBodyHtml(html)
  }
  return html.slice(0, 500_000)
}

function extractAuthor(html: string) {
  const affaire = html.match(/Affaire\s+suivie\s+par\s*:\s*([^<\n]+)/i)?.[1]
  if (affaire) return decodeHtmlEntities(affaire).trim().slice(0, 120)

  const patterns = [
    /rel=["']author["'][^>]*>([^<]+)</i,
    /class=["'][^"']*author[^"']*["'][^>]*>([^<]+)</i,
    /Direction\s+Communication/i,
  ]
  for (const re of patterns) {
    const match = html.match(re)
    if (!match) continue
    if (match[1]) return decodeHtmlEntities(match[1]).slice(0, 120)
    if (re.source.includes('Direction')) return 'Direction Communication'
  }
  return ''
}

/** Corps trop partiel (ancien sanitize) par rapport à un avis CERT-FR. */
export function isIncompleteOfficialBody(bodyHtml: string | undefined, pageUrl?: string) {
  if (!bodyHtml?.trim()) return true
  if (!pageUrl || !/cert\.ssi\.gouv\.fr/i.test(pageUrl)) return false
  return !/<table[\s>]/i.test(bodyHtml) || !/Gestion du document/i.test(bodyHtml)
}

export function parseArticlePage(html: string, pageUrl: string) {
  const cleaned = stripUnwantedBlocks(html)
  const main = extractMainContent(cleaned)
  const official = /cert\.ssi\.gouv\.fr/i.test(pageUrl)
  const bodyHtml = sanitizeArticleHtml(main, pageUrl, { official })
  const image =
    firstImageUrl(cleaned, pageUrl) || firstImageUrl(main, pageUrl) || undefined
  const author = extractAuthor(cleaned) || extractAuthor(main) || undefined
  const metaExcerpt = cleanTeaserText(
    cleaned.match(/property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1] ??
      cleaned.match(/content=["']([^"']+)["'][^>]*property=["']og:description["']/i)?.[1] ??
      cleaned.match(/name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1] ??
      cleaned.match(/content=["']([^"']+)["'][^>]*name=["']description["']/i)?.[1] ??
      '',
    480
  )

  // CERT-FR : privilégier le paragraphe « Résumé »
  const resumeBlock = main.match(
    /<h2[^>]*>\s*Résumé\s*<\/h2>\s*(?:<[^>]+>\s*)*<p\b[^>]*>([\s\S]*?)<\/p>/i
  )?.[1]
  const paragraphCandidates = [
    resumeBlock,
    ...[...main.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => m[1]),
  ]
  let paragraphExcerpt = ''
  for (const raw of paragraphCandidates) {
    const candidate = cleanTeaserText(raw || '', 480)
    if (candidate) {
      paragraphExcerpt = candidate
      break
    }
  }
  const excerptFromP = metaExcerpt || paragraphExcerpt || undefined
  const title =
    decodeHtmlEntities(
      cleaned.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ??
        cleaned.match(/property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1] ??
        cleaned.match(/content=["']([^"']+)["'][^>]*property=["']og:title["']/i)?.[1] ??
        ''
    )
      .replace(/^Objet\s*:\s*/i, '')
      .slice(0, 220) || undefined
  const date = extractPublicationDate(main) || extractPublicationDate(cleaned)

  return { title, excerpt: excerptFromP, image, author, bodyHtml: bodyHtml || undefined, date }
}

export async function fetchArticleDetail(pageUrl: string) {
  if (!/^https?:\/\//i.test(pageUrl)) return null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15_000)
  try {
    const res = await fetch(pageUrl, {
      signal: controller.signal,
      headers: {
        'user-agent': 'CSIRT-ARPT-Site-Scraper/1.0',
        accept: 'text/html,application/xhtml+xml',
      },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const html = await res.text()
    return parseArticlePage(html, pageUrl)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function enrichDraftFromArticle(draft: ScrapedDraft): Promise<ScrapedDraft> {
  if (!draft.url.startsWith('http')) return draft
  const detail = await fetchArticleDetail(draft.url)
  if (!detail) {
    return {
      ...draft,
      excerpt: cleanTeaserText(draft.excerpt || '', 480),
      image:
        draft.image && !isDecorativeSiteAsset(draft.image) ? draft.image : undefined,
      bodyHtml: undefined,
    }
  }
  const excerpt =
    cleanTeaserText(detail.excerpt || '', 480) ||
    cleanTeaserText(draft.excerpt || '', 480)
  const image =
    (detail.image && !isDecorativeSiteAsset(detail.image) ? detail.image : undefined) ||
    (draft.image && !isDecorativeSiteAsset(draft.image) ? draft.image : undefined)
  return {
    ...draft,
    title: draft.title || detail.title || draft.title,
    excerpt,
    image,
    bodyHtml: undefined,
    author: detail.author || draft.author,
    date: detail.date || draft.date,
  }
}

export type ScrapeResult = {
  site: SiteContent
  added: number
  updatedSources: number
  errors: { sourceId: string; sourceName: string; message: string }[]
}

export type ScheduledScrapeResult = ScrapeResult & {
  dueCount: number
  skippedCount: number
  dueSourceIds: string[]
}

export async function runScheduledNewsScrape(site: SiteContent): Promise<ScheduledScrapeResult> {
  const due = listDueNewsSources(site.newsSources)
  const activeCount = site.newsSources.filter(
    (source) => source.enabled && !isArchivedFlag(source)
  ).length

  if (due.length === 0) {
    return {
      site,
      added: 0,
      updatedSources: 0,
      errors: [],
      dueCount: 0,
      skippedCount: activeCount,
      dueSourceIds: [],
    }
  }

  const result = await runNewsScrape(site, { sourceIds: due.map((source) => source.id) })
  return {
    ...result,
    dueCount: due.length,
    skippedCount: Math.max(0, activeCount - due.length),
    dueSourceIds: due.map((source) => source.id),
  }
}

async function refreshCollectedPublicationDates(
  items: readonly SiteNewsCollectedItem[],
  sourceId: string,
  limit = 50
): Promise<{ items: SiteNewsCollectedItem[]; updated: number }> {
  let updated = 0
  let next = [...items]
  const targets = items.filter(
    (item) =>
      item.sourceId === sourceId &&
      !isArchivedFlag(item) &&
      item.url.startsWith('http')
  )

  for (const item of targets.slice(0, limit)) {
    const detail = await fetchArticleDetail(item.url)
    if (!detail?.date || detail.date === item.date) continue
    next = next.map((row) => (row.id === item.id ? { ...row, date: detail.date! } : row))
    updated += 1
  }

  return { items: next, updated }
}

export async function refreshAllCollectedPublicationDates(
  site: SiteContent,
  opts?: { sourceIds?: string[]; limitPerSource?: number }
): Promise<{ site: SiteContent; updated: number }> {
  const wanted = opts?.sourceIds?.filter(Boolean) ?? []
  const sourceIds =
    wanted.length > 0
      ? wanted
      : [
          ...new Set(
            site.newsCollected
              .filter((item) => !isArchivedFlag(item))
              .map((item) => item.sourceId)
              .filter(Boolean)
          ),
        ]

  let nextCollected = [...site.newsCollected]
  let updated = 0

  for (const sourceId of sourceIds) {
    const refreshed = await refreshCollectedPublicationDates(
      nextCollected,
      sourceId,
      opts?.limitPerSource ?? 50
    )
    nextCollected = refreshed.items
    updated += refreshed.updated
  }

  return {
    site: { ...site, newsCollected: nextCollected },
    updated,
  }
}

export async function runNewsScrape(
  site: SiteContent,
  opts?: { sourceIds?: string[] }
): Promise<ScrapeResult> {
  const wanted = new Set(opts?.sourceIds ?? [])
  const targets = site.newsSources.filter(
    (s) =>
      s.enabled &&
      !isArchivedFlag(s) &&
      (wanted.size === 0 || wanted.has(s.id))
  )

  const existingUrls = new Set(
    site.newsCollected
      .filter((i) => !isArchivedFlag(i) && i.url)
      .map((i) => i.url)
  )
  const addedItems: SiteNewsCollectedItem[] = []
  const errors: ScrapeResult['errors'] = []
  const now = new Date().toISOString()
  const fetchedIds = new Set<string>()
  const nextSourcePatches = new Map<
    string,
    Partial<Pick<SiteNewsSource, 'lastFetchedAt' | 'lastError'>>
  >()

  for (const source of targets) {
    try {
      const drafts = await fetchSource(source)
      for (const rawDraft of drafts) {
        if (existingUrls.has(rawDraft.url)) continue
        const draft = await enrichDraftFromArticle(rawDraft)
        existingUrls.add(draft.url)
        addedItems.push({
          id: newSiteId('ncol'),
          title: draft.title,
          excerpt: cleanTeaserText(draft.excerpt || '', 480),
          bodyHtml: undefined,
          author: draft.author,
          url: draft.url,
          sourceId: source.id,
          sourceName: source.name,
          category: source.category,
          themes: source.themes?.length ? [...source.themes] : [],
          date: draft.date,
          scrapedAt: now,
          enabled: false,
          archived: false,
          archivedAt: null,
          image:
            draft.image && !isDecorativeSiteAsset(draft.image) ? draft.image : undefined,
        })
      }
      fetchedIds.add(source.id)
      nextSourcePatches.set(source.id, { lastFetchedAt: now, lastError: null })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Échec de collecte'
      errors.push({
        sourceId: source.id,
        sourceName: source.name,
        message,
      })
      nextSourcePatches.set(source.id, { lastError: message })
    }
  }

  let nextCollected: SiteNewsCollectedItem[] = [...addedItems, ...site.newsCollected]

  for (const source of targets) {
    if (!fetchedIds.has(source.id)) continue
    const refreshed = await refreshCollectedPublicationDates(nextCollected, source.id)
    nextCollected = refreshed.items
  }

  const nextSources = site.newsSources.map((s) => {
    const patch = nextSourcePatches.get(s.id)
    return patch ? { ...s, ...patch } : s
  })

  return {
    site: {
      ...site,
      newsSources: nextSources,
      newsCollected: nextCollected,
    },
    added: addedItems.length,
    updatedSources: fetchedIds.size,
    errors,
  }
}

/** Convertit les actualités collectées activées en cartes publiques. */
export function collectedToPublicNews(
  items: readonly SiteNewsCollectedItem[]
): CsirtNewsItem[] {
  return items
    .filter((item) => item.enabled && !isArchivedFlag(item))
    .map((item) => {
      const dates = formatSiteNewsDates(item.date)
      const title = decodeHtmlEntities(item.title)
      const excerpt = newsTeaserText(
        { title, excerpt: item.excerpt, bodyHtml: item.bodyHtml },
        320
      )
      const image = coverForNews(title, item.category, item.image)
      return {
        id: item.id,
        date: item.date,
        dateLabel: dates.dateLabel,
        dateShort: dates.dateShort,
        category: item.category,
        title,
        excerpt,
        bodyHtml: item.bodyHtml,
        author: item.author,
        href: `/actualites/${item.id}`,
        externalHref: item.url.startsWith('http') ? item.url : undefined,
        image,
        enabledAt: item.enabledAt || null,
        scrapedAt: item.scrapedAt,
        archived: false,
        archivedAt: null,
      } satisfies CsirtNewsItem
    })
    .sort((a, b) => {
      // 1. Priorité aux articles activés/affichés récemment dans l’admin
      const timeA = a.enabledAt ? Date.parse(a.enabledAt) || 0 : 0
      const timeB = b.enabledAt ? Date.parse(b.enabledAt) || 0 : 0
      if (timeA !== timeB) return timeB - timeA

      // 2. Tri par date de publication réelle
      const dateDiff = (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0)
      if (dateDiff !== 0) return dateDiff
      return b.date.localeCompare(a.date)
    })
}

export function resolvePublicNews(site: SiteContent): CsirtNewsItem[] {
  const raw = site.newsCollected ?? []
  const hasCollected = raw.some((item) => !isArchivedFlag(item))
  if (hasCollected) return collectedToPublicNews(raw)
  return (site.news ?? [])
    .filter((item) => item.archived !== true)
    .map((item) => ({
      ...item,
      image: coverForNews(item.title, item.category, item.image),
      href: `/actualites/${item.id}`,
      externalHref: item.externalHref,
    }))
}

export function findPublicNewsById(site: SiteContent, id: string): CsirtNewsItem | undefined {
  const decoded = decodeURIComponent(id)
  return resolvePublicNews(site).find((item) => item.id === decoded)
}

/**
 * Complète les extraits manquants (fetch source) et renvoie aussi le site
 * éventuellement patché pour persistance du contenu.
 */
export async function resolvePublicNewsWithExcerpts(
  site: SiteContent,
  opts?: { maxEnrich?: number }
): Promise<{ items: CsirtNewsItem[]; site: SiteContent; updated: number }> {
  const maxEnrich = opts?.maxEnrich ?? 12
  const items = resolvePublicNews(site).map((item) => ({ ...item }))
  const collected = [...(site.newsCollected ?? [])]
  let updated = 0

  const targets = items
    .filter((item) => !item.excerpt?.trim() && item.externalHref)
    .slice(0, maxEnrich)

  for (const item of targets) {
    const detail = await fetchArticleDetail(item.externalHref!)
    if (!detail) continue
    const excerpt =
      (detail.excerpt || '').trim() ||
      newsTeaserText(
        { title: item.title, excerpt: '', bodyHtml: detail.bodyHtml },
        320
      )
    if (!excerpt && !detail.bodyHtml) continue

    const idx = items.findIndex((row) => row.id === item.id)
    const currentImg = idx >= 0 ? items[idx].image : item.image
    const nextImage = resolveCyberNewsImage(
      item.title,
      item.category,
      detail.image && !isDecorativeSiteAsset(detail.image) ? detail.image : currentImg
    )

    if (idx >= 0) {
      items[idx] = {
        ...items[idx],
        excerpt: excerpt || items[idx].excerpt,
        bodyHtml: detail.bodyHtml || items[idx].bodyHtml,
        author: items[idx].author || detail.author,
        image: nextImage,
      }
    }

    const cIdx = collected.findIndex((row) => row.id === item.id)
    if (cIdx >= 0) {
      collected[cIdx] = {
        ...collected[cIdx],
        excerpt: excerpt || collected[cIdx].excerpt,
        bodyHtml: detail.bodyHtml || collected[cIdx].bodyHtml,
        author: detail.author || collected[cIdx].author,
        image: nextImage,
      }
      updated += 1
    }
  }

  return {
    items,
    site: updated > 0 ? { ...site, newsCollected: collected } : site,
    updated,
  }
}

/** Enrichit un article public depuis la source (corps officiel complet). */
export async function resolveNewsDetail(
  site: SiteContent,
  id: string
): Promise<CsirtNewsItem | undefined> {
  const item = findPublicNewsById(site, id)
  if (!item) return undefined
  if (!item.externalHref) {
    return {
      ...item,
      image: coverForNews(item.title, item.category, item.image),
    }
  }

  const needsLiveFetch =
    !item.bodyHtml?.trim() ||
    !item.excerpt?.trim() ||
    isIncompleteOfficialBody(item.bodyHtml, item.externalHref)

  if (!needsLiveFetch) {
    return {
      ...item,
      image: coverForNews(item.title, item.category, item.image),
    }
  }

  const detail = await fetchArticleDetail(item.externalHref)
  if (!detail) {
    return {
      ...item,
      image: coverForNews(item.title, item.category, item.image),
    }
  }

  const validDetailImage =
    detail.image && !isDecorativeSiteAsset(detail.image) ? detail.image : undefined
  const finalImage = coverForNews(
    detail.title || item.title,
    item.category,
    validDetailImage || item.image
  )

  return {
    ...item,
    title: detail.title || item.title,
    excerpt: detail.excerpt || item.excerpt,
    image: finalImage,
    author: detail.author || item.author,
    bodyHtml: detail.bodyHtml || item.bodyHtml,
  }
}
