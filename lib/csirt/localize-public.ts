import type { SiteFooter, SiteHome, SiteMissions, SiteResponseSection, SiteVigilanceSection } from '@/lib/site/types'
import type { SiteNewsTopic } from '@/lib/site/news-sources'
import {
  ACTION_LINKS_EN,
  FOOTER_EN,
  HERO_SLIDES_EN,
  HOME_MEDIA_EN,
  HOME_MISSIONS_EN,
  HOME_RESPONSE_EN,
  HOME_VIGILANCE_EN,
  NEWS_ITEMS_EN,
  NEWS_TITLES_EN,
  NEWS_TOPICS_EN,
  SOCIAL_EN,
  VIDEOS_EN,
  type LocalizedHomeSlice,
} from '@/lib/csirt/content-en'
import type { CsirtActionLink, CsirtHeroSlide, CsirtNewsItem, CsirtSocialPlatform, CsirtVideo } from '@/lib/csirt/home-content'
import type { Language } from '@/lib/types'

function normalizeHref(href: string) {
  const trimmed = href.trim()
  if (!trimmed || trimmed === '/') return '/'
  return trimmed.replace(/\/+$/, '') || '/'
}

function formatNewsDates(iso: string, lang: Language) {
  const date = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(date.getTime())) {
    return { dateLabel: iso, dateShort: iso }
  }
  const locale = lang === 'en' ? 'en-GB' : 'fr-FR'
  return {
    dateLabel: date.toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    dateShort: date
      .toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })
      .toUpperCase(),
  }
}

function localizeHeroSlides(slides: readonly CsirtHeroSlide[], lang: Language): CsirtHeroSlide[] {
  if (lang === 'fr') return [...slides]
  return slides.map((slide) => {
    const en = HERO_SLIDES_EN[slide.id]
    if (!en) return slide
    return {
      ...slide,
      alt: en.alt ?? slide.alt,
      kicker: en.kicker ?? slide.kicker,
      title: en.title ?? slide.title,
      cta: en.cta ?? slide.cta,
    }
  })
}

function localizeActionLinks(links: readonly CsirtActionLink[], lang: Language): CsirtActionLink[] {
  const live = links.filter((link) => link.archived !== true)
  if (lang === 'fr') return [...live]
  return live.map((link) => ({
    ...link,
    label: ACTION_LINKS_EN[normalizeHref(link.href)] ?? link.label,
  }))
}

function localizeResponse(response: SiteResponseSection, lang: Language): SiteResponseSection {
  if (lang === 'fr') return response
  const en = HOME_RESPONSE_EN
  return {
    ...response,
    kicker: en.kicker,
    title: en.title,
    lead: en.lead,
    statusLabel: en.statusLabel,
    ctaLabel: en.ctaLabel,
    secondaryLabel: en.secondaryLabel,
    pillars: response.pillars.map((pillar) => {
      const enPillar = en.pillars.find((item) => item.id === pillar.id)
      return enPillar ? { ...pillar, title: enPillar.title, body: enPillar.body } : pillar
    }),
  }
}

function localizeMissions(missions: SiteMissions, lang: Language): SiteMissions {
  if (lang === 'fr') return missions
  return { ...missions, ...HOME_MISSIONS_EN, ctaHref: missions.ctaHref }
}

function localizeVigilance(vigilance: SiteVigilanceSection, lang: Language): SiteVigilanceSection {
  if (lang === 'fr') return vigilance
  const en = HOME_VIGILANCE_EN
  return {
    ...vigilance,
    title: en.title,
    statusLabel: en.statusLabel,
    lead: en.lead,
    newsLane: { ...vigilance.newsLane, ...en.newsLane, href: vigilance.newsLane.href },
    alertLane: { ...vigilance.alertLane, ...en.alertLane, href: vigilance.alertLane.href },
    assurance: en.assurance,
  }
}

export function localizeHome(home: SiteHome, lang: Language): LocalizedHomeSlice {
  if (lang === 'fr') {
    return {
      heroSlides: [...home.heroSlides],
      actionLinks: [...home.actionLinks],
      mediaTitle: home.mediaTitle,
      mediaLead: home.mediaLead,
      response: home.response,
      missions: home.missions,
      vigilance: home.vigilance,
    }
  }

  return {
    heroSlides: localizeHeroSlides(home.heroSlides, lang),
    actionLinks: localizeActionLinks(home.actionLinks, lang),
    mediaTitle: HOME_MEDIA_EN.title,
    mediaLead: HOME_MEDIA_EN.lead,
    response: localizeResponse(home.response, lang),
    missions: localizeMissions(home.missions, lang),
    vigilance: localizeVigilance(home.vigilance, lang),
  }
}

export function localizeNewsTopics(topics: readonly SiteNewsTopic[], lang: Language): SiteNewsTopic[] {
  if (lang === 'fr') return [...topics]
  return topics.map((topic) => ({
    ...topic,
    label: NEWS_TOPICS_EN[topic.id] ?? topic.label,
  }))
}

function normalizeNewsTitleKey(title: string) {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function resolveNewsEnglish(item: CsirtNewsItem) {
  const byId = NEWS_ITEMS_EN[item.id]
  if (byId) return byId

  const byTitle = NEWS_TITLES_EN[normalizeNewsTitleKey(item.title)]
  if (byTitle) return byTitle

  for (const [key, value] of Object.entries(NEWS_TITLES_EN)) {
    const normalized = normalizeNewsTitleKey(item.title)
    if (normalized.includes(key) || key.includes(normalized.slice(0, 48))) {
      return value
    }
  }

  return null
}

export function localizeNewsItems(
  items: readonly CsirtNewsItem[],
  lang: Language,
): CsirtNewsItem[] {
  return items.map((item) => {
    const dates = formatNewsDates(item.date, lang)
    if (lang === 'fr') {
      return {
        ...item,
        dateLabel: dates.dateLabel,
        dateShort: dates.dateShort,
      }
    }
    const en = resolveNewsEnglish(item)

    return {
      ...item,
      title: en?.title ?? item.title,
      excerpt: en?.excerpt ?? item.excerpt,
      dateLabel: dates.dateLabel,
      dateShort: dates.dateShort,
    }
  })
}

export function localizeVideos(videos: readonly CsirtVideo[], lang: Language): CsirtVideo[] {
  if (lang === 'fr') return [...videos]
  return videos.map((video) => ({
    ...video,
    title: VIDEOS_EN[video.id]?.title ?? video.title,
  }))
}

export function localizeSocial(items: readonly CsirtSocialPlatform[], lang: Language): CsirtSocialPlatform[] {
  if (lang === 'fr') return [...items]
  return items.map((item) => {
    const en = SOCIAL_EN[item.id]
    if (!en) return item
    return {
      ...item,
      tags: en.tags ?? item.tags,
      description: en.description ?? item.description,
      latest: en.latest ?? item.latest,
      latestAgo: en.latestAgo ?? item.latestAgo,
    }
  })
}

export function localizeFooter(footer: SiteFooter, lang: Language): SiteFooter {
  if (lang === 'fr') return footer
  return {
    ...footer,
    ctaTitle: FOOTER_EN.ctaTitle,
    ctaLead: FOOTER_EN.ctaLead,
    ctaLabel: FOOTER_EN.ctaLabel,
    brandText: FOOTER_EN.brandText,
    columns: FOOTER_EN.columns,
    legal: FOOTER_EN.legal,
  }
}

export function monthLabelFromKey(key: string, lang: Language) {
  const [year, month] = key.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  const locale = lang === 'en' ? 'en-GB' : 'fr-FR'
  const label = date.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}
