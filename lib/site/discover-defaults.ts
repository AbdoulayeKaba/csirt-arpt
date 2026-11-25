import { CSIRT_BRAND } from '@/lib/csirt/brand'
import type {
  SiteDiscoverContent,
  SiteDiscoverGovCard,
  SiteDiscoverMission,
  SiteDiscoverStat,
  SiteDiscoverStripItem,
  SiteDiscoverTimelineStep,
} from '@/lib/site/types'

export const DEFAULT_DISCOVER_CONTENT: SiteDiscoverContent = {
  strip: [
    { label: 'Portail officiel', value: CSIRT_BRAND.siteHost },
    { label: 'Mandat', value: 'Réponse aux incidents' },
    { label: 'Couverture', value: 'Nationale · 24h/24' },
    { label: 'Alignement', value: 'FIRST · CERT-FR · ENISA' },
  ],
  stats: [
    { value: '24/7', label: 'Disponibilité', desc: 'Prise en charge continue' },
    { value: '3', label: 'Référentiels', desc: 'FIRST · CERT-FR · ENISA' },
    { value: '100%', label: 'Couverture nationale', desc: 'Opérateurs & administrations' },
  ],
  missionsKicker: 'Missions',
  missionsTitle: 'Une mission nationale de cybersécurité',
  missionsLead: `Le ${CSIRT_BRAND.name} assure la veille, la réception des signalements et la coordination opérationnelle pour renforcer la résilience du secteur des postes et télécommunications.`,
  missions: [
    {
      icon: 'eye',
      title: 'Veille et alerte',
      body: 'Surveillance des menaces et diffusion d’alertes auprès des opérateurs, FAI et administrations.',
    },
    {
      icon: 'siren',
      title: 'Réception des signalements',
      body: 'Canal officiel unique pour qualifier et prioriser les incidents de cybersécurité.',
    },
    {
      icon: 'radio',
      title: 'Coordination',
      body: 'Liaison avec les homologues nationaux et internationaux (FIRST, CERT-FR, ENISA).',
    },
    {
      icon: 'headphones',
      title: 'Assistance & accompagnement',
      body: 'Soutien technique aux entités régulées pendant et après un incident de cybersécurité.',
    },
  ],
  missionsImage: '/csirt/discover-ops.jpg',
  missionsImageCaption: 'Capacité de supervision et de coordination opérationnelle',
  visualKicker: 'Présence nationale',
  visualTitle: 'Protéger les réseaux et services régulés',
  visualBody:
    'Une posture institutionnelle claire pour anticiper les menaces, accompagner les acteurs du secteur et maintenir un canal de confiance avec le public.',
  visualImage: '/csirt/discover-network.jpg',
  timelineKicker: 'Historique',
  timelineTitle: 'Construction progressive du CSIRT',
  timeline: [
    {
      year: 'Phase 1',
      title: 'Création et mise en place',
      body: 'Installation du centre opérationnel et des premiers canaux de signalement officiels.',
    },
    {
      year: 'Phase 2',
      title: 'Montée en capacité',
      body: 'Déploiement du portail public, intégration des référentiels internationaux FIRST et CERT-FR.',
    },
    {
      year: 'Phase 3',
      title: 'Opérationnel complet',
      body: 'Supervision 24h/24, accompagnement terrain, publications et veille active.',
    },
  ],
  govKicker: 'Gouvernance',
  govTitle: 'Pilotage éditorial et responsabilité institutionnelle',
  govLead: `Le ${CSIRT_BRAND.name} pilote le contenu officiel du portail et la recette de chaque version, sous l'autorité de l'ARPT.`,
  govCards: [
    {
      icon: 'scale',
      title: 'Cadre institutionnel',
      body: `Mandat de l'ARPT — ${CSIRT_BRAND.country}.`,
    },
    {
      icon: 'shield-check',
      title: 'Référentiels',
      body: 'Alignement FIRST, CERT-FR et ENISA pour la reconnaissance mutuelle.',
    },
    {
      icon: 'globe',
      title: 'Coopération internationale',
      body: 'Échanges d’informations et coordination avec les CERT partenaires.',
    },
    {
      icon: 'shield',
      title: 'Réglementation',
      body: 'Application du RGSSI 2025 et cadre national de cybersécurité.',
    },
    {
      icon: 'building',
      title: 'Siège',
      body: CSIRT_BRAND.address,
    },
    {
      icon: 'headphones',
      title: 'Contact',
      body: `${CSIRT_BRAND.email} — ${CSIRT_BRAND.hours}`,
    },
  ],
  ctaTitle: 'Agir avec le canal officiel',
  ctaLead: 'Signalement, contacts et ressources documentaires sur le portail public.',
  ctaPrimaryLabel: 'Signaler un incident',
  ctaPrimaryHref: '/signalement',
  ctaSecondaryLabel: 'Contacts',
  ctaSecondaryHref: '/contacts',
  heroPrimaryLabel: 'Signaler un incident',
  heroSecondaryLabel: 'Nos missions',
}

