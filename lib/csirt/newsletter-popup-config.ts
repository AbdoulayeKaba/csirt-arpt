export type NewsletterPopupConfig = {
  /** Afficher le pop-up d’abonnement au scroll */
  enabled: boolean
  /** Pourcentage de scroll de la page (1–100) avant déclenchement */
  scrollPercent: number
  /** Délai après le seuil de scroll (ms) */
  delayMs: number
  /** Jours avant de réafficher après fermeture / abonnement */
  cookieDays: number
  /**
   * Pages où afficher le pop-up (chemins exacts sélectionnés).
   * Vide = nulle part (aucune page tant qu’aucune n’est choisie).
   */
  paths: string[]
  /** Chemins exclus en filet de sécurité (admin, login, etc.) */
  excludePaths: string[]
  title: string
  description: string
  ctaLabel: string
  /** Horodatage de dernière sauvegarde (invalide le dismiss navigateur) */
  updatedAt?: string
}

export type NewsletterPopupPublicConfig = Pick<
  NewsletterPopupConfig,
  | 'enabled'
  | 'scrollPercent'
  | 'delayMs'
  | 'cookieDays'
  | 'paths'
  | 'excludePaths'
  | 'title'
  | 'description'
  | 'ctaLabel'
  | 'updatedAt'
>

export const DEFAULT_NEWSLETTER_POPUP: NewsletterPopupConfig = {
  enabled: false,
  scrollPercent: 45,
  delayMs: 600,
  cookieDays: 14,
  paths: [],
  excludePaths: [
    '/dg',
    '/login',
    '/abonnement',
    '/signalement',
    '/api',
    '/recherche',
  ],
  title: 'Restez informé',
  description:
    'Abonnez-vous aux alertes et publications officielles du CSIRT-ARPT.',
  ctaLabel: 'Confirmer l’abonnement',
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

export function normalizeNewsletterPopupConfig(
  raw: unknown
): NewsletterPopupConfig {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_NEWSLETTER_POPUP }

  const input = raw as Partial<NewsletterPopupConfig>
  return {
    enabled: Boolean(input.enabled),
    scrollPercent: clampInt(input.scrollPercent, 1, 100, DEFAULT_NEWSLETTER_POPUP.scrollPercent),
    delayMs: clampInt(input.delayMs, 0, 60000, DEFAULT_NEWSLETTER_POPUP.delayMs),
    cookieDays: clampInt(input.cookieDays, 0, 365, DEFAULT_NEWSLETTER_POPUP.cookieDays),
    paths: asStringArray(input.paths),
    excludePaths: asStringArray(input.excludePaths).length
      ? asStringArray(input.excludePaths)
      : [...DEFAULT_NEWSLETTER_POPUP.excludePaths],
    title:
      typeof input.title === 'string' && input.title.trim()
        ? input.title.trim().slice(0, 120)
        : DEFAULT_NEWSLETTER_POPUP.title,
    description:
      typeof input.description === 'string' && input.description.trim()
        ? input.description.trim().slice(0, 400)
        : DEFAULT_NEWSLETTER_POPUP.description,
    ctaLabel:
      typeof input.ctaLabel === 'string' && input.ctaLabel.trim()
        ? input.ctaLabel.trim().slice(0, 80)
        : DEFAULT_NEWSLETTER_POPUP.ctaLabel,
    updatedAt:
      typeof input.updatedAt === 'string' && input.updatedAt.trim()
        ? input.updatedAt
        : undefined,
  }
}

export function normalizePathname(pathname: string): string {
  const trimmed = pathname.trim() || '/'
  if (trimmed.length > 1 && trimmed.endsWith('/')) return trimmed.slice(0, -1)
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

function ruleMatches(pathname: string, rule: string): boolean {
  const r = rule.trim()
  if (!r) return false
  if (r.endsWith('*')) {
    const prefix = normalizePathname(r.slice(0, -1) || '/')
    if (prefix === '/') return true
    return pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(prefix)
  }
  const exact = normalizePathname(r)
  return pathname === exact || pathname.startsWith(`${exact}/`)
}

function pathSelected(pathname: string, selected: string): boolean {
  const rule = normalizePathname(selected)
  if (rule === '/') return pathname === '/'
  return pathname === rule || pathname.startsWith(`${rule}/`)
}

/** Indique si le pop-up peut s’afficher sur ce chemin. */
export function newsletterPopupPathAllowed(
  pathname: string,
  config: Pick<NewsletterPopupConfig, 'paths' | 'excludePaths'>
): boolean {
  const path = normalizePathname(pathname)

  // Aucune page sélectionnée → jamais affiché
  if (!config.paths.length) return false

  for (const rule of config.excludePaths) {
    if (ruleMatches(path, rule)) return false
  }

  return config.paths.some((rule) => pathSelected(path, rule))
}

export function toPublicNewsletterPopupConfig(
  config: NewsletterPopupConfig
): NewsletterPopupPublicConfig {
  return {
    enabled: Boolean(config.enabled) && config.paths.length > 0,
    scrollPercent: config.scrollPercent,
    delayMs: config.delayMs,
    cookieDays: config.cookieDays,
    paths: config.paths,
    excludePaths: config.excludePaths,
    title: config.title,
    description: config.description,
    ctaLabel: config.ctaLabel,
    updatedAt: config.updatedAt,
  }
}
