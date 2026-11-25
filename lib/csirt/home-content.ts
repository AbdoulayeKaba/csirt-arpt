import type { CsirtHeroCtaIcon, CsirtHeroVariant } from '@/lib/csirt/hero-cta'

export type { CsirtHeroCtaIcon, CsirtHeroVariant }

export type CsirtHeroSlide = {
  id: string
  src: string
  alt: string
  /** Sur-titre court au-dessus du titre (optionnel). */
  kicker?: string
  /** Titre affiché sur le bandeau (optionnel). */
  title?: string
  cta: string
  href: string
  variant: CsirtHeroVariant
  /** Icône du bouton d’action. */
  ctaIcon?: CsirtHeroCtaIcon
  /** false = masquée du site public (conservée en brouillon). */
  enabled?: boolean
  /** Mis en corbeille (hors diaporama public). */
  archived?: boolean
  archivedAt?: string | null
}

export const CSIRT_HERO_SLIDES: readonly CsirtHeroSlide[] = [
  {
    id: 'hero-1',
    src: '/csirt/hero-1.jpg',
    alt: 'Contrôle de la qualité de service des réseaux de télécommunications par l’ARPT',
    kicker: 'CSIRT-ARPT',
    title: 'Sécuriser l’espace numérique guinéen',
    cta: 'Découvrir le CSIRT-ARPT',
    href: '/csirt-arpt',
    variant: 'glass',
    ctaIcon: 'arrow',
    enabled: true,
    archived: false,
    archivedAt: null,
  },
  {
    id: 'hero-2',
    src: '/csirt/hero-2.jpg',
    alt: 'M. Mamady Doumbouya, Directeur général de l’ARPT, avec un partenaire Smart Africa',
    kicker: 'Signalement',
    title: 'Un incident ? Alertez le CSIRT-ARPT',
    cta: 'Signaler un incident au CSIRT-ARPT',
    href: '/signalement',
    variant: 'alert',
    ctaIcon: 'shield',
    enabled: true,
    archived: false,
    archivedAt: null,
  },
  {
    id: 'hero-3',
    src: '/csirt/hero-3.jpg',
    alt: 'Immeuble de l’ARPT au Centre Directionnel de Koloma',
    kicker: 'Contact',
    title: 'Nous sommes à votre écoute',
    cta: 'Nous contacter',
    href: '/contacts',
    variant: 'glass',
    ctaIcon: 'phone',
    enabled: true,
    archived: false,
    archivedAt: null,
  },
]

/** Slides publiables sur le site (image + actives, hors corbeille). */
export function publishableHeroSlides(slides: readonly CsirtHeroSlide[] | null | undefined) {
  return (slides ?? []).filter(
    (slide) =>
      slide.archived !== true &&
      slide.enabled !== false &&
      Boolean(slide.src?.trim())
  )
}

export type CsirtActionLink = {
  id?: string
  href: string
  label: string
  /** Mis en corbeille (hors barre d’accès rapides publique). */
  archived?: boolean
  archivedAt?: string | null
}

export const CSIRT_ACTION_LINKS: readonly CsirtActionLink[] = [
  { id: 'action-agrements', href: '/agrements', label: 'Agréments', archived: false, archivedAt: null },
  { id: 'action-formations', href: '/formations', label: 'Formations', archived: false, archivedAt: null },
  { id: 'action-rssi', href: '/espace-rssi', label: 'Espace RSSI', archived: false, archivedAt: null },
]

export type CsirtNewsCategory = string

export type CsirtNewsItem = {
  id: string
  date: string
  dateLabel: string
  dateShort: string
  category: CsirtNewsCategory
  title: string
  excerpt: string
  /** Corps HTML pour la page détail (optionnel). */
  bodyHtml?: string
  author?: string
  href: string
  externalHref?: string
  image: string
  /** Horodatage d'activation / mise en ligne (pour afficher les dernières activées en premier). */
  enabledAt?: string | null
  scrapedAt?: string
  /** Mis en corbeille (hors fil public). */
  archived?: boolean
  archivedAt?: string | null
}

export const CSIRT_NEWS: readonly CsirtNewsItem[] = [
  {
    id: 'anp-csirt',
    date: '2026-05-08',
    dateLabel: 'vendredi 8 mai 2026',
    dateShort: '08 MAI 2026',
    category: 'BULLETINS',
    title: 'Autorité Nationale de la Presse et CSIRT-ARPT',
    excerpt:
      'Partenariat pour renforcer la signalisation des incidents affectant les médias et les infrastructures d’information nationales.',
    href: '/actualites/anp-csirt',
    externalHref: 'https://www.arpt.gov.gn/',
    image: '/csirt/news-featured.png',
  },
  {
    id: 'rgssi-2025',
    date: '2026-06-25',
    dateLabel: 'jeudi 25 juin 2026',
    dateShort: '25 JUIN 2026',
    category: 'DURCISSEMENT',
    title: 'Le RGSSI 2025 est désormais disponible',
    excerpt:
      'Consultez les nouvelles dispositions du référentiel de sécurité des systèmes d’information du secteur.',
    href: '/actualites/rgssi-2025',
    image: '/csirt/hero-2.jpg',
  },
  {
    id: 'alerte-phishing',
    date: '2026-04-12',
    dateLabel: 'dimanche 12 avril 2026',
    dateShort: '12 AVR 2026',
    category: 'ALERTES_SECURITE',
    title: 'Campagne de phishing visant les opérateurs',
    excerpt:
      'Le CSIRT-ARPT appelle à la vigilance face à des courriels usurpant l’identité d’institutions publiques.',
    href: '/actualites/alerte-phishing',
    image: '/csirt/media-2.png',
  },
  {
    id: 'atelier-rssi',
    date: '2026-03-18',
    dateLabel: 'mercredi 18 mars 2026',
    dateShort: '18 MARS 2026',
    category: 'BULLETINS',
    title: 'Atelier RSSI : sécuriser les réseaux d’entreprise',
    excerpt:
      'Retour sur l’atelier de sensibilisation destiné aux responsables de la sécurité des systèmes d’information.',
    href: '/actualites/atelier-rssi',
    image: '/csirt/media-1.png',
  },
]

