import { CSIRT_BRAND } from '@/lib/csirt/brand'
import { CSIRT_CONTACTS_HREF, CSIRT_SIGNALEMENT_HREF } from '@/lib/csirt/nav'

export type AssistantLink = {
  label: string
  href: string
}

export type AssistantAnswer = {
  text: string
  links?: readonly AssistantLink[]
}

export type AssistantSuggestion = {
  id: string
  label: string
  query: string
  answerText?: string
  links?: readonly AssistantLink[]
}

export type AssistantScope = 'site' | 'signalement'

export type AssistantFaqItem = {
  id: string
  label: string
  query: string
  answerText: string
  links?: AssistantLink[]
  keywords: string[]
  sortOrder: number
  published: boolean
  /** ISO date si l’entrée est en corbeille (soft-delete). */
  archivedAt?: string | null
}

export type AssistantScopeConfig = {
  welcome: string
  items: AssistantFaqItem[]
}

export type AssistantConfig = {
  site: AssistantScopeConfig
  signalement: AssistantScopeConfig
  fallback: AssistantAnswer
}

export const CSIRT_ASSISTANT_WELCOME =
  'Bonjour ! Posez une question ou choisissez une suggestion : CSIRT-ARPT, déclaration d’incident, réglementations, agréments (PASSI, PSCE, PRIS, PDIS, CFSSI), formations, experts auditeurs certifiés, bonnes pratiques.'

export const CSIRT_SIGNALEMENT_ASSISTANT_WELCOME =
  'Bonjour ! Je vous aide à remplir ce signalement : identité ou anonymat, type d’incident, description, preuves, et envoi confidentiel au CSIRT-ARPT.'

export const DEFAULT_ASSISTANT_FALLBACK: AssistantAnswer = {
  text: `Je n’ai pas trouvé de réponse précise. Choisissez une suggestion ou écrivez à ${CSIRT_BRAND.email}. Sujets couverts : CSIRT-ARPT, signalement, réglementations, agréments, formations, experts auditeurs et bonnes pratiques.`,
  links: [
    { label: 'Nous contacter', href: CSIRT_CONTACTS_HREF },
    { label: `Écrire à ${CSIRT_BRAND.email}`, href: CSIRT_BRAND.mailto },
  ],
}

function item(
  partial: Omit<AssistantFaqItem, 'sortOrder' | 'published'> & {
    sortOrder: number
    published?: boolean
  }
): AssistantFaqItem {
  return {
    ...partial,
    links: partial.links ? [...partial.links] : undefined,
    keywords: [...partial.keywords],
    published: partial.published ?? true,
  }
}

