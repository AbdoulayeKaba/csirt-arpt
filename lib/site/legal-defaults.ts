import { CSIRT_BRAND } from '@/lib/csirt/brand'
import type {
  SiteA11yContent,
  SiteMentionsContent,
  SitePrivacyContent,
} from '@/lib/site/types'

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function sanitizeCard(
  raw: unknown,
  fallback: { icon: string; title: string; body: string }
) {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    icon: asString(row.icon, fallback.icon) || fallback.icon,
    title: asString(row.title, fallback.title),
    body: asString(row.body, fallback.body),
  }
}

function sanitizeTextItem(raw: unknown, fallback: { title: string; body: string }) {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    title: asString(row.title, fallback.title),
    body: asString(row.body, fallback.body),
  }
}

function sanitizeContact(
  raw: unknown,
  fallback: { label: string; value: string; href: string }
) {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    label: asString(row.label, fallback.label),
    value: asString(row.value, fallback.value),
    href: asString(row.href, fallback.href),
  }
}

function sanitizeCta(
  raw: unknown,
  fallback: { label: string; href: string }
) {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    label: asString(row.label, fallback.label),
    href: asString(row.href, fallback.href),
  }
}

export const DEFAULT_MENTIONS_CONTENT: SiteMentionsContent = {
  eyebrow: 'Informations institutionnelles',
  badges: ['Portail officiel', 'ARPT — République de Guinée'],
  blocksTitle: 'Informations légales',
  blocksLead: 'Éléments d’identification et de responsabilité relatifs au site public.',
  blocks: [
    {
      icon: 'building',
      title: 'Éditeur du site',
      body: `Autorité de Régulation des Postes et Télécommunications (ARPT) — ${CSIRT_BRAND.name}, République de Guinée.`,
    },
    {
      icon: 'scale',
      title: 'Responsabilité éditoriale',
      body: 'Les contenus publiés sur ce portail relèvent du CSIRT-ARPT dans le cadre de sa mission nationale de cybersécurité.',
    },
    {
      icon: 'server',
      title: 'Hébergement',
      body: 'Infrastructure et sous-domaine gérés sous la responsabilité de l’ARPT / CSIRT-ARPT, conformément aux dispositifs techniques en vigueur.',
    },
    {
      icon: 'globe',
      title: 'Propriété intellectuelle',
      body: 'Textes, visuels et documents officiels sont protégés. Toute reproduction nécessite une autorisation préalable, sauf usage strictement privé.',
    },
  ],
  contactTitle: 'Coordonnées éditoriales',
  contactLead: 'Pour toute demande relative aux contenus ou à l’édition du portail.',
  contacts: [
    { label: 'E-mail', value: CSIRT_BRAND.email, href: CSIRT_BRAND.mailto },
    { label: 'Site officiel', value: CSIRT_BRAND.siteHost, href: '' },
    { label: 'Adresse', value: CSIRT_BRAND.address, href: '' },
  ],
}

export const DEFAULT_PRIVACY_CONTENT: SitePrivacyContent = {
  eyebrow: 'Protection des données',
  badges: [
    'Traitement confidentiel',
    'Signalement anonyme possible',
    'Cadre institutionnel ARPT',
  ],
  principlesTitle: 'Principes applicables',
  principlesLead: 'Engagements structurants pour la collecte et l’usage des données sur le portail.',
  principles: [
    {
      icon: 'lock',
      title: 'Confidentialité des signalements',
      body: 'Les déclarations d’incident sont traitées de manière confidentielle par l’équipe CSIRT-ARPT.',
    },
    {
      icon: 'database',
      title: 'Minimisation des données',
      body: 'Seules les informations nécessaires à la qualification et à la réponse à incident sont collectées.',
    },
    {
      icon: 'share',
      title: 'Pas de diffusion abusive',
      body: 'Aucune cession commerciale des données. Partage limité aux besoins opérationnels strictement justifiés.',
    },
    {
      icon: 'user',
      title: 'Droits des personnes',
      body: 'Vous pouvez demander des précisions sur le traitement de vos données via les canaux officiels.',
    },
  ],
  sectionsTitle: 'Périmètre du traitement',
  sectionsLead: 'Ce que couvre la politique pour les usages du site public CSIRT-ARPT.',
  sections: [
    {
      title: 'Données collectées',
      body: 'Selon le parcours : identité ou anonymat, coordonnées professionnelles, nature de l’incident, description technique, pièces jointes utiles à l’analyse.',
    },
    {
      title: 'Finalités du traitement',
      body: 'Qualification des signalements, coordination de la réponse, statistiques de cybersécurité et amélioration du dispositif national.',
    },
    {
      title: 'Durée de conservation',
      body: 'Conservation limitée à la durée nécessaire au suivi opérationnel, à la traçabilité institutionnelle et aux obligations applicables.',
    },
    {
      title: 'Sécurité des traitements',
      body: 'Mesures organisationnelles et techniques visant à protéger l’intégrité, la disponibilité et la confidentialité des informations.',
    },
  ],
  assistKicker: 'Contact confidentialité',
  assistTitle: 'Une question sur vos données ?',
  assistBody:
    'Pour toute demande relative au traitement de vos informations personnelles ou à un signalement, écrivez au CSIRT-ARPT. Une réponse vous sera apportée via les canaux officiels.',
  primaryCta: { label: CSIRT_BRAND.email, href: CSIRT_BRAND.mailto },
  secondaryCta: { label: 'Page Contacts', href: '/contacts' },
  note: 'Cette politique peut être précisée et enrichie au rythme des évolutions du portail et du cadre applicable.',
}