export const MEDIA_CATEGORIES = [
  'sensibilisation',
  'bonnes-pratiques',
  'interventions',
  'ateliers',
  'evenements',
  'reportages',
  'reglementation',
  'replay',
] as const

export type CsirtVideoCategory = (typeof MEDIA_CATEGORIES)[number]
export type CsirtVideoFormat = 'video' | 'audio' | 'document'

export type CsirtVideo = {
  id: string
  title: string
  duration: string
  image: string
  href: string
  category?: CsirtVideoCategory
  excerpt?: string
  dateIso?: string
  format?: CsirtVideoFormat
  speaker?: string
  views?: number
  comments?: number
  /** Mis en corbeille (hors section publique). */
  archived?: boolean
  archivedAt?: string | null
}

export const CSIRT_VIDEOS: readonly CsirtVideo[] = [
  {
    id: 'atelier-rssi',
    title: 'Atelier RSSI : sécuriser les réseaux d’entreprise',
    duration: '3:42',
    image: '/csirt/media-1.png',
    href: 'https://www.youtube.com/watch?v=inWWhr5tnEA',
    category: 'sensibilisation',
    excerpt: 'Retour sur les bonnes pratiques pour renforcer la sécurité des réseaux.',
    dateIso: '2026-09-28',
    format: 'video',
    archived: false,
    archivedAt: null,
  },
  {
    id: 'phishing',
    title: 'Sensibilisation phishing : reconnaître les arnaques',
    duration: '1:18',
    image: '/csirt/media-2.png',
    href: 'https://www.youtube.com/watch?v=o0btqiV72cQ',
    category: 'bonnes-pratiques',
    excerpt: 'Les signaux d’alerte et gestes à adopter.',
    dateIso: '2026-09-24',
    format: 'video',
    archived: false,
    archivedAt: null,
  },
  {
    id: 'table-ronde',
    title: 'Table ronde sur la régulation du numérique',
    duration: '4:05',
    image: '/csirt/news-featured.png',
    href: 'https://www.youtube.com/watch?v=2ePf9kue8xw',
    category: 'reglementation',
    excerpt: 'Échanges autour des enjeux et des textes en vigueur.',
    dateIso: '2026-09-20',
    format: 'video',
    archived: false,
    archivedAt: null,
  },
]

/** Vidéos publiables sur le site (hors corbeille). */
export function publishableVideos(videos: readonly CsirtVideo[] | null | undefined) {
  return (videos ?? []).filter((video) => video.archived !== true)
}

export const ARPT_YOUTUBE_URL = 'https://www.youtube.com/results?search_query=ARPT+Guinee'

export type CsirtSocialPlatform = {
  id: 'facebook' | 'linkedin' | 'tiktok'
  name: string
  handle: string
  href: string
  followers: string
  posts: string
  tags: readonly string[]
  description: string
  latest: string
  latestAgo: string
  image: string
  theme: 'facebook' | 'linkedin' | 'tiktok'
}

export const CSIRT_SOCIAL: readonly CsirtSocialPlatform[] = [
  {
    id: 'facebook',
    name: 'Facebook',
    handle: '@arptgn',
    href: 'https://www.facebook.com/arptgn',
    followers: '12,4 k',
    posts: '248',
    tags: ['Actualités', 'Événements'],
    description: 'Actualités, campagnes et événements de l’ARPT. Restez informés au quotidien.',
    latest: 'Campagne de sensibilisation cybersécurité — restez vigilants.',
    latestAgo: 'il y a 5 j',
    image: '/csirt/hero-1.jpg',
    theme: 'facebook',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    handle: '@ARPT',
    href: 'https://www.linkedin.com/search/results/all/?keywords=ARPT%20Guinee',
    followers: '17,7 k',
    posts: '156',
    tags: ['Carrière', 'Réseau pro'],
    description:
      'Actualités institutionnelles, événements et réseau professionnel de l’ARPT en Guinée.',
    latest: 'L’ARPT renforce son engagement régional à Lomé.',
    latestAgo: 'il y a 2 j',
    image: '/csirt/news-featured.png',
    theme: 'linkedin',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    handle: '@arptguinee4155',
    href: 'https://www.tiktok.com/@arptguinee4155',
    followers: '3,9 k',
    posts: '89',
    tags: ['Vidéos', 'Sensibilisation'],
    description: 'Vidéos de sensibilisation, reportages et interventions en ligne de l’ARPT.',
    latest: 'Reconnaître un e-mail de phishing en 30 secondes.',
    latestAgo: 'il y a 1 j',
    image: '/csirt/media-1.png',
    theme: 'tiktok',
  },
]
