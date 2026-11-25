import { CSIRT_TICKER, type CsirtMegaCard, type CsirtNavItem } from '@/lib/csirt/nav'
import { CSIRT_NAV_EN, CSIRT_TICKER_EN } from '@/lib/csirt/nav-en'
import type { Language } from '@/lib/types'

function normalizeHref(href: string) {
  const trimmed = href.trim()
  if (!trimmed || trimmed === '/') return '/'
  return trimmed.replace(/\/+$/, '') || '/'
}

function indexNavByHref(items: readonly CsirtNavItem[]): Map<string, CsirtNavItem> {
  const map = new Map<string, CsirtNavItem>()
  for (const item of items) {
    map.set(normalizeHref(item.href), item)
  }
  return map
}

function indexCardsByHref(cards: readonly CsirtMegaCard[]): Map<string, CsirtMegaCard> {
  const map = new Map<string, CsirtMegaCard>()
  for (const card of cards) {
    map.set(normalizeHref(card.href), card)
  }
  return map
}

function mergeNavItem(source: CsirtNavItem, en?: CsirtNavItem): CsirtNavItem {
  if (!en) return source

  const merged: CsirtNavItem = {
    ...source,
    label: en.label,
  }

  if (!source.mega || !en.mega) return merged

  const enCards = indexCardsByHref(en.mega.cards)

  merged.mega = {
    ...source.mega,
    kicker: en.mega.kicker,
    title: en.mega.title,
    description: en.mega.description,
    sectionLabel: en.mega.sectionLabel,
    seeAllHref: source.mega.seeAllHref,
    cta: {
      label: en.mega.cta.label,
      href: source.mega.cta.href,
    },
    featured: source.mega.featured
      ? en.mega.featured
        ? {
            label: en.mega.featured.label,
            title: en.mega.featured.title,
            description: en.mega.featured.description,
          }
        : source.mega.featured
      : en.mega.featured,
    cards: source.mega.cards.map((card) => {
      const enCard = enCards.get(normalizeHref(card.href))
      if (!enCard) return card
      return {
        ...card,
        title: enCard.title,
        description: enCard.description,
        kicker: enCard.kicker ?? card.kicker,
        badge: enCard.badge ?? card.badge,
      }
    }),
  }

  return merged
}

const englishNavIndex = indexNavByHref(CSIRT_NAV_EN)

const defaultTickerEn = new Map<string, string>(
  CSIRT_TICKER.map((line, index) => [line, CSIRT_TICKER_EN[index] ?? line])
)

export function localizeNavItems(items: readonly CsirtNavItem[], lang: Language): CsirtNavItem[] {
  if (lang === 'fr') return [...items]

  return items.map((item) => {
    const en =
      englishNavIndex.get(normalizeHref(item.href)) ??
      englishNavIndex.get(normalizeHref(item.href.split('#')[0] ?? item.href))
    return mergeNavItem(item, en)
  })
}

export function localizeTicker(items: readonly string[], lang: Language): string[] {
  if (lang === 'fr') return [...items]
  return items.map((line) => defaultTickerEn.get(line) ?? line)
}