export const DEFAULT_A11Y_CONTENT: SiteA11yContent = {
  eyebrow: 'Engagement institutionnel',
  badges: ['Portail officiel CSIRT-ARPT', 'Démarche d’amélioration continue'],
  pillarsTitle: 'Nos axes d’accessibilité',
  pillarsLead: 'Quatre priorités pour un accès fiable aux services numériques de cybersécurité.',
  pillars: [
    {
      icon: 'eye',
      title: 'Lisibilité',
      body: 'Contrastes renforcés, typographie claire et hiérarchie visuelle stable sur l’ensemble du portail.',
    },
    {
      icon: 'keyboard',
      title: 'Navigation clavier',
      body: 'Parcours utilisable au clavier, focus visible et enchaînement logique des zones interactives.',
    },
    {
      icon: 'monitor',
      title: 'Multi-supports',
      body: 'Adaptation aux écrans mobiles, tablettes et postes de travail sans perte d’information essentielle.',
    },
    {
      icon: 'ear',
      title: 'Contenus compréhensibles',
      body: 'Formulations institutionnelles claires, intitulés explicites et structure sémantique des pages.',
    },
  ],
  measuresTitle: 'Mesures mises en œuvre',
  measuresLead:
    'Dispositions techniques et éditoriales déjà engagées sur le site public, avec renforcement progressif.',
  measures: [
    {
      title: 'Structure sémantique',
      body: 'Titres hiérarchisés, listes structurées et zones de contenu identifiables pour les technologies d’assistance.',
    },
    {
      title: 'Alternatives textuelles',
      body: 'Descriptions pertinentes pour les images informatives et éléments non textuels essentiels.',
    },
    {
      title: 'Formulaires accessibles',
      body: 'Libellés associés, messages d’erreur explicites et contrôles compréhensibles (signalement, contacts).',
    },
    {
      title: 'Amélioration continue',
      body: 'Corrections progressives des écarts constatés, tests réguliers et priorisation des parcours critiques.',
    },
  ],
  assistKicker: 'Assistance',
  assistTitle: 'Besoin d’aide pour accéder à un contenu ?',
  assistBody:
    'Si vous rencontrez une difficulté d’accès à une page, un document ou un formulaire, contactez le CSIRT-ARPT. Nous vous apportons une alternative dans les meilleurs délais.',
  primaryCta: { label: CSIRT_BRAND.email, href: CSIRT_BRAND.mailto },
  secondaryCta: { label: 'Page Contacts', href: '/contacts' },
  note: 'Cette déclaration d’accessibilité sera enrichie au fur et à mesure des audits et correctifs déployés sur le portail.',
}

export function sanitizeMentionsContent(
  raw: unknown,
  fallback: SiteMentionsContent = DEFAULT_MENTIONS_CONTENT
): SiteMentionsContent {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const badgesRaw = Array.isArray(row.badges) ? row.badges : []
  const blocksRaw = Array.isArray(row.blocks) ? row.blocks : []
  const contactsRaw = Array.isArray(row.contacts) ? row.contacts : []
  return {
    eyebrow: asString(row.eyebrow, fallback.eyebrow),
    badges: fallback.badges.map((item, i) => asString(badgesRaw[i], item)),
    blocksTitle: asString(row.blocksTitle, fallback.blocksTitle),
    blocksLead: asString(row.blocksLead, fallback.blocksLead),
    blocks: fallback.blocks.map((item, i) => sanitizeCard(blocksRaw[i], item)),
    contactTitle: asString(row.contactTitle, fallback.contactTitle),
    contactLead: asString(row.contactLead, fallback.contactLead),
    contacts: fallback.contacts.map((item, i) => sanitizeContact(contactsRaw[i], item)),
  }
}

