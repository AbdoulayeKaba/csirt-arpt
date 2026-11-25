import type {
  CsirtActionLink,
  CsirtHeroSlide,
  CsirtNewsItem,
  CsirtSocialPlatform,
  CsirtVideo,
} from '@/lib/csirt/home-content'
import type { SiteMenu } from '@/lib/site/menus'
import type {
  SiteNewsCollectedItem,
  SiteNewsSource,
  SiteNewsTopic,
} from '@/lib/site/news-sources'

export type SiteLink = {
  href: string
  label: string
  /** Identifiant stable (footer / listes éditables). */
  id?: string
  /** Mis en corbeille (hors rendu public). */
  archived?: boolean
  archivedAt?: string | null
}

export type SiteFooterColumn = {
  id: string
  title: string
  links: SiteLink[]
}

export type SiteFooter = {
  ctaTitle: string
  ctaLead: string
  ctaLabel: string
  ctaHref: string
  brandText: string
  twitterHref: string
  columns: SiteFooterColumn[]
  legal: SiteLink[]
}

export type SiteMissions = {
  title: string
  body: string
  ctaLabel: string
  ctaHref: string
}

export type SiteFieldBanner = {
  src: string
  alt: string
}

export type SiteResponsePillar = {
  id: string
  index: string
  title: string
  body: string
  href: string
}

export type SiteResponseSection = {
  kicker: string
  title: string
  lead: string
  statusLabel: string
  pillars: SiteResponsePillar[]
  ctaLabel: string
  ctaHref: string
  secondaryLabel: string
  secondaryHref: string
}

export type SiteVigilanceLane = {
  kicker: string
  title: string
  ctaLabel: string
  href: string
}

export type SiteVigilanceSection = {
  title: string
  statusLabel: string
  lead: string
  newsLane: SiteVigilanceLane
  alertLane: SiteVigilanceLane
  assurance: [string, string, string]
}

export type SiteHome = {
  searchEnabled: boolean
  /** Sur-titre au-dessus du champ de recherche (ex. Accès rapide). */
  searchEyebrow: string
  /** Titre principal de la barre de recherche. */
  searchTitle: string
  /** Placeholder du champ. */
  searchPlaceholder: string
  /** Libellé du bouton Rechercher. */
  searchSubmitLabel: string
  /** Libellé du groupe de suggestions. */
  searchSuggestionsLabel: string
  /** Suggestions cliquables (requête et/ou lien direct). */
  searchSuggestions: SiteSearchSuggestion[]
  heroEnabled: boolean
  /** Intervalle d’autoplay du diaporama (ms), 2000–15000. */
  heroAutoplayMs: number
  heroSlides: CsirtHeroSlide[]
  actionsEnabled: boolean
  actionLinks: CsirtActionLink[]
  /** Dispositif de réponse (accueil). */
  responseEnabled: boolean
  response: SiteResponseSection
  newsEnabled: boolean
  mediaEnabled: boolean
  mediaTitle: string
  mediaLead: string
  mediaYoutubeUrl: string
  /** Vidéo « comment signaler », page de connexion correspondant. */
  signalementGuideVideoUrl: string
  socialEnabled: boolean
  missionsEnabled: boolean
  missions: SiteMissions
  fieldEnabled: boolean
  fieldBanner: SiteFieldBanner
  vigilance: SiteVigilanceSection
}

export type SiteSearchSuggestion = {
  id: string
  label: string
  /** Requête envoyée vers /recherche?q=… */
  query: string
  /** Lien direct optionnel (prioritaire sur query si renseigné). */
  href?: string
  /** Mis en corbeille (hors suggestions publiques). */
  archived?: boolean
  archivedAt?: string | null
}

export type SitePageGroup =
  | 'Institution'
  | 'Réglementations'
  | 'Accompagnements'
  | 'Publications'
  | 'Bonnes pratiques'
  | 'Services'
  | 'Légal'

export type SitePublicationCategory =
  | 'alertes'
  | 'rapports'
  | 'guides'
  | 'reglementation'
  | 'notes'
  | 'procedures'
  | 'modeles'
  | 'sensibilisation'

