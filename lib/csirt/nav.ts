import { CSIRT_BRAND } from '@/lib/csirt/brand'

export type CsirtMegaIcon =
  | 'presentation'
  | 'missions'
  | 'equipe'
  | 'historique'
  | 'incidents'
  | 'veille'
  | 'menaces'
  | 'abonnement'
  | 'lois'
  | 'cadres'
  | 'normes'
  | 'audit'
  | 'formation'
  | 'conseil'
  | 'assistance'
  | 'actualites'
  | 'rapports'
  | 'guides'
  | 'communiques'
  | 'particuliers'
  | 'entreprises'
  | 'institutions'

export type CsirtMegaCard = {
  title: string
  description: string
  href: string
  icon: CsirtMegaIcon
  kicker?: string
  badge?: string
}

export type CsirtMegaFeatured = {
  label: string
  title: string
  description: string
}

export type CsirtMegaMenu = {
  kicker: string
  title: string
  description: string
  featured?: CsirtMegaFeatured
  cta: { label: string; href: string }
  sectionLabel: string
  seeAllHref: string
  cards: readonly CsirtMegaCard[]
}

export type CsirtNavItem = {
  label: string
  href: string
  mega?: CsirtMegaMenu
}

export const CSIRT_TICKER = [
  'Signalez tout incident de cybersécurité 24h/24 et 7j/7 auprès du CSIRT-ARPT.',
  'Le RGSSI 2025 est désormais disponible : consultez les nouvelles dispositions du secteur.',
] as const