export function sanitizePrivacyContent(
  raw: unknown,
  fallback: SitePrivacyContent = DEFAULT_PRIVACY_CONTENT
): SitePrivacyContent {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const badgesRaw = Array.isArray(row.badges) ? row.badges : []
  const principlesRaw = Array.isArray(row.principles) ? row.principles : []
  const sectionsRaw = Array.isArray(row.sections) ? row.sections : []
  return {
    eyebrow: asString(row.eyebrow, fallback.eyebrow),
    badges: fallback.badges.map((item, i) => asString(badgesRaw[i], item)),
    principlesTitle: asString(row.principlesTitle, fallback.principlesTitle),
    principlesLead: asString(row.principlesLead, fallback.principlesLead),
    principles: fallback.principles.map((item, i) => sanitizeCard(principlesRaw[i], item)),
    sectionsTitle: asString(row.sectionsTitle, fallback.sectionsTitle),
    sectionsLead: asString(row.sectionsLead, fallback.sectionsLead),
    sections: fallback.sections.map((item, i) => sanitizeTextItem(sectionsRaw[i], item)),
    assistKicker: asString(row.assistKicker, fallback.assistKicker),
    assistTitle: asString(row.assistTitle, fallback.assistTitle),
    assistBody: asString(row.assistBody, fallback.assistBody),
    primaryCta: sanitizeCta(row.primaryCta, fallback.primaryCta),
    secondaryCta: sanitizeCta(row.secondaryCta, fallback.secondaryCta),
    note: asString(row.note, fallback.note),
  }
}

export function sanitizeA11yContent(
  raw: unknown,
  fallback: SiteA11yContent = DEFAULT_A11Y_CONTENT
): SiteA11yContent {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const badgesRaw = Array.isArray(row.badges) ? row.badges : []
  const pillarsRaw = Array.isArray(row.pillars) ? row.pillars : []
  const measuresRaw = Array.isArray(row.measures) ? row.measures : []
  return {
    eyebrow: asString(row.eyebrow, fallback.eyebrow),
    badges: fallback.badges.map((item, i) => asString(badgesRaw[i], item)),
    pillarsTitle: asString(row.pillarsTitle, fallback.pillarsTitle),
    pillarsLead: asString(row.pillarsLead, fallback.pillarsLead),
    pillars: fallback.pillars.map((item, i) => sanitizeCard(pillarsRaw[i], item)),
    measuresTitle: asString(row.measuresTitle, fallback.measuresTitle),
    measuresLead: asString(row.measuresLead, fallback.measuresLead),
    measures: fallback.measures.map((item, i) => sanitizeTextItem(measuresRaw[i], item)),
    assistKicker: asString(row.assistKicker, fallback.assistKicker),
    assistTitle: asString(row.assistTitle, fallback.assistTitle),
    assistBody: asString(row.assistBody, fallback.assistBody),
    primaryCta: sanitizeCta(row.primaryCta, fallback.primaryCta),
    secondaryCta: sanitizeCta(row.secondaryCta, fallback.secondaryCta),
    note: asString(row.note, fallback.note),
  }
}

/** Anciens placeholders catalogue à remplacer par le contenu ultra-pro. */
export const LEGAL_PLACEHOLDER_LEADS = new Set([
  'Éditeur : Autorité de Régulation des Postes et Télécommunications — CSIRT-ARPT, République de Guinée.',
  'Les signalements sont traités de façon confidentielle par le CSIRT-ARPT.',
  'L’accessibilité complète du site est prévue progressivement.',
])

export const LEGAL_PLACEHOLDER_BODIES = new Set([
  '',
  'La politique détaillée sera publiée avec le durcissement de la plateforme et l’espace documentaire.',
])

export function isLegalTipTapSeedBody(body: string) {
  const trimmed = body.trim()
  if (!trimmed) return true
  if (LEGAL_PLACEHOLDER_BODIES.has(trimmed)) return true
  return (
    trimmed.includes('<h2>Informations légales</h2>') ||
    trimmed.includes('<h2>Principes applicables</h2>') ||
    trimmed.includes('<h2>Nos axes d’accessibilité</h2>') ||
    trimmed.includes("<h2>Nos axes d'accessibilité</h2>")
  )
}