/** Seed site : suggestions visibles + sujets libres (published=false → hors rail). */
export const DEFAULT_SITE_ASSISTANT_ITEMS: AssistantFaqItem[] = [
  item({
    id: 'csirt',
    label: 'Qu’est-ce que le CSIRT-ARPT ?',
    query: 'Qu’est-ce que le CSIRT-ARPT ?',
    answerText: `Le ${CSIRT_BRAND.name} est le ${CSIRT_BRAND.fullName} de l’${CSIRT_BRAND.parent}, ${CSIRT_BRAND.country}. Il informe, coordonne et reçoit les signalements d’incidents, en alignement avec les référentiels FIRST, CERT-FR et ENISA.`,
    links: [{ label: 'Découvrir le CSIRT-ARPT', href: '/csirt-arpt' }],
    keywords: [
      'csirt',
      'presentation',
      'qui etes',
      'qui es tu',
      'c est quoi',
      'mission',
      'mandat',
      'institution',
      'arpt',
      'centre de reponse',
    ],
    sortOrder: 10,
  }),
  item({
    id: 'incident',
    label: 'Comment déclarer ou signaler un incident ?',
    query: 'Comment déclarer ou signaler un incident ?',
    answerText: `Tout incident de cybersécurité peut être signalé 24h/24 et 7j/7 via le formulaire officiel, ou par e-mail à ${CSIRT_BRAND.email}. Indiquez si possible l’organisation, la nature de l’incident, la date et l’heure, les systèmes concernés et les mesures déjà prises.`,
    links: [
      { label: 'Signaler un incident', href: CSIRT_SIGNALEMENT_HREF },
      { label: `Écrire à ${CSIRT_BRAND.email}`, href: CSIRT_BRAND.mailto },
    ],
    keywords: [
      'declarer',
      'signaler',
      'signalement',
      'incident',
      'alerte',
      'attaque',
      'ransomware',
      'phishing',
      'compromission',
      'urgence',
    ],
    sortOrder: 20,
  }),
  item({
    id: 'reglementations',
    label: 'Où trouver les réglementations ?',
    query: 'Où trouver les réglementations ?',
    answerText:
      'Le cadre applicable aux réseaux et services régulés est rassemblé dans la rubrique Réglementations : lois et décrets, cadres de référence, normes, et le RGSSI 2025.',
    links: [
      { label: 'Voir les réglementations', href: '/reglementations' },
      { label: 'Lois et décrets', href: '/reglementations/lois-decrets' },
    ],
    keywords: [
      'reglementation',
      'reglementations',
      'loi',
      'decret',
      'texte',
      'rgssi',
      'norme',
      'standard',
      'cadre',
      'referentiel',
      'conformite',
    ],
    sortOrder: 30,
  }),
  item({
    id: 'agrements',
    label: 'Quels agréments (PASSI, PSCE, PRIS…) ?',
    query: 'Quels agréments PASSI PSCE PRIS PDIS CFSSI ?',
    answerText:
      'Les agréments et homologations du périmètre ARPT / CSIRT-ARPT (PASSI, PSCE, PRIS, PDIS, CFSSI) sont présentés dans la rubrique Agréments. Les procédures et listes officielles y sont consolidées au fil des publications.',
    links: [{ label: 'Consulter les agréments', href: '/agrements' }],
    keywords: [
      'agrement',
      'agrements',
      'passi',
      'psce',
      'pris',
      'pdis',
      'cfssi',
      'homologation',
      'qualification',
      'prestataire',
    ],
    sortOrder: 40,
  }),
  item({
    id: 'pratiques',
    label: 'Formations, experts et bonnes pratiques',
    query: 'Formations, experts auditeurs certifiés et bonnes pratiques',
    answerText:
      'Les premiers réflexes : isoler le système touché sans détruire les preuves, noter l’heure et les symptômes, puis signaler sans délai. Des fiches existent pour les particuliers, les entreprises et les institutions.',
    links: [
      { label: 'Bonnes pratiques', href: '/bonnes-pratiques' },
      { label: 'FAQ signalement', href: '/bonnes-pratiques#faq' },
    ],
    keywords: [
      'bonne pratique',
      'bonnes pratiques',
      'reflexe',
      'conseil',
      'proteger',
      'mot de passe',
      'sauvegard',
      'particulier',
      'entreprise',
      'institution',
    ],
    sortOrder: 50,
  }),
  item({
    id: 'accompagnement',
    label: 'Formations, experts et accompagnements',
    query: 'Formations experts auditeurs et bonnes pratiques',
    answerText:
      'Le CSIRT-ARPT publie les formations, l’annuaire des experts auditeurs certifiés et les fiches de bonnes pratiques pour les particuliers, les entreprises et les institutions.',
    links: [
      { label: 'Formations', href: '/formations' },
      { label: 'Experts auditeurs', href: '/experts-auditeurs' },
      { label: 'Bonnes pratiques', href: '/bonnes-pratiques' },
    ],
    keywords: [
      'formations experts',
      'experts auditeurs certifies et bonnes',
      'formations experts auditeurs',
    ],
    sortOrder: 60,
    published: false,
  }),
  item({
    id: 'formations',
    label: 'Quelles formations propose le CSIRT ?',
    query: 'Quelles formations propose le CSIRT-ARPT ?',
    answerText:
      'Le CSIRT-ARPT propose des sessions de sensibilisation et de montée en compétence pour les RSSI, opérateurs et administrations. Le calendrier est publié dans la rubrique Formations.',
    links: [
      { label: 'Voir les formations', href: '/formations' },
      { label: 'Accompagnements', href: '/accompagnements' },
    ],
    keywords: ['formation', 'formations', 'sensibilisation', 'competence', 'rssi', 'calendrier'],
    sortOrder: 70,
    published: false,
  }),
  item({
    id: 'experts',
    label: 'Où trouver les experts auditeurs ?',
    query: 'Où trouver les experts auditeurs certifiés ?',
    answerText:
      'L’annuaire des experts auditeurs certifiés dans le périmètre des réseaux et systèmes d’information est disponible dans la rubrique dédiée.',
    links: [{ label: 'Experts auditeurs certifiés', href: '/experts-auditeurs' }],
    keywords: ['expert', 'experts', 'auditeur', 'auditeurs', 'certifie', 'annuaire'],
    sortOrder: 80,
    published: false,
  }),
  item({
    id: 'contact',
    label: 'Comment contacter le CSIRT-ARPT ?',
    query: 'Comment contacter le CSIRT-ARPT ?',
    answerText: `Le canal officiel est ${CSIRT_BRAND.email}. ${CSIRT_BRAND.hours}. ${CSIRT_BRAND.address}.`,
    links: [
      { label: 'Page contacts', href: CSIRT_CONTACTS_HREF },
      { label: `Écrire à ${CSIRT_BRAND.email}`, href: CSIRT_BRAND.mailto },
    ],
    keywords: [
      'contact',
      'contacter',
      'email',
      'mail',
      'adresse',
      'telephone',
      'joindre',
      'ecrire',
      'horaire',
      'kaloum',
      'conakry',
    ],
    sortOrder: 90,
    published: false,
  }),
]

