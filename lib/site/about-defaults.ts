import { CSIRT_BRAND } from '@/lib/csirt/brand'
import type { SiteAboutContent, SiteAboutPair, SiteAboutText } from '@/lib/site/types'

export const DEFAULT_ABOUT_CONTENT: SiteAboutContent = {
  crumbLabel: 'À propos',
  eyebrow: `${CSIRT_BRAND.parent} · ${CSIRT_BRAND.country}`,
  titleLead: 'Centre national de réponse aux incidents',
  titleAccent: 'de cybersécurité',
  primaryLabel: 'Signaler un incident',
  primaryHref: '/signalement',
  secondaryLabel: 'Découvrir nos missions',
  secondaryHref: '#missions',
  plateKicker: 'Point de contact national',
  plateName: CSIRT_BRAND.name,
  plateSubtitle: CSIRT_BRAND.fullName,
  plateRows: [
    { label: 'Tutelle', value: CSIRT_BRAND.parent },
    { label: 'Pays', value: CSIRT_BRAND.country },
    { label: 'Secteur', value: 'Postes et télécommunications' },
  ],
  facts: [
    { label: 'Disponibilité', value: '24h/24 · 7j/7' },
    { label: 'Équipe', value: 'Spécialistes dédiés' },
    { label: 'Coordination', value: 'Nationale' },
    { label: 'Traitement', value: 'Confidentiel' },
  ],
  missionKicker: '01 — Notre mission',
  missionTitle: 'Protéger, anticiper et coordonner',
  missionBody: `Le ${CSIRT_BRAND.name} est le point de contact national pour la gestion des incidents de cybersécurité du secteur des postes et télécommunications. Il coordonne la réponse aux incidents, sensibilise les institutions, les opérateurs et les organisations, et contribue à renforcer la résilience et la sécurité de l’espace numérique guinéen.`,
  visionTitle: 'Notre vision',
  visionBody:
    'Faire de la Guinée un espace numérique plus sûr, où les institutions, les opérateurs et les citoyens peuvent compter sur une réponse fiable aux incidents de cybersécurité.',
  valuesTitle: 'Nos valeurs',
  valuesBody:
    'Réactivité, confidentialité, coopération et excellence opérationnelle au service de la confiance numérique.',
  missionsKicker: '02 — Mandat',
  missionsTitle: 'Nos principales missions',
  missions: [
    {
      title: 'Veille et anticipation',
      body: 'Surveillance des menaces et diffusion d’alertes pour anticiper les risques.',
    },
    {
      title: 'Prévention et sensibilisation',
      body: 'Accompagnement des acteurs pour renforcer les bonnes pratiques de sécurité.',
    },
    {
      title: 'Réponse aux incidents',
      body: 'Analyse, qualification et traitement des signalements de cybersécurité.',
    },
    {
      title: 'Coordination et coopération',
      body: 'Liaison avec les institutions, les opérateurs et les partenaires nationaux et internationaux.',
    },
  ],
  flowKicker: '03 — Méthode',
  flowTitle: 'Comment nous intervenons',
  flowLead: 'Quatre étapes, de la réception du signalement jusqu’à la clôture.',
  steps: [
    { title: 'Recevoir', body: 'Signalement reçu et enregistré' },
    { title: 'Analyser', body: 'Qualification, évaluation et priorisation' },
    { title: 'Traiter', body: 'Coordination et actions de réponse' },
    { title: 'Clôturer', body: 'Suivi, retour d’expérience et clôture' },
  ],
  teamKicker: '04 — Gouvernance',
  teamTitle: 'Une équipe au service du secteur numérique',
  teamBody:
    'Des spécialistes mobilisés pour détecter, analyser et traiter les incidents, et accompagner les organisations dans le renforcement de leur posture de sécurité.',
  teamLinkLabel: 'Découvrir notre équipe',
  teamLinkHref: '/historique',
  engagementsTitle: 'Nos engagements',
  engagements: [
    { title: 'Neutralité', body: 'Une action indépendante au service de l’intérêt général.' },
    { title: 'Impartialité', body: 'Un traitement équitable de chaque signalement.' },
    { title: 'Confidentialité', body: 'La protection des informations transmises.' },
    { title: 'Coopération', body: 'Le travail avec les partenaires nationaux et internationaux.' },
  ],
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function sanitizePair(raw: unknown, fallback: SiteAboutPair): SiteAboutPair {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    label: asString(row.label, fallback.label),
    value: asString(row.value, fallback.value),
  }
}

