import { newSiteId } from '@/lib/site/ids'

/** Rubriques dynamiques (CRUD admin) pour actualités + sources. */
export type SiteNewsTopic = {
  id: string
  label: string
  /** Style public : alerte (rouge) ou info (vert). */
  tone: 'alert' | 'info'
  order: number
  archived?: boolean
  archivedAt?: string | null
}

export type SiteNewsSource = {
  id: string
  name: string
  url: string
  /** Id de rubrique principale (`SiteNewsTopic.id`) — dérivé de la 1re thématique. */
  category: string
  enabled: boolean
  type: 'rss' | 'html' | 'api'
  /** Fréquence affichée (ex. Quotidien). */
  frequency?: string
  /** Code / libellé pays cible. */
  country?: string
  /** Thématiques sélectionnées (libellés). */
  themes?: string[]
  notes?: string
  lastFetchedAt?: string | null
  /** Dernière erreur de collecte (statut « Erreur »). */
  lastError?: string | null
  archived?: boolean
  archivedAt?: string | null
}

/** Élément issu du scraping (publication contrôlée via `enabled`). */
export type SiteNewsCollectedItem = {
  id: string
  title: string
  excerpt: string
  /** Corps HTML assaini pour la page détail. */
  bodyHtml?: string
  /** Auteur / service (ex. Direction Communication). */
  author?: string
  url: string
  sourceId: string
  sourceName: string
  category: string
  /** Thématiques héritées de la source au moment de la collecte. */
  themes?: string[]
  date: string
  scrapedAt: string
  /** Afficher sur le front (Actualités et Alertes). */
  enabled: boolean
  /** Horodatage d'activation / mise en ligne (pour afficher les dernières activées en premier). */
  enabledAt?: string | null
  image?: string
  archived?: boolean
  archivedAt?: string | null
}

/** Seed initial — modifiable ensuite dans l’administration du site public. */
export const DEFAULT_NEWS_TOPICS: SiteNewsTopic[] = [
  { id: 'ALERTES_SECURITE', label: 'Alertes de sécurité', tone: 'alert', order: 0 },
  { id: 'MENACES_INCIDENTS', label: 'Menaces et incidents', tone: 'alert', order: 1 },
  { id: 'AVIS_SECURITE', label: 'Avis de sécurité', tone: 'alert', order: 2 },
  { id: 'IOC', label: 'Indicateurs de compromission', tone: 'alert', order: 3 },
  { id: 'DURCISSEMENT', label: 'Durcissement et recommandations', tone: 'info', order: 4 },
  { id: 'BULLETINS', label: 'Bulletins d’actualité', tone: 'info', order: 5 },
]

/** Accroche d’accueil (modèle CERT-FR) par identifiant de rubrique. */
export const HOME_TOPIC_INTROS_FR: Record<string, string> = {
  ALERTES_SECURITE:
    'Les alertes de sécurité sont des informations destinées à prévenir d’un danger immédiat et à renforcer la sécurité des systèmes d’information.',
  MENACES_INCIDENTS:
    'Les rapports Menaces et incidents détaillent l’état des connaissances et les traitements d’incidents du CSIRT-ARPT.',
  AVIS_SECURITE:
    'Les avis de sécurité sont des documents faisant état de vulnérabilités et des moyens de s’en prémunir.',
  IOC: 'Les indicateurs de compromission, qualifiés ou non, sont partagés à des fins de prévention.',
  DURCISSEMENT:
    'Un ensemble de points de contrôle et de recommandations opérationnelles pour durcir le niveau de sécurité des systèmes d’information.',
  BULLETINS:
    'Les bulletins d’actualité illustrent, par l’actualité récente, certaines mesures pragmatiques à appliquer.',
}

/** @deprecated Conservé pour compat ; préférer `DEFAULT_NEWS_TOPICS`. */
export const SITE_NEWS_CATEGORIES = DEFAULT_NEWS_TOPICS.map((t) => t.id)

/** @deprecated */
export type SiteNewsCategory = string

/** @deprecated */
export const SITE_NEWS_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  DEFAULT_NEWS_TOPICS.map((t) => [t.id, t.label])
)

export function createEmptyNewsTopic(order = 0): SiteNewsTopic {
  return {
    id: newSiteId('ntopic'),
    label: 'Nouvelle rubrique',
    tone: 'info',
    order,
    archived: false,
    archivedAt: null,
  }
}

export function createEmptyNewsSource(categoryId: string, order = 0): SiteNewsSource {
  return {
    id: newSiteId('nsrc'),
    name: '',
    url: '',
    category: categoryId,
    enabled: true,
    type: 'rss',
    frequency: 'Quotidien',
    country: '',
    themes: [],
    notes: '',
    lastFetchedAt: null,
    lastError: null,
    archived: false,
    archivedAt: null,
  }
}