export const DEFAULT_SIGNALEMENT_ASSISTANT_ITEMS: AssistantFaqItem[] = [
  item({
    id: 'formulaire',
    label: 'Comment remplir ce formulaire ?',
    query: 'Comment remplir ce formulaire de signalement ?',
    answerText:
      'Le signalement se fait en trois blocs : (1) Identité — vous pouvez rester anonyme, (2) Nature — cochez le ou les types d’incident, (3) Détails — décrivez les faits, joignez éventuellement des preuves, puis envoyez. Les champs marqués d’un astérisque sont obligatoires.',
    keywords: [
      'remplir ce formulaire',
      'formulaire de signalement',
      'comment remplir',
      'etape',
      'identite',
      'colonne',
    ],
    sortOrder: 10,
  }),
  item({
    id: 'anonyme',
    label: 'Puis-je rester anonyme ?',
    query: 'Puis-je rester anonyme pour signaler un incident ?',
    answerText:
      'Oui. Choisissez « Non » à la question d’identité : le signalement est alors traité sans vos coordonnées. Si vous choisissez « Oui », seuls le CSIRT-ARPT y a accès, de façon confidentielle.',
    keywords: ['anonyme', 'anonymat', 'sans identite', 'rester anonyme', 'confidential'],
    sortOrder: 20,
  }),
  item({
    id: 'types',
    label: 'Quels types d’incidents déclarer ?',
    query: 'Quels types d’incidents puis-je déclarer ?',
    answerText:
      'Vous pouvez déclarer notamment : attaques réseau, intrusion, code malveillant, hameçonnage, déni de service, compromission de compte, fuite de données, fraude, vulnérabilité, ou un autre type via le filtre de la colonne Nature.',
    keywords: [
      'types d incidents',
      'type d incident',
      'quelles categories',
      'attaques reseau',
      'filtrer les types',
    ],
    sortOrder: 30,
  }),
  item({
    id: 'description',
    label: 'Que mettre dans la description ?',
    query: 'Que mettre dans la description détaillée ?',
    answerText:
      'Dans la description, indiquez chronologie, systèmes touchés, symptômes, impact et toute action déjà menée. Le champ « Mesures correctives » est facultatif : isolement, mot de passe changé, restauration, etc.',
    keywords: [
      'description detaillee',
      'que mettre dans la description',
      'quoi ecrire',
      'mesures correctives',
    ],
    sortOrder: 40,
  }),
  item({
    id: 'preuves',
    label: 'Comment joindre des preuves ?',
    query: 'Comment joindre des preuves ou des fichiers ?',
    answerText:
      'Déposez captures d’écran, journaux ou fichiers dans la zone « Glisser-déposer ou parcourir ». Évitez les malwares exécutables : préférez des captures, extraits de logs ou archives. Ne détruisez pas les preuves en nettoyant trop tôt les systèmes.',
    keywords: [
      'joindre des preuves',
      'piece jointe',
      'fichier',
      'capture',
      'glisser deposer',
      'preuves',
    ],
    sortOrder: 50,
  }),
]

