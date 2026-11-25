export type SitemapTone = 'green' | 'red' | 'ink'

export type SitemapLink = {
  href: string
  title: string
  description: string
  kicker?: string
}

export type SitemapSection = {
  id: string
  title: string
  lead: string
  tone: SitemapTone
  links: SitemapLink[]
}

/** Cartographie publique du site CSIRT-ARPT, alignée sur la navigation officielle. */
export const CSIRT_SITEMAP_SECTIONS: readonly SitemapSection[] = [
  {
    id: 'institution',
    title: 'Institution & missions',
    lead: 'Présentation du CSIRT-ARPT, de son mandat national et de son organisation.',
    tone: 'green',
    links: [
      {
        href: '/',
        title: 'Accueil',
        kicker: 'Portail',
        description: 'Point d’entrée officiel : alertes, actualités et accès aux services essentiels.',
      },
      {
        href: '/csirt-arpt',
        title: 'CSIRT-ARPT',
        kicker: 'Institution',
        description: 'Mandat, valeurs et rôle dans la protection de l’espace numérique guinéen.',
      },
      {
        href: '/csirt-arpt#missions',
        title: 'Nos missions',
        kicker: 'Mandat',
        description: 'Prévention, analyse et réponse aux incidents de cybersécurité.',
      },
      {
        href: '/historique',
        title: 'Historique',
        kicker: 'Mémoire',
        description: 'Les étapes fondatrices de la cybersécurité nationale en République de Guinée.',
      },
    ],
  },
  {
    id: 'reponse',
    title: 'Signalement & réponse',
    lead: 'Canaux officiels pour déclarer un incident et suivre la prise en charge.',
    tone: 'red',
    links: [
      {
        href: '/signalement',
        title: 'Signaler un incident',
        kicker: 'Urgence',
        description: 'Formulaire confidentiel de déclaration d’incident, disponible 24h/24.',
      },
      {
        href: '/signalement/suivi',
        title: 'Suivi de signalement',
        kicker: 'Suivi',
        description: 'Consultez l’état d’avancement d’un dossier à partir de sa référence.',
      },
      {
        href: '/contacts',
        title: 'Contacts',
        kicker: 'Relation',
        description: 'Coordonnées institutionnelles et canaux de contact du CSIRT-ARPT.',
      },
      {
        href: '/abonnement',
        title: 'Alertes & abonnement',
        kicker: 'Veille',
        description: 'Recevez les alertes et publications officielles du CSIRT-ARPT.',
      },
    ],
  },
  {
    id: 'cadre',
    title: 'Cadre & accompagnement',
    lead: 'Référentiels, conformité et appui opérationnel aux acteurs du numérique.',
    tone: 'ink',
    links: [
      {
        href: '/reglementations',
        title: 'Réglementations',
        kicker: 'Cadre',
        description: 'Lois, décrets, normes et veille réglementaire du secteur.',
      },
      {
        href: '/accompagnements',
        title: 'Accompagnements',
        kicker: 'Appui',
        description: 'Audit, conseil, assistance technique et montée en compétence.',
      },
      {
        href: '/formations',
        title: 'Formations',
        kicker: 'Compétences',
        description: 'Sessions de sensibilisation et formation à la cybersécurité.',
      },
      {
        href: '/experts-auditeurs',
        title: 'Experts auditeurs certifiés',
        kicker: 'Expertise',
        description: 'Répertoire des experts et auditeurs reconnus pour le secteur.',
      },
      {
        href: '/agrements',
        title: 'Agréments',
        kicker: 'Qualité',
        description: 'Dispositifs d’agrément et de reconnaissance professionnelle.',
      },
      {
        href: '/espace-rssi',
        title: 'Espace RSSI',
        kicker: 'Professionnels',
        description: 'Ressources dédiées aux responsables de la sécurité des systèmes d’information.',
      },
    ],
  },
  {
    id: 'publications',
    title: 'Publications & vigilance',
    lead: 'Actualités, analyses, guides pratiques et ressources multimédias.',
    tone: 'green',
    links: [
      {
        href: '/actualites',
        title: 'Actualités',
        kicker: 'Fil officiel',
        description: 'Informations et alertes récemment publiées par le CSIRT-ARPT.',
      },
      {
        href: '/publications',
        title: 'Publications',
        kicker: 'Documents',
        description: 'Alertes, notes, communiqués et documents officiels.',
      },
      {
        href: '/rapports',
        title: 'Rapports',
        kicker: 'Analyses',
        description: 'Rapports d’activité, synthèses et documents de référence.',
      },
      {
        href: '/guides',
        title: 'Guides et manuels',
        kicker: 'Ressources',
        description: 'Guides pratiques pour sécuriser les systèmes et signaler un incident.',
      },
      {
        href: '/bonnes-pratiques',
        title: 'Bonnes pratiques',
        kicker: 'Prévention',
        description: 'Réflexes de cybersécurité pour particuliers, entreprises et institutions.',
      },
      {
        href: '/mediatheque',
        title: 'Médiathèque',
        kicker: 'Médias',
        description: 'Vidéos, reportages et interventions officielles en ligne.',
      },
      {
        href: '/panorama-menaces',
        title: 'Panorama des menaces',
        kicker: 'Vigilance',
        description: 'Vue d’ensemble des menaces et tendances observées.',
      },
      {
        href: '/veille-vulnerabilites',
        title: 'Veille vulnérabilités',
        kicker: 'Technique',
        description: 'Suivi des vulnérabilités et recommandations associées.',
      },
    ],
  },
  {
    id: 'legal',
    title: 'Informations légales',
    lead: 'Pages d’information institutionnelle, confiance et accessibilité.',
    tone: 'ink',
    links: [
      {
        href: '/espace-confiance',
        title: 'Espace de confiance',
        kicker: 'Confiance',
        description: 'Engagements du CSIRT-ARPT en matière de confidentialité et d’intégrité.',
      },
      {
        href: '/mentions-legales',
        title: 'Mentions légales',
        kicker: 'Légal',
        description: 'Informations légales relatives à l’édition et à l’hébergement du site.',
      },
      {
        href: '/confidentialite',
        title: 'Confidentialité',
        kicker: 'Données',
        description: 'Politique de protection des données personnelles collectées.',
      },
      {
        href: '/accessibilite',
        title: 'Accessibilité',
        kicker: 'Inclusion',
        description: 'Engagements et informations relatifs à l’accessibilité du portail.',
      },
      {
        href: '/recherche',
        title: 'Recherche',
        kicker: 'Navigation',
        description: 'Recherchez une page, une publication ou une ressource sur le site.',
      },
    ],
  },
] as const
