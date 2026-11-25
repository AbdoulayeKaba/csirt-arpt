import {
  ARPT_YOUTUBE_URL,
  CSIRT_ACTION_LINKS,
  CSIRT_HERO_SLIDES,
  CSIRT_NEWS,
  CSIRT_SOCIAL,
  CSIRT_VIDEOS,
} from '@/lib/csirt/home-content'
import { CSIRT_NAV, CSIRT_TICKER } from '@/lib/csirt/nav'
import { navItemsToMenus } from '@/lib/site/menus'
import { DEFAULT_NEWS_SOURCES, DEFAULT_NEWS_TOPICS } from '@/lib/site/news-sources'
import type { SitePage, SiteContent, SiteVigilanceSection } from '@/lib/site/types'
import { DEFAULT_ABOUT_CONTENT } from '@/lib/site/about-defaults'
import { DEFAULT_DISCOVER_CONTENT } from '@/lib/site/discover-defaults'
import {
  DEFAULT_A11Y_CONTENT,
  DEFAULT_MENTIONS_CONTENT,
  DEFAULT_PRIVACY_CONTENT,
} from '@/lib/site/legal-defaults'
import { DEFAULT_SITEMAP_CONTENT } from '@/lib/site/sitemap-defaults'
import { PUBLICATION_SAMPLE_DOCUMENTS } from '@/lib/site/publication-samples'