export function buildDefaultAssistantConfig(): AssistantConfig {
  return {
    site: {
      welcome: CSIRT_ASSISTANT_WELCOME,
      items: DEFAULT_SITE_ASSISTANT_ITEMS.map((entry) => ({
        ...entry,
        links: entry.links ? entry.links.map((link) => ({ ...link })) : undefined,
        keywords: [...entry.keywords],
      })),
    },
    signalement: {
      welcome: CSIRT_SIGNALEMENT_ASSISTANT_WELCOME,
      items: DEFAULT_SIGNALEMENT_ASSISTANT_ITEMS.map((entry) => ({
        ...entry,
        links: entry.links ? entry.links.map((link) => ({ ...link })) : undefined,
        keywords: [...entry.keywords],
      })),
    },
    fallback: {
      text: DEFAULT_ASSISTANT_FALLBACK.text,
      links: DEFAULT_ASSISTANT_FALLBACK.links
        ? DEFAULT_ASSISTANT_FALLBACK.links.map((link) => ({ ...link }))
        : undefined,
    },
  }
}

/** @deprecated Prefer scope suggestions from store / API. */
export const CSIRT_ASSISTANT_SUGGESTIONS: readonly AssistantSuggestion[] =
  DEFAULT_SITE_ASSISTANT_ITEMS.filter((entry) => entry.published).map((entry) => ({
    id: entry.id,
    label: entry.label,
    query: entry.query,
    answerText: entry.answerText,
    links: entry.links,
  }))

/** @deprecated Prefer scope suggestions from store / API. */
export const CSIRT_SIGNALEMENT_ASSISTANT_SUGGESTIONS: readonly AssistantSuggestion[] =
  DEFAULT_SIGNALEMENT_ASSISTANT_ITEMS.filter((entry) => entry.published).map((entry) => ({
    id: entry.id,
    label: entry.label,
    query: entry.query,
    answerText: entry.answerText,
    links: entry.links,
  }))

export function normalizeAssistantQuery(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function listPublishedSuggestions(
  config: AssistantConfig,
  scope: AssistantScope
): AssistantSuggestion[] {
  return [...config[scope].items]
    .filter((entry) => entry.published && !entry.archivedAt)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, 'fr'))
    .map((entry) => ({
      id: entry.id,
      label: entry.label,
      query: entry.query,
      answerText: entry.answerText,
      links: entry.links,
    }))
}

export function answerById(
  config: AssistantConfig,
  scope: AssistantScope,
  id: string
): AssistantAnswer | null {
  const found = config[scope].items.find((entry) => entry.id === id && !entry.archivedAt)
  if (!found) return null
  return {
    text: found.answerText,
    links: found.links,
  }
}

export function answerFromConfig(
  config: AssistantConfig,
  scope: AssistantScope,
  query: string
): AssistantAnswer {
  const q = normalizeAssistantQuery(query)
  if (!q) return config.fallback

  if (/^(bonjour|salut|bonsoir|hello|hi|coucou|merci|ok|daccord|d accord)\b/.test(q)) {
    return { text: config[scope].welcome }
  }

  // Matching keywords : items publiés + hors rail (published=false) pour le texte libre.
  let bestScore = 0
  let best: AssistantAnswer = config.fallback

  for (const topic of config[scope].items) {
    if (topic.archivedAt) continue
    let score = 0
    for (const keyword of topic.keywords) {
      const normalizedKeyword = normalizeAssistantQuery(keyword)
      if (normalizedKeyword && q.includes(normalizedKeyword)) {
        score += normalizedKeyword.length
      }
    }
    if (score > bestScore) {
      bestScore = score
      best = { text: topic.answerText, links: topic.links }
    }
  }

  // Aussi scorer les items de l’autre scope pour les questions transverses (site ↔ signalement).
  const otherScope: AssistantScope = scope === 'site' ? 'signalement' : 'site'
  for (const topic of config[otherScope].items) {
    if (topic.archivedAt) continue
    let score = 0
    for (const keyword of topic.keywords) {
      const normalizedKeyword = normalizeAssistantQuery(keyword)
      if (normalizedKeyword && q.includes(normalizedKeyword)) {
        score += normalizedKeyword.length
      }
    }
    if (score > bestScore) {
      bestScore = score
      best = { text: topic.answerText, links: topic.links }
    }
  }

  return bestScore > 0 ? best : config.fallback
}

/** Matching synchrone sur le seed (fallback client si API indisponible). */
export function answerAssistantQuery(
  query: string,
  scope: AssistantScope = 'site'
): AssistantAnswer {
  return answerFromConfig(buildDefaultAssistantConfig(), scope, query)
}