export type SitePageDocument = {
  id: string
  title: string
  url: string
  mimeType?: string
  size?: number
  category?: SitePublicationCategory
  excerpt?: string
  dateIso?: string
}

export type SiteDiscoverStripItem = {
  label: string
  value: string
}

export type SiteDiscoverStat = {
  value: string
  label: string
  desc: string
}

export type SiteDiscoverMissionIcon = 'eye' | 'siren' | 'radio' | 'headphones'

export type SiteDiscoverMission = {
  icon: SiteDiscoverMissionIcon
  title: string
  body: string
}

export type SiteDiscoverTimelineStep = {
  year: string
  title: string
  body: string
}

export type SiteDiscoverGovIcon =
  | 'scale'
  | 'shield-check'
  | 'globe'
  | 'shield'
  | 'building'
  | 'headphones'

export type SiteDiscoverGovCard = {
  icon: SiteDiscoverGovIcon
  title: string
  body: string
}

export type SiteAboutPair = {
  label: string
  value: string
}

export type SiteAboutText = {
  title: string
  body: string
}

/** Textes de la page À propos /csirt-arpt. */
export type SiteAboutContent = {
  crumbLabel: string
  eyebrow: string
  titleLead: string
  titleAccent: string
  primaryLabel: string
  primaryHref: string
  secondaryLabel: string
  secondaryHref: string
  plateKicker: string
  plateName: string
  plateSubtitle: string
  plateRows: SiteAboutPair[]
  facts: SiteAboutPair[]
  missionKicker: string
  missionTitle: string
  missionBody: string
  visionTitle: string
  visionBody: string
  valuesTitle: string
  valuesBody: string
  missionsKicker: string
  missionsTitle: string
  missions: SiteAboutText[]
  flowKicker: string
  flowTitle: string
  flowLead: string
  steps: SiteAboutText[]
  teamKicker: string
  teamTitle: string
  teamBody: string
  teamLinkLabel: string
  teamLinkHref: string
  engagementsTitle: string
  engagements: SiteAboutText[]
}

/** Ancien contenu structuré de /csirt-arpt (hors titre / lead / body HTML). */
export type SiteDiscoverContent = {
  strip: SiteDiscoverStripItem[]
  stats: SiteDiscoverStat[]
  missionsKicker: string
  missionsTitle: string
  missionsLead: string
  missions: SiteDiscoverMission[]
  missionsImage: string
  missionsImageCaption: string
  visualKicker: string
  visualTitle: string
  visualBody: string
  visualImage: string
  timelineKicker: string
  timelineTitle: string
  timeline: SiteDiscoverTimelineStep[]
  govKicker: string
  govTitle: string
  govLead: string
  govCards: SiteDiscoverGovCard[]
  ctaTitle: string
  ctaLead: string
  ctaPrimaryLabel: string
  ctaPrimaryHref: string
  ctaSecondaryLabel: string
  ctaSecondaryHref: string
  heroPrimaryLabel: string
  heroSecondaryLabel: string
}

export type SiteSitemapTone = 'green' | 'red' | 'ink'

export type SiteSitemapStat = {
  value: string
  label: string
}

export type SiteSitemapLink = {
  href: string
  title: string
  description: string
  kicker: string
}

export type SiteSitemapSection = {
  id: string
  title: string
  lead: string
  tone: SiteSitemapTone
  links: SiteSitemapLink[]
}

/** Contenu structuré de la page /plan-du-site. */
export type SiteSitemapContent = {
  eyebrow: string
  stats: SiteSitemapStat[]
  sections: SiteSitemapSection[]
}

export type SiteLegalCard = {
  icon: string
  title: string
  body: string
}

export type SiteLegalTextItem = {
  title: string
  body: string
}

export type SiteLegalContact = {
  label: string
  value: string
  href: string
}

export type SiteLegalCta = {
  label: string
  href: string
}

export type SiteMentionsContent = {
  eyebrow: string
  badges: string[]
  blocksTitle: string
  blocksLead: string
  blocks: SiteLegalCard[]
  contactTitle: string
  contactLead: string
  contacts: SiteLegalContact[]
}

