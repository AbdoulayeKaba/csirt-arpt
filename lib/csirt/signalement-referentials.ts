export type SignalementOrganisation = {
  id: string
  label: string
  declarantType?: string
  emailDomains?: string[]
}

export type SignalementEmailEvaluation = {
  valid: boolean
  error: string | null
  hint: string | null
}

/** Domaines personnels refusés pour un signalement professionnel */
export const BLOCKED_PERSONAL_EMAIL_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.fr',
  'hotmail.com',
  'hotmail.fr',
  'outlook.com',
  'outlook.fr',
  'live.com',
  'live.fr',
  'icloud.com',
  'me.com',
  'mac.com',
  'proton.me',
  'protonmail.com',
  'aol.com',
  'mail.com',
  'yandex.com',
  'gmx.com',
  'gmx.fr',
  'orange.fr',
  'free.fr',
  'sfr.fr',
  'laposte.net',
  'msn.com',
  'zoho.com',
] as const

const EMAIL_FORMAT_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i

export function normalizeEmailDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^@+/, '')
}

export function normalizeSignalementEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function parseEmailDomainsInput(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[,;\n]+/)
        .map(normalizeEmailDomain)
        .filter(Boolean)
    )
  )
}

export function formatEmailDomainsHint(domains?: string[]): string {
  if (!domains?.length) return ''
  return domains.map((domain) => `@${normalizeEmailDomain(domain)}`).join(', ')
}

export function formatEmailExample(domains?: string[]): string {
  const primary = domains?.[0] ? normalizeEmailDomain(domains[0]) : ''
  if (!primary) return 'prenom.nom@domaine.gn'
  return `prenom.nom@${primary}`
}

export function buildOrganisationEmailBlockMessage(
  orgLabel: string,
  domains?: string[]
): string {
  const domainsHint = formatEmailDomainsHint(domains)
  const example = formatEmailExample(domains)
  if (!domainsHint) {
    return `Utilisez uniquement l’adresse e-mail professionnelle de ${orgLabel}.`
  }
  return `Domaine incorrect. Pour ${orgLabel}, utilisez uniquement ${domainsHint} (ex. : ${example}).`
}

export function getEmailDomain(email: string): string | null {
  const trimmed = normalizeSignalementEmail(email)
  const at = trimmed.lastIndexOf('@')
  if (at <= 0 || at === trimmed.length - 1) return null
  return trimmed.slice(at + 1)
}

export function isBlockedPersonalEmail(email: string): boolean {
  const domain = getEmailDomain(email)
  if (!domain) return false
  return (BLOCKED_PERSONAL_EMAIL_DOMAINS as readonly string[]).includes(domain)
}

export function emailMatchesOrganisationDomains(email: string, domains?: string[]): boolean {
  if (!domains?.length) return false
  const emailDomain = getEmailDomain(email)
  if (!emailDomain) return false
  const normalized = domains.map(normalizeEmailDomain).filter(Boolean)
  return normalized.some((domain) => emailDomain === domain || emailDomain.endsWith(`.${domain}`))
}

export function filterOrganisationsByDeclarantType(
  organisations: SignalementOrganisation[],
  declarantType: string
): SignalementOrganisation[] {
  if (!declarantType.trim()) return []
  const target = declarantType.trim().toLowerCase()
  return organisations.filter((org) => org.declarantType?.trim().toLowerCase() === target)
}

export function findOrganisationByLabel(
  organisations: SignalementOrganisation[],
  label: string
): SignalementOrganisation | undefined {
  const normalized = label.trim().toLowerCase()
  if (!normalized) return undefined
  return organisations.find((org) => org.label.trim().toLowerCase() === normalized)
}

export function evaluateSignalementEmail(params: {
  email: string
  organization: string
  organisations: SignalementOrganisation[]
  declarantType?: string
}): SignalementEmailEvaluation {
  const email = normalizeSignalementEmail(params.email)
  const organization = params.organization.trim()

  if (!organization) {
    return {
      valid: false,
      error: null,
      hint: 'Sélectionnez d’abord votre organisation pour saisir l’e-mail professionnel.',
    }
  }

  const org = findOrganisationByLabel(params.organisations, organization)
  if (!org) {
    return {
      valid: false,
      error: 'Organisation invalide ou non reconnue.',
      hint: null,
    }
  }

  if (
    params.declarantType &&
    org.declarantType?.trim().toLowerCase() !== params.declarantType.trim().toLowerCase()
  ) {
    return {
      valid: false,
      error: 'Cette organisation ne correspond pas au type de déclarant sélectionné.',
      hint: null,
    }
  }

  const domainsHint = formatEmailDomainsHint(org.emailDomains)
  const requiredHint = domainsHint
    ? `Adresse professionnelle obligatoire ${org.label} : ${domainsHint}`
    : `Adresse professionnelle obligatoire de ${org.label}.`

  if (!org.emailDomains?.length) {
    return {
      valid: false,
      error: `Aucun domaine e-mail n’est configuré pour ${org.label}. Contactez le CSIRT-ARPT.`,
      hint: requiredHint,
    }
  }

  if (!email) {
    return {
      valid: false,
      error: null,
      hint: requiredHint,
    }
  }

  if (!EMAIL_FORMAT_RE.test(email)) {
    return {
      valid: false,
      error: 'Format d’e-mail invalide. Exemple : prenom.nom@domaine.gn',
      hint: requiredHint,
    }
  }

  if (isBlockedPersonalEmail(email)) {
    return {
      valid: false,
      error:
        'Les adresses personnelles (Gmail, Yahoo, Outlook, etc.) ne sont pas acceptées. Utilisez votre e-mail professionnel.',
      hint: requiredHint,
    }
  }

  if (!emailMatchesOrganisationDomains(email, org.emailDomains)) {
    return {
      valid: false,
      error: buildOrganisationEmailBlockMessage(org.label, org.emailDomains),
      hint: requiredHint,
    }
  }

  return {
    valid: true,
    error: null,
    hint: `E-mail professionnel valide pour ${org.label}.`,
  }
}

export function validateSignalementEmail(params: {
  email: string
  organization: string
  organisations: SignalementOrganisation[]
  declarantType?: string
}): string | null {
  const evaluation = evaluateSignalementEmail(params)
  if (!params.email.trim() && !evaluation.error) {
    return 'Un e-mail professionnel est requis.'
  }
  return evaluation.error
}
