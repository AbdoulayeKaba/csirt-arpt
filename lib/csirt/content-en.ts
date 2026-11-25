import type { SiteFooter, SiteHome, SiteMissions, SiteResponseSection, SiteVigilanceSection } from '@/lib/site/types'
import type { SiteNewsTopic } from '@/lib/site/news-sources'
import type { CsirtActionLink, CsirtHeroSlide, CsirtNewsItem, CsirtSocialPlatform, CsirtVideo } from '@/lib/csirt/home-content'

export const NEWS_TOPICS_EN: Record<string, string> = {
  ALERTES_SECURITE: 'Security alerts',
  MENACES_INCIDENTS: 'Threats and incidents',
  AVIS_SECURITE: 'Security advisories',
  IOC: 'Indicators of compromise',
  DURCISSEMENT: 'Hardening and recommendations',
  BULLETINS: 'News bulletins',
}

export const HOME_TOPIC_INTROS_EN: Record<string, string> = {
  ALERTES_SECURITE:
    'Security alerts are issued to warn of an immediate danger and to strengthen the security of information systems.',
  MENACES_INCIDENTS:
    'Threat and incident reports detail CSIRT-ARPT knowledge and incident handling.',
  AVIS_SECURITE:
    'Security advisories document vulnerabilities and how to protect against them.',
  IOC: 'Indicators of compromise, whether ANSSI-qualified or not, are shared for prevention.',
  DURCISSEMENT:
    'A set of checkpoints and operational recommendations to harden information systems.',
  BULLETINS: 'News bulletins illustrate pragmatic measures to apply, based on recent events.',
}

/** Libellés français → anglais (actualités collectées). */
export const NEWS_CATEGORY_LABELS_EN: Record<string, string> = {
  'Alertes de sécurité': 'Security alerts',
  'Menaces et incidents': 'Threats and incidents',
  'Avis de sécurité': 'Security advisories',
  'Indicateurs de compromission': 'Indicators of compromise',
  'Durcissement et recommandations': 'Hardening and recommendations',
  "Bulletins d'actualité": 'News bulletins',
  "Bulletins d’actualité": 'News bulletins',
  ALERTES: 'Security alerts',
  PUBLICATIONS: 'News bulletins',
  Rubrique: 'Category',
}

export const HERO_SLIDES_EN: Record<
  string,
  Partial<Pick<CsirtHeroSlide, 'alt' | 'kicker' | 'title' | 'cta'>>
> = {
  'hero-1': {
    alt: 'ARPT field inspection of telecommunications network service quality',
    kicker: 'CSIRT-ARPT',
    title: 'Securing Guinea’s digital space',
    cta: 'Discover CSIRT-ARPT',
  },
  'hero-2': {
    alt: 'ARPT Director General with a Smart Africa partner',
    kicker: 'Reporting',
    title: 'An incident? Alert CSIRT-ARPT',
    cta: 'Report an incident to CSIRT-ARPT',
  },
  'hero-3': {
    alt: 'ARPT building at Koloma business district',
    kicker: 'Contact',
    title: 'We are here to help',
    cta: 'Contact us',
  },
}

export const ACTION_LINKS_EN: Record<string, string> = {
  '/agrements': 'Accreditations',
  '/formations': 'Training',
  '/espace-rssi': 'CISO space',
}

export const NEWS_ITEMS_EN: Record<string, { title: string; excerpt: string }> = {
  'anp-csirt': {
    title: 'National Press Authority and CSIRT-ARPT',
    excerpt:
      'Partnership to strengthen incident reporting affecting media and national information infrastructure.',
  },
  'rgssi-2025': {
    title: 'RGSSI 2025 is now available',
    excerpt: 'Review the updated information-system security framework for the sector.',
  },
  'alerte-phishing': {
    title: 'Phishing campaign targeting operators',
    excerpt:
      'CSIRT-ARPT calls for vigilance against emails impersonating public institutions.',
  },
  'atelier-rssi': {
    title: 'CISO workshop: securing enterprise networks',
    excerpt: 'Highlights from the awareness workshop for information security officers.',
  },
}

/** Traductions par titre français normalisé (actualités collectées / ARPT). */
export const NEWS_TITLES_EN: Record<string, { title: string; excerpt?: string }> = {
  "l'arpt a la cpl-26 : cooperation, regulation et enjeux numeriques africains": {
    title: 'ARPT at CPL-26: cooperation, regulation and African digital challenges',
    excerpt:
      'A delegation of ARPT executives took part in CPL-26 to discuss cooperation, regulation and digital issues across Africa.',
  },
  'journee internationale des jeunes filles dans les tic': {
    title: 'International Girls in ICT Day',
    excerpt: 'ARPT highlights initiatives to encourage young women in information and communication technologies.',
  },
  'journee internationale des jeunes filles dans les tic : l’arpt sensibilise et accompagne': {
    title: 'International Girls in ICT Day: ARPT raises awareness and supports young women',
    excerpt:
      'Outreach and mentoring activities to promote ICT careers among girls and young women in Guinea.',
  },
}

export const VIDEOS_EN: Record<string, { title: string }> = {
  'atelier-rssi': { title: 'CISO workshop: securing enterprise networks' },
  phishing: { title: 'Phishing awareness: spotting scams' },
  'table-ronde': { title: 'Round table on digital regulation' },
}

export const SOCIAL_EN: Record<
  string,
  Partial<Pick<CsirtSocialPlatform, 'tags' | 'description' | 'latest' | 'latestAgo'>>