export const CSIRT_NAV: readonly CsirtNavItem[] = [
  {
    label: 'CSIRT-ARPT',
    href: '/csirt-arpt',
    mega: {
      kicker: 'Rubrique',
      title: 'CSIRT-ARPT',
      description:
        'Découvrez l’institution, ses missions et son rôle dans la protection de l’espace numérique national.',
      featured: {
        label: 'À la une',
        title: 'Notre vision',
        description:
          'Une cybersécurité accessible, proactive et au service de tous les acteurs du secteur.',
      },
      cta: { label: 'Découvrir le CSIRT-ARPT', href: '/csirt-arpt' },
      sectionLabel: 'Navigation rapide',
      seeAllHref: '/csirt-arpt',
      cards: [
        {
          kicker: 'Institution',
          title: 'Découvrir le CSIRT-ARPT',
          description: 'Mandat, valeurs et organisation de l’agence nationale de réponse aux incidents.',
          href: '/csirt-arpt',
          icon: 'presentation',
        },
        {
          kicker: 'Mandat',
          title: 'Nos missions',
          description: 'Prévention, protection des réseaux et accompagnement des acteurs du numérique.',
          href: '/csirt-arpt#missions',
          icon: 'missions',
          badge: 'Essentiel',
        },
        {
          kicker: 'Gouvernance',
          title: 'Équipe dirigeante',
          description: 'Direction générale, instances de décision et organisation institutionnelle.',
          href: '/csirt-arpt#gouvernance',
          icon: 'equipe',
        },
        {
          kicker: 'Mémoire',
          title: 'Historique',
          description: 'Les étapes fondatrices de la cybersécurité nationale en République de Guinée.',
          href: '/historique',
          icon: 'historique',
        },
      ],
    },
  },
  {
    label: 'Réglementations',
    href: '/reglementations',
    mega: {
      kicker: 'Rubrique',
      title: 'Réglementations',
      description:
        'Cadre national et référentiels applicables à la cybersécurité des réseaux et services régulés.',
      cta: { label: 'Accéder à la veille', href: '/reglementations' },
      sectionLabel: 'Navigation rapide',
      seeAllHref: '/reglementations',
      featured: {
        label: 'À la une',
        title: 'RGSSI 2025',
        description:
          'Le référentiel de sécurité des systèmes d’information du secteur est désormais disponible.',
      },
      cards: [
        {
          kicker: 'Cadre légal',
          title: 'Lois et décrets',
          description: 'Textes nationaux encadrant la sécurité des systèmes d’information.',
          href: '/reglementations/lois-decrets',
          icon: 'lois',
          badge: 'Nouveau',
        },
        {
          kicker: 'Référentiels',
          title: 'Cadres de référence',
          description: 'Alignement FIRST, CERT-FR, ENISA et cadre national de cybersécurité.',
          href: '/reglementations/cadres',
          icon: 'cadres',
        },
        {
          kicker: 'Conformité',
          title: 'Normes et standards',
          description: 'Normes techniques et bonnes pratiques de conformité pour le secteur.',
          href: '/reglementations/normes',
          icon: 'normes',
        },
        {
          kicker: 'Veille',
          title: 'Veille réglementaire',
          description: 'Suivi des évolutions du cadre national et des référentiels internationaux.',
          href: '/reglementations',
          icon: 'veille',
        },
      ],
    },
  },
  {
    label: 'Accompagnements',
    href: '/accompagnements',
    mega: {
      kicker: 'Rubrique',
      title: 'Accompagnements',
      description:
        'Appui aux opérateurs, administrations et organisations pour prévenir, détecter et traiter les incidents.',
      cta: { label: 'Prendre rendez-vous', href: '/contacts' },
      sectionLabel: 'Navigation rapide',
      seeAllHref: '/accompagnements',
      featured: {
        label: 'À la une',
        title: 'Appui opérationnel',
        description:
          'Un accompagnement adapté aux opérateurs, administrations et organisations du secteur.',
      },
      cards: [
        {
          kicker: 'Diagnostic',
          title: 'Audit et diagnostic',
          description: 'État des lieux de la posture de sécurité et priorisation des actions.',
          href: '/accompagnements/audit',
          icon: 'audit',
        },
        {
          kicker: 'Compétences',
          title: 'Formation et sensibilisation',
          description: 'Sessions de sensibilisation et montée en compétence des équipes.',
          href: '/formations',
          icon: 'formation',
        },
        {
          kicker: 'Expertise',
          title: 'Conseil et expertise',
          description: 'Appui d’experts pour la gouvernance, la réponse et la conformité.',
          href: '/accompagnements/conseil',
          icon: 'conseil',
          badge: 'Nouveau',
        },
        {
          kicker: 'Opérations',
          title: 'Assistance technique',
          description: 'Soutien opérationnel pendant et après un incident de cybersécurité.',
          href: '/accompagnements/assistance',
          icon: 'assistance',
        },
      ],
    },
  },
  {
    label: 'Publications',
    href: '/publications',
    mega: {
      kicker: 'Rubrique',
      title: 'Publications',
      description: 'Alertes, rapports, guides et communiqués officiels du CSIRT-ARPT.',
      cta: { label: 'Consulter la médiathèque', href: '/mediatheque' },
      sectionLabel: 'Navigation rapide',
      seeAllHref: '/publications',
      featured: {
        label: 'À la une',
        title: 'Alertes et notes',
        description: 'Consultez les dernières publications officielles du CSIRT-ARPT.',
      },
      cards: [
        {
          kicker: 'Fil officiel',
          title: 'Actualités',
          description: 'Informations et alertes récemment publiées par le CSIRT-ARPT.',
          href: '/actualites',
          icon: 'actualites',
        },
        {
          kicker: 'Analyses',
          title: 'Rapports',
          description: 'Rapports d’activité, analyses et documents de synthèse.',
          href: '/rapports',
          icon: 'rapports',
        },
        {
          kicker: 'Ressources',
          title: 'Guides et manuels',
          description: 'Guides pratiques pour sécuriser les systèmes et signaler un incident.',
          href: '/guides',
          icon: 'guides',
        },
        {
          kicker: 'Officiel',
          title: 'Communiqués',
          description: 'Communiqués officiels et notes d’information à destination du public.',
          href: '/publications/communiques',
          icon: 'communiques',
        },
      ],
    },
  },
  {
    label: 'Bonnes pratiques',
    href: '/bonnes-pratiques',
    mega: {
      kicker: 'Rubrique',
      title: 'Bonnes pratiques',
      description: 'Réflexes de cybersécurité adaptés aux particuliers, entreprises et institutions.',
      cta: { label: 'Consulter les fiches', href: '/bonnes-pratiques' },
      sectionLabel: 'Navigation rapide',
      seeAllHref: '/bonnes-pratiques',
      featured: {
        label: 'À la une',
        title: 'Premiers réflexes',
        description: 'Les gestes essentiels avant, pendant et après un incident de cybersécurité.',
      },
      cards: [
        {
          kicker: 'Public',
          title: 'Pour les particuliers',
          description: 'Gestes essentiels pour protéger vos comptes, appareils et données personnelles.',
          href: '/bonnes-pratiques/particuliers',
          icon: 'particuliers',
        },
        {
          kicker: 'Organisations',
          title: 'Pour les entreprises',
          description: 'Mesures organisationnelles et techniques pour réduire le risque cyber.',
          href: '/bonnes-pratiques/entreprises',
          icon: 'entreprises',
        },
        {
          kicker: 'État',
          title: 'Pour les institutions',
          description: 'Recommandations pour les administrations et opérateurs d’infrastructures.',
          href: '/bonnes-pratiques/institutions',
          icon: 'institutions',
        },
        {
          kicker: 'Aide',
          title: 'FAQ signalement',
          description: 'Questions fréquentes pour déclarer un incident dans les meilleurs délais.',
          href: '/bonnes-pratiques#faq',
          icon: 'incidents',
        },
      ],
    },
  },
  {
    label: 'Experts auditeurs certifiés',
    href: '/experts-auditeurs',
  },
]

export const CSIRT_PORTAL_HREF = '/login'
export const CSIRT_CONTACTS_HREF = '/contacts'
export const CSIRT_SIGNALEMENT_HREF = '/signalement'
export const CSIRT_MAILTO = CSIRT_BRAND.mailto