/** Sources de veille initiales (après reset / premier démarrage). */
export const DEFAULT_NEWS_SOURCES: SiteNewsSource[] = [
  {
    id: 'nsrc-arpt-actu',
    name: 'ARPT — Actualités',
    url: 'https://www.arpt.gov.gn/actualites/',
    category: 'BULLETINS',
    enabled: true,
    type: 'html',
    frequency: 'Quotidien',
    country: 'Guinée',
    themes: ['Cybersécurité', 'Infrastructure & Réseaux'],
    notes: 'Page Actualités ARPT (collecte HTML).',
    lastFetchedAt: null,
    lastError: null,
    archived: false,
    archivedAt: null,
  },
  {
    id: 'nsrc-certfr-alerte',
    name: 'CERT-FR — Alertes',
    url: 'https://www.cert.ssi.gouv.fr/alerte/feed/',
    category: 'ALERTES_SECURITE',
    enabled: true,
    type: 'rss',
    frequency: 'Toutes les 6 h',
    country: 'International',
    themes: ['Cybersécurité'],
    notes: 'Flux RSS officiel des alertes CERT-FR.',
    lastFetchedAt: null,
    lastError: null,
    archived: false,
    archivedAt: null,
  },
  {
    id: 'nsrc-certfr-avis',
    name: 'CERT-FR — Avis',
    url: 'https://www.cert.ssi.gouv.fr/avis/feed/',
    category: 'AVIS_SECURITE',
    enabled: true,
    type: 'rss',
    frequency: 'Quotidien',
    country: 'International',
    themes: ['Cybersécurité'],
    notes: 'Flux RSS officiel des avis de sécurité CERT-FR.',
    lastFetchedAt: null,
    lastError: null,
    archived: false,
    archivedAt: null,
  },
  {
    id: 'nsrc-cisa',
    name: 'CISA — Cybersecurity Advisories',
    url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml',
    category: 'AVIS_SECURITE',
    enabled: true,
    type: 'rss',
    frequency: 'Quotidien',
    country: 'International',
    themes: ['Cybersécurité'],
    notes: 'Advisories CISA (États-Unis).',
    lastFetchedAt: null,
    lastError: null,
    archived: false,
    archivedAt: null,
  },
]

export const SITE_SOURCE_FREQUENCIES = [
  'Toutes les heures',
  'Toutes les 6 h',
  'Toutes les 12 h',
  'Quotidien',
  'Hebdomadaire',
] as const

export const SITE_SOURCE_COUNTRIES = [
  'Guinée',
  'Sénégal',
  'Côte d’Ivoire',
  'Mali',
  'Burkina Faso',
  'Niger',
  'Bénin',
  'Togo',
  'CEDEAO',
  'Union africaine',
  'International',
] as const

export const SITE_SOURCE_THEMES = [
  'Cybersécurité',
  'Infrastructure & Réseaux',
  'Licences & Autorisations',
  'Service Universel',
  'Protection des consommateurs',
  'Fréquences & Spectre',
  'Données personnelles',
  'Interconnexion',
  'Qualité de service',
  'Tarification',
] as const

export type SiteSourceStatus = 'active' | 'inactive' | 'error' | 'trash'

export function getSiteSourceStatus(source: SiteNewsSource): SiteSourceStatus {
  if (source.archived) return 'trash'
  if (source.lastError) return 'error'
  if (source.enabled) return 'active'
  return 'inactive'
}

export function sortNewsTopics(topics: readonly SiteNewsTopic[]): SiteNewsTopic[] {
  return [...topics].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, 'fr'))
}

export function isArchivedFlag(value: { archived?: boolean } | null | undefined) {
  return value?.archived === true
}

export function archiveNow() {
  return new Date().toISOString()
}

/** Rubriques actives (hors corbeille). */
export function resolveNewsTopics(topics?: readonly SiteNewsTopic[] | null): SiteNewsTopic[] {
  const list =
    topics && topics.length > 0
      ? sortNewsTopics(topics)
      : sortNewsTopics(DEFAULT_NEWS_TOPICS)
  return list.filter((t) => !isArchivedFlag(t))
}

export function resolveAllNewsTopics(topics?: readonly SiteNewsTopic[] | null): SiteNewsTopic[] {
  if (topics && topics.length > 0) return sortNewsTopics(topics)
  return sortNewsTopics(DEFAULT_NEWS_TOPICS)
}

/** Migre anciennes clés (PUBLICATIONS / ALERTES / …) vers un id de rubrique. */
export function normalizeSiteNewsCategory(
  raw: unknown,
  topics?: readonly SiteNewsTopic[] | null
): string {
  const list = resolveNewsTopics(topics)
  const all = resolveAllNewsTopics(topics)
  const value = typeof raw === 'string' ? raw.trim() : ''
  if (value && all.some((t) => t.id === value)) return value

  if (value === 'ALERTES' || value === 'ALERTES_SECURITE') {
    return list.find((t) => t.id === 'ALERTES_SECURITE')?.id ?? list[0]?.id ?? all[0]!.id
  }
  if (value === 'PUBLICATIONS' || value === 'BULLETINS') {
    return list.find((t) => t.id === 'BULLETINS')?.id ?? list[0]?.id ?? all[0]!.id
  }

  const byLabel = all.find((t) => t.label.toLowerCase() === value.toLowerCase())
  if (byLabel) return byLabel.id

  return list[0]?.id ?? all[0]?.id ?? 'BULLETINS'
}

export function newsCategoryLabel(
  category: string,
  topics?: readonly SiteNewsTopic[] | null
): string {
  const list = resolveAllNewsTopics(topics)
  const found = list.find((t) => t.id === category)
  if (found) return found.label
  if (category === 'ALERTES') return 'Alertes de sécurité'
  if (category === 'PUBLICATIONS') return 'Bulletins d’actualité'
  return category || 'Rubrique'
}

export function isAlertNewsCategory(
  category: string,
  topics?: readonly SiteNewsTopic[] | null
): boolean {
  const list = resolveAllNewsTopics(topics)
  const topic = list.find((t) => t.id === normalizeSiteNewsCategory(category, list))
  if (topic) return topic.tone === 'alert'
  if (
    /cyber|sécurit|securit|menace|incident|ioc|compromission|infrastructure|alerte/i.test(
      category
    )
  ) {
    return true
  }
  return (
    category === 'ALERTES' ||
    category === 'ALERTES_SECURITE' ||
    category === 'MENACES_INCIDENTS' ||
    category === 'AVIS_SECURITE' ||
    category === 'IOC'
  )
}

export function isSiteNewsCategory(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}
