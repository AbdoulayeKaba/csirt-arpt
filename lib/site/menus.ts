import type { CsirtMegaCard, CsirtMegaIcon, CsirtNavItem } from '@/lib/csirt/nav'
import { newSiteId } from '@/lib/site/ids'
import { isExpiredTrash } from '@/lib/utils/trash-retention'

export type SiteMenuChild = {
  id: string
  label: string
  href: string
  description: string
  kicker: string
  badge: string
  enabled: boolean
  order: number
  icon: CsirtMegaIcon
}

export type SiteMenu = {
  id: string
  label: string
  href: string
  enabled: boolean
  order: number
  description: string
  ctaLabel: string
  ctaHref: string
  children: SiteMenuChild[]
  /** Soft-delete : masqué de la navigation, visible en corbeille du site public. */
  archived?: boolean
  archivedAt?: string | null
}

export function isMenuArchived(menu: Pick<SiteMenu, 'archived'> | null | undefined) {
  return menu?.archived === true
}

export function archiveTimestamp() {
  return new Date().toISOString()
}

const DEFAULT_ICONS: CsirtMegaIcon[] = [
  'presentation',
  'missions',
  'equipe',
  'historique',
  'lois',
  'cadres',
  'normes',
  'audit',
  'formation',
  'conseil',
  'assistance',
  'actualites',
  'rapports',
  'guides',
  'communiques',
  'particuliers',
  'entreprises',
  'institutions',
  'incidents',
  'veille',
]

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function asBool(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function normalizeIcon(value: unknown, fallback: CsirtMegaIcon): CsirtMegaIcon {
  const raw = asString(value, fallback)
  return (DEFAULT_ICONS.includes(raw as CsirtMegaIcon) ? raw : fallback) as CsirtMegaIcon
}

export function navItemsToMenus(nav: readonly CsirtNavItem[]): SiteMenu[] {
  return nav.map((item, index) => ({
    id: newSiteId('menu'),
    label: item.label,
    href: item.href,
    enabled: true,
    order: index,
    description: item.mega?.description ?? '',
    ctaLabel: item.mega?.cta.label ?? '',
    ctaHref: item.mega?.cta.href ?? item.href,
    children: (item.mega?.cards ?? []).map((card, childIndex) => ({
      id: newSiteId('submenu'),
      label: card.title,
      href: card.href,
      description: card.description,
      kicker: card.kicker ?? '',
      badge: card.badge ?? '',
      enabled: true,
      order: childIndex,
      icon: card.icon,
    })),
    archived: false,
    archivedAt: null,
  }))
}

export function menusToNavItems(menus: readonly SiteMenu[]): CsirtNavItem[] {
  return [...menus]
    .filter((menu) => menu.enabled && !isMenuArchived(menu))
    .sort((a, b) => a.order - b.order)
    .map((menu) => {
      const children = [...menu.children]
        .filter((child) => child.enabled)
        .sort((a, b) => a.order - b.order)

      const item: CsirtNavItem = {
        label: menu.label,
        href: menu.href,
      }

      if (children.length > 0 || menu.description.trim()) {
        item.mega = {
          kicker: 'Rubrique',
          title: menu.label,
          description: menu.description,
          cta: {
            label: menu.ctaLabel.trim() || menu.label,
            href: menu.ctaHref.trim() || menu.href,
          },
          sectionLabel: 'Navigation rapide',
          seeAllHref: menu.href,
          cards: children.map(
            (child): CsirtMegaCard => ({
              title: child.label,
              description: child.description,
              href: child.href,
              icon: child.icon,
              kicker: child.kicker || undefined,
              badge: child.badge || undefined,
            })
          ),
        }
      }

      return item
    })
}

function sanitizeChild(raw: unknown, index: number): SiteMenuChild | null {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const label = asString(row.label)
  const href = asString(row.href)
  if (!label || !href) return null
  return {
    id: asString(row.id, newSiteId('submenu')),
    label,
    href,
    description: asString(row.description),
    kicker: asString(row.kicker),
    badge: asString(row.badge),
    enabled: asBool(row.enabled, true),
    order: typeof row.order === 'number' ? row.order : index,
    icon: normalizeIcon(row.icon, DEFAULT_ICONS[index % DEFAULT_ICONS.length]!),
  }
}

function sanitizeMenu(raw: unknown, index: number): SiteMenu | null {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const label = asString(row.label)
  const href = asString(row.href)
  if (!label || !href) return null
  const children = asArray<unknown>(row.children)
    .map((child, childIndex) => sanitizeChild(child, childIndex))
    .filter((child): child is SiteMenuChild => Boolean(child))
    .sort((a, b) => a.order - b.order)
    .map((child, childIndex) => ({ ...child, order: childIndex }))

  const archived = asBool(row.archived, false)
  const archivedAt = archived ? asString(row.archivedAt) || null : null
  if (archived && isExpiredTrash(archivedAt)) return null

  return {
    id: asString(row.id, newSiteId('menu')),
    label,
    href,
    enabled: asBool(row.enabled, true),
    order: typeof row.order === 'number' ? row.order : index,
    description: asString(row.description),
    ctaLabel: asString(row.ctaLabel),
    ctaHref: asString(row.ctaHref, href),
    children,
    archived,
    archivedAt,
  }
}

/** Accepte `menus` du site ou ancienne forme `nav` et normalise. */
export function sanitizeMenus(rawMenus: unknown, fallbackNav: CsirtNavItem[]): SiteMenu[] {
  const fromMenus = asArray<unknown>(rawMenus)
    .map((item, index) => sanitizeMenu(item, index))
    .filter((item): item is SiteMenu => Boolean(item))

  if (fromMenus.length) {
    return fromMenus
      .sort((a, b) => a.order - b.order)
      .map((menu, index) => ({ ...menu, order: index }))
  }

  return navItemsToMenus(fallbackNav)
}

export function reorderMenus(menus: SiteMenu[], fromIndex: number, direction: -1 | 1): SiteMenu[] {
  const target = fromIndex + direction
  if (target < 0 || target >= menus.length) return menus
  const next = [...menus]
  const current = next[fromIndex]!
  next[fromIndex] = next[target]!
  next[target] = current
  return next.map((menu, index) => ({ ...menu, order: index }))
}

export function reorderChildren(
  children: SiteMenuChild[],
  fromIndex: number,
  direction: -1 | 1
): SiteMenuChild[] {
  const target = fromIndex + direction
  if (target < 0 || target >= children.length) return children
  const next = [...children]
  const current = next[fromIndex]!
  next[fromIndex] = next[target]!
  next[target] = current
  return next.map((child, index) => ({ ...child, order: index }))
}

export function createEmptyMenu(order: number): SiteMenu {
  return {
    id: newSiteId('menu'),
    label: '',
    href: '/',
    enabled: true,
    order,
    description: '',
    ctaLabel: '',
    ctaHref: '/',
    children: [],
    archived: false,
    archivedAt: null,
  }
}

export function createEmptyChild(order: number): SiteMenuChild {
  return {
    id: newSiteId('submenu'),
    label: '',
    href: '/',
    description: '',
    kicker: '',
    badge: '',
    enabled: true,
    order,
    icon: DEFAULT_ICONS[order % DEFAULT_ICONS.length]!,
  }
}

export function duplicateMenu(menu: SiteMenu, order: number): SiteMenu {
  return {
    ...menu,
    id: newSiteId('menu'),
    label: `${menu.label} (copie)`,
    order,
    archived: false,
    archivedAt: null,
    enabled: true,
    children: menu.children.map((child, index) => ({
      ...child,
      id: newSiteId('submenu'),
      order: index,
    })),
  }
}
