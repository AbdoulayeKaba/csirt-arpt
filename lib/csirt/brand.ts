/** Identité publique CSIRT-ARPT — note CSIRT-ARPT/NS/2026/001 (v1.0). */
export const CSIRT_BRAND = {
  name: 'CSIRT-ARPT',
  fullName: 'Centre de réponse aux incidents de cybersécurité',
  parent: 'Autorité de Régulation des Postes et Télécommunications',
  country: 'République de Guinée',
  email: 'csirt@arpt.gov.gn',
  siteHost: 'csirt.arpt.gov.gn',
  mailto: 'mailto:csirt@arpt.gov.gn',
  address: 'Kaloum, Conakry, République de Guinée',
  hours: 'Prise en charge 24h/24',
} as const

/** Logo institutionnel officiel (site public + console). */
export const CSIRT_LOGO_SRC = '/csirt/arpt-logo.png'
export const CSIRT_LOGO_MARK_SRC = '/csirt/arpt-mark.svg'

export function resolveCsirtLogoSrc(customUrl?: string | null): string {
  const custom = customUrl?.trim() ?? ''
  return custom || CSIRT_LOGO_SRC
}