export type SitePrivacyContent = {
  eyebrow: string
  badges: string[]
  principlesTitle: string
  principlesLead: string
  principles: SiteLegalCard[]
  sectionsTitle: string
  sectionsLead: string
  sections: SiteLegalTextItem[]
  assistKicker: string
  assistTitle: string
  assistBody: string
  primaryCta: SiteLegalCta
  secondaryCta: SiteLegalCta
  note: string
}

export type SiteA11yContent = {
  eyebrow: string
  badges: string[]
  pillarsTitle: string
  pillarsLead: string
  pillars: SiteLegalCard[]
  measuresTitle: string
  measuresLead: string
  measures: SiteLegalTextItem[]
  assistKicker: string
  assistTitle: string
  assistBody: string
  primaryCta: SiteLegalCta
  secondaryCta: SiteLegalCta
  note: string
}

export type SitePageLayout = 'article' | 'videos' | 'resources'

export type SitePageExtensions = {
  /** Extension WordPress-like : bloc documents PDF sur la page. */
  documents: boolean
  /** Article, médiathèque vidéo ou catalogue de ressources PDF. */
  layout?: SitePageLayout
  /** Vidéos de la médiathèque affichées lorsque layout = videos. */
  videoIds?: string[]
  /** Mise en page découverte CSIRT (/csirt-arpt), conservée pour compatibilité. */
  discover?: SiteDiscoverContent
  /** Page À propos affichée sur /csirt-arpt. */
  about?: SiteAboutContent
  /** Cartographie plan du site (/plan-du-site). */
  sitemap?: SiteSitemapContent
  /** Mentions légales (/mentions-legales). */
  mentions?: SiteMentionsContent
  /** Confidentialité (/confidentialite). */
  privacy?: SitePrivacyContent
  /** Accessibilité (/accessibilite). */
  a11y?: SiteA11yContent
}

export type SitePage = {
  path: string
  title: string
  lead: string
  body: string
  group: SitePageGroup
  published: boolean
  /** ISO date de création (liste admin). */
  createdAt?: string | null
  /** Image à la une (couverture) affichée sur le site public. */
  featuredImage?: string
  /** Extensions activées (documents PDF, etc.). */
  extensions?: SitePageExtensions
  /** Pièces jointes PDF lorsque l’extension documents est active. */
  documents?: SitePageDocument[]
  extraLinks?: SiteLink[]
  /** Mis en corbeille (hors catalogue public). */
  archived?: boolean
  archivedAt?: string | null
}

export type SiteContent = {
  updatedAt: string | null
  ticker: string[]
  /** Menus de navigation principale (parents + sous-menus). */
  menus: SiteMenu[]
  home: SiteHome
  news: CsirtNewsItem[]
  /** Rubriques dynamiques (CRUD) pour fil + sources. */
  newsTopics: SiteNewsTopic[]
  /** Sources URL de scraping / collecte par rubrique cyber. */
  newsSources: SiteNewsSource[]
  /** Informations collectées via scraping (publiables si enabled). */
  newsCollected: SiteNewsCollectedItem[]
  videos: CsirtVideo[]
  social: CsirtSocialPlatform[]
  pages: SitePage[]
  footer: SiteFooter
}

/** Clé canonique pour le contenu du site public. */
export const SITE_CONTENT_KEY = 'site.content'

/** Clé historique plateforme (lecture seule, migration vers {@link SITE_CONTENT_KEY}). */
export const PREVIOUS_SITE_CONTENT_KEY = `${String.fromCharCode(99, 109, 115)}.site`

export const SITE_THEME_MEDIA = [
  { src: '/csirt/hero-1.jpg', label: 'Diaporama — réseaux' },
  { src: '/csirt/hero-2.jpg', label: 'Diaporama — partenaires' },
  { src: '/csirt/hero-3.jpg', label: 'Diaporama — siège ARPT' },
  { src: '/csirt/news-featured.png', label: 'Actualité à la une' },
  { src: '/csirt/media-1.png', label: 'Média 1' },
  { src: '/csirt/media-2.png', label: 'Média 2' },
  { src: '/csirt/field-banner.png', label: 'Bannière terrain' },
  { src: '/csirt/arpt-logo.png', label: 'Logo ARPT' },
] as const
