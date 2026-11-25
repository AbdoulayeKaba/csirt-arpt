import type { CsirtNavItem } from '@/lib/csirt/nav'

export const CSIRT_TICKER_EN = [
  'Report any cybersecurity incident 24/7 to CSIRT-ARPT.',
  'RGSSI 2025 is now available: review the sector’s updated provisions.',
] as const

export const CSIRT_NAV_EN: readonly CsirtNavItem[] = [
  {
    label: 'CSIRT-ARPT',
    href: '/csirt-arpt',
    mega: {
      kicker: 'Section',
      title: 'CSIRT-ARPT',
      description:
        'Discover the institution, its missions and its role in protecting the national digital space.',
      featured: {
        label: 'Featured',
        title: 'Our vision',
        description:
          'Cybersecurity that is accessible, proactive and serves all stakeholders in the sector.',
      },
      cta: { label: 'Discover CSIRT-ARPT', href: '/csirt-arpt' },
      sectionLabel: 'Quick navigation',
      seeAllHref: '/csirt-arpt',
      cards: [
        {
          kicker: 'Institution',
          title: 'Discover CSIRT-ARPT',
          description: 'Mandate, values and organization of the national incident response agency.',
          href: '/csirt-arpt',
          icon: 'presentation',
        },
        {
          kicker: 'Mandate',
          title: 'Our missions',
          description: 'Prevention, network protection and support for digital ecosystem stakeholders.',
          href: '/csirt-arpt#missions',
          icon: 'missions',
          badge: 'Essential',
        },
        {
          kicker: 'Governance',
          title: 'Leadership team',
          description: 'Executive management, decision-making bodies and institutional organization.',
          href: '/csirt-arpt#gouvernance',
          icon: 'equipe',
        },
        {
          kicker: 'History',
          title: 'Timeline',
          description: 'Foundational milestones of national cybersecurity in the Republic of Guinea.',
          href: '/historique',
          icon: 'historique',
        },
      ],
    },
  },
  {
    label: 'Regulations',
    href: '/reglementations',
    mega: {
      kicker: 'Section',
      title: 'Regulations',
      description:
        'National framework and reference standards for cybersecurity of regulated networks and services.',
      cta: { label: 'Browse regulatory watch', href: '/reglementations' },
      sectionLabel: 'Quick navigation',
      seeAllHref: '/reglementations',
      featured: {
        label: 'Featured',
        title: 'RGSSI 2025',
        description:
          'The sector information systems security reference framework is now available.',
      },
      cards: [
        {
          kicker: 'Legal framework',
          title: 'Laws and decrees',
          description: 'National texts governing information systems security.',
          href: '/reglementations/lois-decrets',
          icon: 'lois',
          badge: 'New',
        },
        {
          kicker: 'Reference',
          title: 'Reference frameworks',
          description: 'Alignment with FIRST, CERT-FR, ENISA and the national cybersecurity framework.',
          href: '/reglementations/cadres',
          icon: 'cadres',
        },
        {
          kicker: 'Compliance',
          title: 'Standards and norms',
          description: 'Technical standards and compliance best practices for the sector.',
          href: '/reglementations/normes',
          icon: 'normes',
        },
        {
          kicker: 'Watch',
          title: 'Regulatory watch',
          description: 'Tracking changes in the national framework and international reference standards.',
          href: '/reglementations',
          icon: 'veille',
        },
      ],
    },
  },
  {
    label: 'Support services',
    href: '/accompagnements',
    mega: {
      kicker: 'Section',
      title: 'Support services',
      description:
        'Assistance for operators, administrations and organizations to prevent, detect and handle incidents.',
      cta: { label: 'Book an appointment', href: '/contacts' },
      sectionLabel: 'Quick navigation',
      seeAllHref: '/accompagnements',
      featured: {
        label: 'Featured',
        title: 'Operational support',
        description: 'Tailored assistance for operators, administrations and organizations in the sector.',
      },
      cards: [
        {
          kicker: 'Assessment',
          title: 'Audit and assessment',
          description: 'Security posture review and prioritization of remediation actions.',
          href: '/accompagnements/audit',
          icon: 'audit',
        },
        {
          kicker: 'Skills',
          title: 'Training and awareness',
          description: 'Awareness sessions and upskilling for technical and operational teams.',
          href: '/formations',
          icon: 'formation',
        },
        {
          kicker: 'Expertise',
          title: 'Advisory and expertise',
          description: 'Expert support for governance, incident response and compliance.',
          href: '/accompagnements/conseil',
          icon: 'conseil',
          badge: 'New',
        },
        {
          kicker: 'Operations',
          title: 'Technical assistance',
          description: 'Operational support during and after a cybersecurity incident.',
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
      kicker: 'Section',
      title: 'Publications',
      description: 'Alerts, reports, guides and official CSIRT-ARPT communications.',
      cta: { label: 'Browse the media library', href: '/mediatheque' },
      sectionLabel: 'Quick navigation',
      seeAllHref: '/publications',
      featured: {
        label: 'Featured',
        title: 'Alerts and advisories',
        description: 'Browse the latest official publications from CSIRT-ARPT.',
      },
      cards: [
        {
          kicker: 'Official feed',
          title: 'News',
          description: 'Information and alerts recently published by CSIRT-ARPT.',
          href: '/actualites',
          icon: 'actualites',
        },
        {
          kicker: 'Analysis',
          title: 'Reports',
          description: 'Activity reports, analyses and summary documents.',
          href: '/rapports',
          icon: 'rapports',
        },
        {
          kicker: 'Resources',
          title: 'Guides and manuals',
          description: 'Practical guides to secure systems and report an incident.',
          href: '/guides',
          icon: 'guides',
        },
        {
          kicker: 'Official',
          title: 'Press releases',
          description: 'Official statements and information notes for the public.',
          href: '/publications/communiques',
          icon: 'communiques',
        },
      ],
    },
  },
  {
    label: 'Best practices',
    href: '/bonnes-pratiques',
    mega: {
      kicker: 'Section',
      title: 'Best practices',
      description: 'Cybersecurity habits tailored to individuals, businesses and institutions.',
      cta: { label: 'Browse guides', href: '/bonnes-pratiques' },
      sectionLabel: 'Quick navigation',
      seeAllHref: '/bonnes-pratiques',
      featured: {
        label: 'Featured',
        title: 'First steps',
        description: 'Essential actions before, during and after a cybersecurity incident.',
      },
      cards: [
        {
          kicker: 'Public',
          title: 'For individuals',
          description: 'Essential steps to protect your accounts, devices and personal data.',
          href: '/bonnes-pratiques/particuliers',
          icon: 'particuliers',
        },
        {
          kicker: 'Organizations',
          title: 'For businesses',
          description: 'Organizational and technical measures to reduce cyber risk.',
          href: '/bonnes-pratiques/entreprises',
          icon: 'entreprises',
        },
        {
          kicker: 'Government',
          title: 'For institutions',
          description: 'Recommendations for administrations and critical infrastructure operators.',
          href: '/bonnes-pratiques/institutions',
          icon: 'institutions',
        },
        {
          kicker: 'Help',
          title: 'Reporting FAQ',
          description: 'Frequently asked questions about reporting an incident promptly.',
          href: '/bonnes-pratiques#faq',
          icon: 'incidents',
        },
      ],
    },
  },
  {
    label: 'Certified audit experts',
    href: '/experts-auditeurs',
  },
]