> = {
  facebook: {
    tags: ['News', 'Events'],
    description: 'ARPT news, campaigns and events. Stay informed every day.',
    latest: 'Cybersecurity awareness campaign — stay vigilant.',
    latestAgo: '5 d ago',
  },
  linkedin: {
    tags: ['Careers', 'Professional network'],
    description: 'Institutional news, events and ARPT’s professional network in Guinea.',
    latest: 'ARPT strengthens its regional commitment in Lomé.',
    latestAgo: '2 d ago',
  },
  tiktok: {
    tags: ['Videos', 'Awareness'],
    description: 'Awareness videos, reports and ARPT online interventions.',
    latest: 'Spot a phishing email in 30 seconds.',
    latestAgo: '1 d ago',
  },
}

export const HOME_MEDIA_EN = {
  title: 'Media library',
  lead: 'Watch our videos, reports and online interventions.',
}

export const HOME_MISSIONS_EN: SiteMissions = {
  title: 'CSIRT-ARPT',
  body: 'CSIRT-ARPT is the incident response centre responsible for securing Guinea’s digital space. It works to prevent cyber threats, protect critical infrastructure and support all users towards accessible cybersecurity.',
  ctaLabel: 'Learn more about our missions',
  ctaHref: '/csirt-arpt#missions',
}

export const HOME_RESPONSE_EN: SiteResponseSection = {
  kicker: 'CSIRT-ARPT',
  title: 'National response capability',
  lead: 'Prevent, analyse and contain cyber incidents to protect Guinea’s digital space — institutions, operators and citizens.',
  statusLabel: 'Operational capacity active · 24/7',
  pillars: [
    {
      id: 'prevent',
      index: '01',
      title: 'Prevent',
      body: 'Threat intelligence, awareness and best practices to reduce exposure.',
      href: '/bonnes-pratiques',
    },
    {
      id: 'analyze',
      index: '02',
      title: 'Analyse',
      body: 'Report qualification, alert correlation and technical support for affected entities.',
      href: '/panorama-menaces',
    },
    {
      id: 'respond',
      index: '03',
      title: 'Respond',
      body: 'Confidential incident handling, coordination and support until recovery.',
      href: '/signalement',
    },
  ],
  ctaLabel: 'Report an incident',
  ctaHref: '/signalement',
  secondaryLabel: 'Discover CSIRT',
  secondaryHref: '/csirt-arpt',
}

export const HOME_VIGILANCE_EN: SiteVigilanceSection = {
  title: 'Understand. Prevent. Respond.',
  statusLabel: 'Active watch · 24/7',
  lead: 'CSIRT-ARPT informs you, supports you and lets you report a cybersecurity incident quickly.',
  newsLane: {
    kicker: 'News',
    title: 'All news',
    ctaLabel: 'View',
    href: '/actualites',
  },
  alertLane: {
    kicker: 'Emergency',
    title: 'Report an incident',
    ctaLabel: 'Report',
    href: '/signalement',
  },
  assurance: ['Official channel', 'Priority response', 'National coverage'],
}

export const MANDATES_EN = [
  {
    id: 'protect',
    title: 'Protect',
    body: 'Critical infrastructure, operators and administrations against cyber threats.',
  },
  {
    id: 'coordinate',
    title: 'Coordinate',
    body: 'Unified national response, alert sharing and technical support for affected entities.',
  },
  {
    id: 'support',
    title: 'Support',
    body: 'Awareness, best practices and skills development for all users.',
  },
] as const

export const FOOTER_EN: SiteFooter = {
  ctaTitle: 'Stay alert',
  ctaLead: 'Receive official CSIRT-ARPT alerts and publications.',
  ctaLabel: 'Subscribe to alerts',
  ctaHref: '/abonnement',
  brandText:
    'CSIRT-ARPT — Computer Security Incident Response Team of ARPT Guinea.',
  twitterHref: 'https://x.com/search?q=ARPT%20Guinee',
  columns: [
    {
      id: 'institution',
      title: 'Institution',
      links: [
        { href: '/csirt-arpt', label: 'Discover CSIRT-ARPT' },
        { href: '/csirt-arpt#missions', label: 'Our missions' },
        { href: '/csirt-arpt#gouvernance', label: 'Leadership team' },
        { href: '/historique', label: 'History' },
      ],
    },
    {
      id: 'cyber',
      title: 'Cybersecurity',
      links: [
        { href: '/signalement', label: 'Incident reporting' },
        { href: '/publications', label: 'Active alerts' },
        { href: '/bonnes-pratiques', label: 'Best practices' },
        { href: '/experts-auditeurs', label: 'Certified auditors' },
        { href: '/espace-confiance', label: 'Trust space' },
        { href: '/panorama-menaces', label: 'Threat landscape' },
      ],
    },
    {
      id: 'resources',
      title: 'Resources',
      links: [
        { href: '/publications', label: 'Publications' },
        { href: '/rapports', label: 'Reports' },
        { href: '/mediatheque', label: 'Educational videos' },
        { href: '/guides', label: 'Practical guides' },
      ],
    },
  ],
  legal: [
    { href: '/mentions-legales', label: 'Legal notice' },
    { href: '/confidentialite', label: 'Privacy policy' },
    { href: '/accessibilite', label: 'Accessibility' },
    { href: '/plan-du-site', label: 'Full site map' },
  ],
}

export type LocalizedHomeSlice = Pick<
  SiteHome,
  | 'heroSlides'
  | 'actionLinks'
  | 'mediaTitle'
  | 'mediaLead'
  | 'response'
  | 'missions'
  | 'vigilance'
>