const MISSION_ICONS = new Set(['eye', 'siren', 'radio', 'headphones'])
const GOV_ICONS = new Set(['scale', 'shield-check', 'globe', 'shield', 'building', 'headphones'])

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function sanitizeStrip(raw: unknown, fallback: SiteDiscoverStripItem[]): SiteDiscoverStripItem[] {
  if (!Array.isArray(raw) || raw.length === 0) return fallback
  return fallback.map((item, index) => {
    const row = raw[index] && typeof raw[index] === 'object' ? (raw[index] as Record<string, unknown>) : {}
    return {
      label: asString(row.label, item.label),
      value: asString(row.value, item.value),
    }
  })
}

function sanitizeStats(raw: unknown, fallback: SiteDiscoverStat[]): SiteDiscoverStat[] {
  if (!Array.isArray(raw) || raw.length === 0) return fallback
  return fallback.map((item, index) => {
    const row = raw[index] && typeof raw[index] === 'object' ? (raw[index] as Record<string, unknown>) : {}
    return {
      value: asString(row.value, item.value),
      label: asString(row.label, item.label),
      desc: asString(row.desc, item.desc),
    }
  })
}

function sanitizeMissions(raw: unknown, fallback: SiteDiscoverMission[]): SiteDiscoverMission[] {
  if (!Array.isArray(raw) || raw.length === 0) return fallback
  return fallback.map((item, index) => {
    const row = raw[index] && typeof raw[index] === 'object' ? (raw[index] as Record<string, unknown>) : {}
    const icon = asString(row.icon, item.icon)
    return {
      icon: (MISSION_ICONS.has(icon) ? icon : item.icon) as SiteDiscoverMission['icon'],
      title: asString(row.title, item.title),
      body: asString(row.body, item.body),
    }
  })
}

function sanitizeTimeline(
  raw: unknown,
  fallback: SiteDiscoverTimelineStep[]
): SiteDiscoverTimelineStep[] {
  if (!Array.isArray(raw) || raw.length === 0) return fallback
  return fallback.map((item, index) => {
    const row = raw[index] && typeof raw[index] === 'object' ? (raw[index] as Record<string, unknown>) : {}
    return {
      year: asString(row.year, item.year),
      title: asString(row.title, item.title),
      body: asString(row.body, item.body),
    }
  })
}

function sanitizeGovCards(raw: unknown, fallback: SiteDiscoverGovCard[]): SiteDiscoverGovCard[] {
  if (!Array.isArray(raw) || raw.length === 0) return fallback
  return fallback.map((item, index) => {
    const row = raw[index] && typeof raw[index] === 'object' ? (raw[index] as Record<string, unknown>) : {}
    const icon = asString(row.icon, item.icon)
    return {
      icon: (GOV_ICONS.has(icon) ? icon : item.icon) as SiteDiscoverGovCard['icon'],
      title: asString(row.title, item.title),
      body: asString(row.body, item.body),
    }
  })
}

export function sanitizeDiscoverContent(
  raw: unknown,
  fallback: SiteDiscoverContent = DEFAULT_DISCOVER_CONTENT
): SiteDiscoverContent {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    strip: sanitizeStrip(row.strip, fallback.strip),
    stats: sanitizeStats(row.stats, fallback.stats),
    missionsKicker: asString(row.missionsKicker, fallback.missionsKicker),
    missionsTitle: asString(row.missionsTitle, fallback.missionsTitle),
    missionsLead: asString(row.missionsLead, fallback.missionsLead),
    missions: sanitizeMissions(row.missions, fallback.missions),
    missionsImage: asString(row.missionsImage, fallback.missionsImage),
    missionsImageCaption: asString(row.missionsImageCaption, fallback.missionsImageCaption),
    visualKicker: asString(row.visualKicker, fallback.visualKicker),
    visualTitle: asString(row.visualTitle, fallback.visualTitle),
    visualBody: asString(row.visualBody, fallback.visualBody),
    visualImage: asString(row.visualImage, fallback.visualImage),
    timelineKicker: asString(row.timelineKicker, fallback.timelineKicker),
    timelineTitle: asString(row.timelineTitle, fallback.timelineTitle),
    timeline: sanitizeTimeline(row.timeline, fallback.timeline),
    govKicker: asString(row.govKicker, fallback.govKicker),
    govTitle: asString(row.govTitle, fallback.govTitle),
    govLead: asString(row.govLead, fallback.govLead),
    govCards: sanitizeGovCards(row.govCards, fallback.govCards),
    ctaTitle: asString(row.ctaTitle, fallback.ctaTitle),
    ctaLead: asString(row.ctaLead, fallback.ctaLead),
    ctaPrimaryLabel: asString(row.ctaPrimaryLabel, fallback.ctaPrimaryLabel),
    ctaPrimaryHref: asString(row.ctaPrimaryHref, fallback.ctaPrimaryHref),
    ctaSecondaryLabel: asString(row.ctaSecondaryLabel, fallback.ctaSecondaryLabel),
    ctaSecondaryHref: asString(row.ctaSecondaryHref, fallback.ctaSecondaryHref),
    heroPrimaryLabel: asString(row.heroPrimaryLabel, fallback.heroPrimaryLabel),
    heroSecondaryLabel: asString(row.heroSecondaryLabel, fallback.heroSecondaryLabel),
  }
}