export const DEFAULT_VIGILANCE_SECTION: SiteVigilanceSection = {
  title: 'Comprendre. Prévenir. Réagir.',
  statusLabel: 'Veille active · 24h/24',
  lead: 'Le CSIRT-ARPT vous informe, vous accompagne et vous permet de signaler rapidement tout incident de cybersécurité.',
  newsLane: {
    kicker: 'Actualités',
    title: 'Toutes les actualités',
    ctaLabel: 'Voir',
    href: '/actualites',
  },
  alertLane: {
    kicker: 'Urgence',
    title: 'Signaler un incident',
    ctaLabel: 'Déclarer',
    href: '/signalement',
  },
  assurance: ['Canal officiel', 'Réponse prioritaire', 'Couverture nationale'],
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

const DEFAULT_PAGES: SitePage[] = [
  {
    path: '/csirt-arpt',
    title: 'Centre national de réponse aux incidents',
    lead:
      "Service de l'Autorité de Régulation des Postes et Télécommunications — présence officielle pour informer, coordonner et recevoir les signalements de cybersécurité.",
    body: `Il assure une présence officielle pour informer, coordonner et recevoir les signalements d’incidents de cybersécurité, en alignement avec les référentiels FIRST, CERT-FR et ENISA.

## Missions
- Veille et alerte auprès des opérateurs, FAI et administrations
- Réception et qualification des signalements
- Coordination avec les homologues nationaux et internationaux

## Gouvernance
Le CSIRT-ARPT pilote le contenu éditorial et la recette de chaque version du site.`,
    group: 'Institution',
    published: true,
    extensions: {
      documents: false,
      discover: DEFAULT_DISCOVER_CONTENT,
      about: DEFAULT_ABOUT_CONTENT,
    },
  },
  {
    path: '/historique',
    title: 'Historique',
    lead: 'Le CSIRT-ARPT est mis en place progressivement pour assurer une présence officielle de réponse aux incidents.',
    body: '',
    group: 'Institution',
    published: true,
  },
  {
    path: '/reglementations',
    title: 'Réglementations',
    lead: 'Cadre applicable aux signalements et à la cybersécurité des réseaux et services régulés.',
    body: `## Cadre national
Le CSIRT-ARPT s’inscrit dans le mandat de l’ARPT. Les publications réglementaires, dont le RGSSI 2025, seront consolidées ici au fil des versions du site.

## Référentiels internationaux
L’alignement sur FIRST, CERT-FR et ENISA est une condition de reconnaissance du CSIRT-ARPT par ses homologues.`,
    group: 'Réglementations',
    published: true,
  },
  {
    path: '/reglementations/lois-decrets',
    title: 'Lois et décrets',
    lead: 'Textes nationaux encadrant la sécurité des systèmes d’information et des réseaux régulés.',
    body: '',
    group: 'Réglementations',
    published: true,
  },
  {
    path: '/reglementations/cadres',
    title: 'Cadres de référence',
    lead: 'Alignement du CSIRT-ARPT sur les référentiels FIRST, CERT-FR, ENISA et le cadre national.',
    body: '',
    group: 'Réglementations',
    published: true,
  },
  {
    path: '/reglementations/normes',
    title: 'Normes et standards',
    lead: 'Normes techniques et bonnes pratiques de conformité pour le secteur des postes et télécommunications.',
    body: '',
    group: 'Réglementations',
    published: true,
  },
  {
    path: '/accompagnements',
    title: 'Accompagnements',
    lead: 'Appui aux acteurs du secteur pour prévenir, détecter et signaler les incidents.',
    body: `## Opérateurs et FAI
Canal officiel unique, conseils de bonnes pratiques et orientation vers la procédure de signalement.

## Administrations
Coordination institutionnelle pour la qualification des incidents et le partage d’alertes.`,
    group: 'Accompagnements',
    published: true,
  },
  {
    path: '/accompagnements/audit',
    title: 'Audit et diagnostic',
    lead: 'État des lieux de la posture de sécurité et priorisation des actions de remédiation.',
    body: '',
    group: 'Accompagnements',
    published: true,
  },
  {
    path: '/accompagnements/conseil',
    title: 'Conseil et expertise',
    lead: 'Appui d’experts pour la gouvernance, la réponse aux incidents et la conformité.',
    body: '',
    group: 'Accompagnements',
    published: true,
  },
  {
    path: '/accompagnements/assistance',
    title: 'Assistance technique',
    lead: 'Soutien opérationnel pendant et après un incident de cybersécurité.',
    body: '',
    group: 'Accompagnements',
    published: true,
  },
  {
    path: '/publications',
    title: 'Publications',
    lead: 'Alertes, notes et documents de référence du CSIRT-ARPT.',
    body: '',
    group: 'Publications',
    published: true,
    extensions: { documents: true },
    documents: PUBLICATION_SAMPLE_DOCUMENTS.map((doc) => ({ ...doc })),
  },
  {
    path: '/publications/communiques',
    title: 'Communiqués',
    lead: 'Communiqués officiels et notes d’information à destination du public et des acteurs du secteur.',
    body: '',
    group: 'Publications',
    published: true,
  },
  {
    path: '/actualites',
    title: 'Actualités et alertes',
    lead: 'Publications et alertes du CSIRT-ARPT.',
    body: '',
    group: 'Publications',
    published: true,
  },
  {
    path: '/rapports',
    title: 'Rapports',
    lead: 'Les rapports validés par le CSIRT-ARPT seront publiés ici après recette éditoriale.',
    body: '',
    group: 'Publications',
    published: true,
  },
  {
    path: '/guides',
    title: 'Guides pratiques',
    lead: 'Les guides de bonnes pratiques seront enrichis progressivement.',
    body: '',
    group: 'Publications',
    published: true,
  },
  {
    path: '/mediatheque',
    title: 'Médiathèque',
    lead: 'Vidéos, reportages et interventions du CSIRT-ARPT pour une meilleure culture de la cybersécurité.',
    body: '',
    group: 'Publications',
    published: true,
  },
  {
    path: '/panorama-menaces',
    title: 'Panorama des menaces',
    lead: 'Cette rubrique accueillera le panorama des menaces dès la publication des alertes.',
    body: '',
    group: 'Publications',
    published: true,
  },
  {
    path: '/bonnes-pratiques',
    title: 'Bonnes pratiques',
    lead: 'Premiers réflexes avant, pendant et après un incident de cybersécurité.',
    body: `- Isoler le système touché sans détruire les preuves
- Noter l’heure, les symptômes et les actions déjà réalisées
- Signaler sans délai à csirt@arpt.gov.gn

## FAQ signalement
La procédure détaillée et la FAQ complète seront publiées progressivement. En attendant, utilisez exclusivement la messagerie officielle.`,
    group: 'Bonnes pratiques',
    published: true,
  },
  {
    path: '/bonnes-pratiques/particuliers',
    title: 'Pour les particuliers',
    lead: 'Gestes essentiels pour protéger vos comptes, appareils et données personnelles.',
    body: '',
    group: 'Bonnes pratiques',
    published: true,
  },
  {
    path: '/bonnes-pratiques/entreprises',
    title: 'Pour les entreprises',
    lead: 'Mesures organisationnelles et techniques pour réduire le risque cyber.',
    body: '',
    group: 'Bonnes pratiques',
    published: true,
  },
  {
    path: '/bonnes-pratiques/institutions',
    title: 'Pour les institutions',
    lead: 'Recommandations pour les administrations et opérateurs d’infrastructures essentielles.',
    body: '',
    group: 'Bonnes pratiques',
    published: true,
  },
  {
    path: '/experts-auditeurs',
    title: 'Experts auditeurs certifiés',
    lead: 'Annuaire des experts auditeurs certifiés dans le périmètre des réseaux et systèmes d’information.',
    body: 'Cette rubrique accueillera la liste officielle dès validation éditoriale par le CSIRT-ARPT.',
    group: 'Services',
    published: true,
  },
  {
    path: '/agrements',
    title: 'Agréments',
    lead: 'Informations sur les agréments et homologations relevant du périmètre ARPT / CSIRT-ARPT.',
    body: 'Cette rubrique accueillera les procédures et listes officielles dès validation éditoriale.',
    group: 'Services',
    published: true,
  },
  {
    path: '/formations',
    title: 'Formations',
    lead: 'Sensibilisation et montée en compétence des RSSI, opérateurs et administrations.',
    body: 'Le calendrier des sessions sera publié ici après recette éditoriale du CSIRT-ARPT.',
    group: 'Services',
    published: true,
  },
  {
    path: '/espace-rssi',
    title: 'Espace RSSI',
    lead: 'Espace dédié aux responsables de la sécurité des systèmes d’information.',
    body: 'Pour un échange opérationnel, contactez csirt@arpt.gov.gn.',
    group: 'Services',
    published: true,
  },
  {
    path: '/espace-confiance',
    title: 'Espace de confiance',
    lead: 'Accès dédié aux partenaires, experts et responsables de la sécurité des systèmes d’information.',
    body: '',
    group: 'Services',
    published: true,
    extraLinks: [
      { href: '/experts-auditeurs', label: 'Experts auditeurs certifiés' },
      { href: '/espace-rssi', label: 'Espace RSSI' },
      { href: '/agrements', label: 'Agréments' },
    ],
  },
  {
    path: '/veille-vulnerabilites',
    title: 'Veille de vulnérabilités',
    lead: 'Suivi des vulnérabilités critiques et diffusion d’alertes aux opérateurs, FAI et administrations.',
    body: '',
    group: 'Services',
    published: true,
  },
  {
    path: '/abonnement',
    title: 'Abonnement',
    lead: 'Recevez les alertes et publications officielles du CSIRT-ARPT.',
    body: 'Pour vous inscrire à la liste de diffusion, écrivez à csirt@arpt.gov.gn en précisant votre organisation et votre fonction.',
    group: 'Services',
    published: true,
  },
  {
    path: '/contacts',
    title: 'Contacts',
    lead: 'Un seul canal officiel pour joindre le centre de réponse aux incidents.',
    body: '',
    group: 'Services',
    published: true,
  },
  {
    path: '/signalement',
    title: 'Signaler un incident',
    lead: 'Signalement 24h/24 et 7j/7 auprès du CSIRT-ARPT.',
    body: '',
    group: 'Services',
    published: true,
  },
  {
    path: '/recherche',
    title: 'Recherche',
    lead: 'Recherchez une actualité, une alerte ou une ressource de la médiathèque.',
    body: '',
    group: 'Services',
    published: true,
  },
  {
    path: '/mentions-legales',
    title: 'Mentions légales',
    lead:
      'Éditeur, responsabilités et modalités d’usage du portail public CSIRT-ARPT (service de l’ARPT — République de Guinée).',
    body: '',
    group: 'Légal',
    published: true,
    extensions: {
      documents: false,
      mentions: DEFAULT_MENTIONS_CONTENT,
    },
  },
  {
    path: '/confidentialite',
    title: 'Politique de confidentialité',
    lead:
      'Le CSIRT-ARPT traite les informations transmises via ce portail avec le niveau de confidentialité attendu d’une autorité nationale de cybersécurité. Cette page présente les principes applicables aux signalements et aux interactions avec le site public.',
    body: '',
    group: 'Légal',
    published: true,
    extensions: {
      documents: false,
      privacy: DEFAULT_PRIVACY_CONTENT,
    },
  },
  {
    path: '/accessibilite',
    title: 'Accessibilité',
    lead:
      'Le CSIRT-ARPT s’engage à rendre son portail public utilisable par le plus grand nombre, y compris les personnes en situation de handicap. L’accessibilité est améliorée de façon progressive, priorisant les parcours essentiels de signalement et d’information.',
    body: '',
    group: 'Légal',
    published: true,
    extensions: {
      documents: false,
      a11y: DEFAULT_A11Y_CONTENT,
    },
  },
  {
    path: '/plan-du-site',
    title: 'Plan du site',
    lead:
      'Parcourez l’ensemble des pages publiques du CSIRT-ARPT : institution, signalement, cadre réglementaire, publications et informations légales.',
    body: '',
    group: 'Légal',
    published: true,
    extensions: {
      documents: false,
      sitemap: DEFAULT_SITEMAP_CONTENT,
    },
  },
]

export function createDefaultSiteContent(): SiteContent {
  return {
    updatedAt: null,
    ticker: [...CSIRT_TICKER],
    menus: navItemsToMenus(CSIRT_NAV),
    home: {
      searchEnabled: true,
      searchEyebrow: 'Accès rapide',
      searchTitle: 'Trouvez une alerte, un guide ou une ressource',
      searchPlaceholder: 'Mot-clé, CVE, thème, opérateur…',
      searchSubmitLabel: 'Rechercher',
      searchSuggestionsLabel: 'Suggestions',
      searchSuggestions: [
        { id: 'alerts', label: 'Alertes', query: 'alerte' },
        { id: 'phishing', label: 'Phishing', query: 'phishing' },
        { id: 'cve', label: 'CVE', query: 'CVE' },
        { id: 'ransomware', label: 'Ransomware', query: 'ransomware' },
        { id: 'bulletins', label: 'Bulletins', query: 'bulletin' },
      ],
      heroEnabled: true,
      heroAutoplayMs: 7000,
      heroSlides: clone(CSIRT_HERO_SLIDES),
      actionsEnabled: true,
      actionLinks: clone(CSIRT_ACTION_LINKS),
      responseEnabled: true,
      response: {
        kicker: 'CSIRT-ARPT',
        title: 'Dispositif national de réponse',
        lead: 'Prévenir, analyser et contenir les cyberincidents pour protéger l’espace numérique guinéen — institutions, opérateurs et usagers.',
        statusLabel: 'Capacité opérationnelle active · 24h/24',
        pillars: [
          {
            id: 'prevent',
            index: '01',
            title: 'Prévenir',
            body: 'Veille, sensibilisation et bonnes pratiques pour réduire l’exposition aux menaces.',
            href: '/bonnes-pratiques',
          },
          {
            id: 'analyze',
            index: '02',
            title: 'Analyser',
            body: 'Qualification des signalements, corrélation des alertes et appui technique aux entités touchées.',
            href: '/panorama-menaces',
          },
          {
            id: 'respond',
            index: '03',
            title: 'Répondre',
            body: 'Prise en charge confidentielle des incidents, coordination et accompagnement jusqu’au rétablissement.',
            href: '/signalement',
          },
        ],
        ctaLabel: 'Signaler un incident',
        ctaHref: '/signalement',
        secondaryLabel: 'Découvrir le CSIRT',
        secondaryHref: '/csirt-arpt',
      },
      newsEnabled: true,
      mediaEnabled: true,
      mediaTitle: 'Médiathèque',
      mediaLead: 'Retrouvez nos vidéos, reportages et interventions en ligne.',
      mediaYoutubeUrl: ARPT_YOUTUBE_URL,
      signalementGuideVideoUrl: '',
      socialEnabled: true,
      missionsEnabled: true,
      missions: {
        title: 'CSIRT-ARPT',
        body: 'Le CSIRT-ARPT est le centre de réponse aux incidents chargé de sécuriser l’espace numérique guinéen. Il agit pour prévenir les cybermenaces, protéger les infrastructures critiques et accompagner tous les usagers vers une cybersécurité accessible.',
        ctaLabel: 'En savoir plus sur nos missions',
        ctaHref: '/csirt-arpt#missions',
      },
      fieldEnabled: true,
      fieldBanner: {
        src: '/csirt/field-banner.png',
        alt: 'Contrôle de terrain des réseaux de télécommunications par un agent ARPT',
      },
      vigilance: clone(DEFAULT_VIGILANCE_SECTION),
    },
    news: clone(CSIRT_NEWS),
    newsTopics: clone(DEFAULT_NEWS_TOPICS),
    newsSources: clone(DEFAULT_NEWS_SOURCES),
    newsCollected: [],
    videos: clone(CSIRT_VIDEOS),
    social: clone(CSIRT_SOCIAL),
    pages: clone(DEFAULT_PAGES),
    footer: {
      ctaTitle: 'Restez en vigilance',
      ctaLead: 'Recevez les alertes et publications officielles du CSIRT-ARPT.',
      ctaLabel: 'S’abonner aux alertes',
      ctaHref: '/abonnement',
      brandText:
        'CSIRT-ARPT — Centre de réponse aux incidents de sécurité des systèmes d’information de l’ARPT Guinée.',
      twitterHref: 'https://x.com/search?q=ARPT%20Guinee',
      columns: [
        {
          id: 'institution',
          title: 'Institution',
          links: [
            { id: 'institution-link-1', href: '/csirt-arpt', label: 'Découvrir le CSIRT-ARPT', archived: false, archivedAt: null },
            { id: 'institution-link-2', href: '/csirt-arpt#missions', label: 'Nos Missions', archived: false, archivedAt: null },
            { id: 'institution-link-3', href: '/csirt-arpt#gouvernance', label: 'Équipe dirigeante', archived: false, archivedAt: null },
            { id: 'institution-link-4', href: '/historique', label: 'Historique', archived: false, archivedAt: null },
          ],
        },
        {
          id: 'cyber',
          title: 'Cybersécurité',
          links: [
            { id: 'cyber-link-1', href: '/signalement', label: 'Déclarations d’incidents', archived: false, archivedAt: null },
            { id: 'cyber-link-2', href: '/publications', label: 'Alertes en cours', archived: false, archivedAt: null },
            { id: 'cyber-link-3', href: '/bonnes-pratiques', label: 'Bonnes pratiques', archived: false, archivedAt: null },
            { id: 'cyber-link-4', href: '/experts-auditeurs', label: 'Experts auditeurs certifiés', archived: false, archivedAt: null },
            { id: 'cyber-link-5', href: '/espace-confiance', label: 'Espace de confiance', archived: false, archivedAt: null },
            { id: 'cyber-link-6', href: '/panorama-menaces', label: 'Panorama des menaces', archived: false, archivedAt: null },
          ],
        },
        {
          id: 'resources',
          title: 'Ressources',
          links: [
            { id: 'resources-link-1', href: '/publications', label: 'Publications', archived: false, archivedAt: null },
            { id: 'resources-link-2', href: '/rapports', label: 'Rapports', archived: false, archivedAt: null },
            { id: 'resources-link-3', href: '/mediatheque', label: 'Vidéos pédagogiques', archived: false, archivedAt: null },
            { id: 'resources-link-4', href: '/guides', label: 'Guides pratiques', archived: false, archivedAt: null },
          ],
        },
      ],
      legal: [
        { id: 'legal-1', href: '/mentions-legales', label: 'Mentions légales', archived: false, archivedAt: null },
        { id: 'legal-2', href: '/confidentialite', label: 'Politique de confidentialité', archived: false, archivedAt: null },
        { id: 'legal-3', href: '/accessibilite', label: 'Accessibilité', archived: false, archivedAt: null },
        { id: 'legal-4', href: '/plan-du-site', label: 'Plan complet du site', archived: false, archivedAt: null },
      ],
    },
  }
}
