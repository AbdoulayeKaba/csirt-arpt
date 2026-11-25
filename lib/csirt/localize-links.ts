import type { CsirtActionLink } from '@/lib/csirt/home-content'
import type { Language } from '@/lib/types'

const ACTION_LINKS_EN: Record<string, string> = {
  '/agrements': 'Licences',
  '/formations': 'Training',
  '/espace-rssi': 'CISO space',
}

const FOOTER_LINKS_EN: Record<string, string> = {
  '/csirt-arpt': 'Discover CSIRT-ARPT',
  '/csirt-arpt#missions': 'Our missions',
  '/csirt-arpt#gouvernance': 'Leadership team',
  '/historique': 'History',
  '/signalement': 'Incident reporting',
  '/publications': 'Active alerts',
  '/bonnes-pratiques': 'Best practices',
  '/experts-auditeurs': 'Certified expert auditors',
  '/espace-confiance': 'Trust space',
  '/panorama-menaces': 'Threat landscape',
  '/rapports': 'Reports',
  '/mediatheque': 'Educational videos',
  '/guides': 'Practical guides',
  '/mentions-legales': 'Legal notice',
  '/confidentialite': 'Privacy policy',
  '/accessibilite': 'Accessibility',
  '/plan-du-site': 'Full site map',
}

const FOOTER_COLUMNS_EN: Record<string, string> = {
  institution: 'Institution',
  cyber: 'Cybersecurity',
  resources: 'Resources',
}

function normalizeHref(href: string) {
  const trimmed = href.trim()
  if (!trimmed || trimmed === '/') return '/'
  return trimmed.replace(/\/+$/, '') || '/'
}

export function localizeActionLinks(
  links: readonly CsirtActionLink[],
  lang: Language,
): CsirtActionLink[] {
  if (lang === 'fr') return [...links]
  return links.map((link) => ({
    ...link,
    label: ACTION_LINKS_EN[normalizeHref(link.href)] ?? link.label,
  }))
}

export function localizeFooterLinkLabel(label: string, href: string, lang: Language): string {
  if (lang === 'fr') return label
  return FOOTER_LINKS_EN[normalizeHref(href)] ?? FOOTER_LINKS_EN[normalizeHref(href.split('#')[0] ?? href)] ?? label
}

export function localizeFooterColumnTitle(id: string, title: string, lang: Language): string {
  if (lang === 'fr') return title
  return FOOTER_COLUMNS_EN[id] ?? title
}

export function localizeQuickAccessAria(lang: Language): string {
  return lang === 'fr' ? 'Accès rapides' : 'Quick access'
}