function sanitizeText(raw: unknown, fallback: SiteAboutText): SiteAboutText {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    title: asString(row.title, fallback.title),
    body: asString(row.body, fallback.body),
  }
}

function sanitizeList<T>(raw: unknown, fallback: T[], map: (item: unknown, fallback: T) => T): T[] {
  const rows = Array.isArray(raw) ? raw : []
  return fallback.map((item, index) => map(rows[index], item))
}

export function sanitizeAboutContent(
  raw: unknown,
  fallback: SiteAboutContent = DEFAULT_ABOUT_CONTENT
): SiteAboutContent {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    crumbLabel: asString(row.crumbLabel, fallback.crumbLabel),
    eyebrow: asString(row.eyebrow, fallback.eyebrow),
    titleLead: asString(row.titleLead, fallback.titleLead),
    titleAccent: asString(row.titleAccent, fallback.titleAccent),
    primaryLabel: asString(row.primaryLabel, fallback.primaryLabel),
    primaryHref: asString(row.primaryHref, fallback.primaryHref) || fallback.primaryHref,
    secondaryLabel: asString(row.secondaryLabel, fallback.secondaryLabel),
    secondaryHref: asString(row.secondaryHref, fallback.secondaryHref) || fallback.secondaryHref,
    plateKicker: asString(row.plateKicker, fallback.plateKicker),
    plateName: asString(row.plateName, fallback.plateName),
    plateSubtitle: asString(row.plateSubtitle, fallback.plateSubtitle),
    plateRows: sanitizeList(row.plateRows, fallback.plateRows, sanitizePair),
    facts: sanitizeList(row.facts, fallback.facts, sanitizePair),
    missionKicker: asString(row.missionKicker, fallback.missionKicker),
    missionTitle: asString(row.missionTitle, fallback.missionTitle),
    missionBody: asString(row.missionBody, fallback.missionBody),
    visionTitle: asString(row.visionTitle, fallback.visionTitle),
    visionBody: asString(row.visionBody, fallback.visionBody),
    valuesTitle: asString(row.valuesTitle, fallback.valuesTitle),
    valuesBody: asString(row.valuesBody, fallback.valuesBody),
    missionsKicker: asString(row.missionsKicker, fallback.missionsKicker),
    missionsTitle: asString(row.missionsTitle, fallback.missionsTitle),
    missions: sanitizeList(row.missions, fallback.missions, sanitizeText),
    flowKicker: asString(row.flowKicker, fallback.flowKicker),
    flowTitle: asString(row.flowTitle, fallback.flowTitle),
    flowLead: asString(row.flowLead, fallback.flowLead),
    steps: sanitizeList(row.steps, fallback.steps, sanitizeText),
    teamKicker: asString(row.teamKicker, fallback.teamKicker),
    teamTitle: asString(row.teamTitle, fallback.teamTitle),
    teamBody: asString(row.teamBody, fallback.teamBody),
    teamLinkLabel: asString(row.teamLinkLabel, fallback.teamLinkLabel),
    teamLinkHref: asString(row.teamLinkHref, fallback.teamLinkHref) || fallback.teamLinkHref,
    engagementsTitle: asString(row.engagementsTitle, fallback.engagementsTitle),
    engagements: sanitizeList(row.engagements, fallback.engagements, sanitizeText),
  }
}
