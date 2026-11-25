import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  BookOpen,
  ExternalLink,
  Info,
  Mail,
  Megaphone,
  Phone,
  Search,
  ShieldAlert,
  Users,
} from 'lucide-react'

export type CsirtHeroVariant =
  | 'glass'
  | 'alert'
  | 'solid'
  | 'outline'
  | 'dark'

export type CsirtHeroCtaIcon =
  | 'arrow'
  | 'shield'
  | 'phone'
  | 'mail'
  | 'info'
  | 'users'
  | 'book'
  | 'megaphone'
  | 'search'
  | 'external'
  | 'none'

export const CSIRT_HERO_VARIANTS: readonly {
  id: CsirtHeroVariant
  label: string
  hint: string
}[] = [
  { id: 'glass', label: 'Verre', hint: 'Transparent flouté' },
  { id: 'solid', label: 'Vert', hint: 'Plein marque' },
  { id: 'outline', label: 'Contour', hint: 'Blanc bordé' },
  { id: 'dark', label: 'Sombre', hint: 'Noir opaque' },
  { id: 'alert', label: 'Alerte', hint: 'Rouge signalement' },
]

export const CSIRT_HERO_CTA_ICONS: readonly {
  id: CsirtHeroCtaIcon
  label: string
}[] = [
  { id: 'arrow', label: 'Flèche' },
  { id: 'shield', label: 'Bouclier' },
  { id: 'phone', label: 'Téléphone' },
  { id: 'mail', label: 'E-mail' },
  { id: 'info', label: 'Info' },
  { id: 'users', label: 'Usagers' },
  { id: 'book', label: 'Document' },
  { id: 'megaphone', label: 'Annonce' },
  { id: 'search', label: 'Recherche' },
  { id: 'external', label: 'Lien externe' },
  { id: 'none', label: 'Aucune' },
]

const ICON_MAP: Record<Exclude<CsirtHeroCtaIcon, 'none'>, LucideIcon> = {
  arrow: ArrowRight,
  shield: ShieldAlert,
  phone: Phone,
  mail: Mail,
  info: Info,
  users: Users,
  book: BookOpen,
  megaphone: Megaphone,
  search: Search,
  external: ExternalLink,
}

export function parseHeroVariant(value: unknown): CsirtHeroVariant {
  const v = typeof value === 'string' ? value : ''
  if (v === 'alert' || v === 'solid' || v === 'outline' || v === 'dark' || v === 'glass') {
    return v
  }
  return 'glass'
}

export function parseHeroCtaIcon(
  value: unknown,
  variantFallback: CsirtHeroVariant
): CsirtHeroCtaIcon {
  const v = typeof value === 'string' ? value : ''
  if (
    v === 'arrow' ||
    v === 'shield' ||
    v === 'phone' ||
    v === 'mail' ||
    v === 'info' ||
    v === 'users' ||
    v === 'book' ||
    v === 'megaphone' ||
    v === 'search' ||
    v === 'external' ||
    v === 'none'
  ) {
    return v
  }
  return variantFallback === 'alert' ? 'shield' : 'arrow'
}

export function resolveHeroCtaIcon(icon: CsirtHeroCtaIcon | undefined, variant: CsirtHeroVariant) {
  const id = parseHeroCtaIcon(icon, variant)
  if (id === 'none') return null
  return ICON_MAP[id]
}
