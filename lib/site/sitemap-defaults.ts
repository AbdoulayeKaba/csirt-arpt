import {
  CSIRT_SITEMAP_SECTIONS,
  type SitemapSection,
} from '@/lib/csirt/sitemap'
import type {
  SiteSitemapContent,
  SiteSitemapLink,
  SiteSitemapSection,
  SiteSitemapStat,
  SiteSitemapTone,
} from '@/lib/site/types'

const TONES = new Set<SiteSitemapTone>(['green', 'red', 'ink'])

function cloneSections(sections: readonly SitemapSection[]): SiteSitemapSection[] {
  return sections.map((section) => ({
    id: section.id,
    title: section.title,
    lead: section.lead,
    tone: section.tone,
    links: section.links.map((link) => ({
      href: link.href,
      title: link.title,
      description: link.description,
      kicker: link.kicker ?? '',
    })),
  }))
}

export const DEFAULT_SITEMAP_CONTENT: SiteSitemapContent = {
  eyebrow: 'Cartographie officielle',
  stats: [
    { value: '', label: 'rubriques' },
    { value: '', label: 'pages référencées' },
    { value: '24h/24', label: 'canal de signalement' },
  ],
  sections: cloneSections(CSIRT_SITEMAP_SECTIONS),
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function sanitizeStat(raw: unknown, fallback: SiteSitemapStat): SiteSitemapStat {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    value: asString(row.value, fallback.value),
    label: asString(row.label, fallback.label),
  }
}

function sanitizeLink(raw: unknown, fallback: SiteSitemapLink): SiteSitemapLink {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    href: asString(row.href, fallback.href),
    title: asString(row.title, fallback.title),
    description: asString(row.description, fallback.description),
    kicker: asString(row.kicker, fallback.kicker),
  }
}

function sanitizeSection(raw: unknown, fallback: SiteSitemapSection): SiteSitemapSection {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const toneRaw = asString(row.tone, fallback.tone)
  const tone = (TONES.has(toneRaw as SiteSitemapTone) ? toneRaw : fallback.tone) as SiteSitemapTone
  const linksRaw = Array.isArray(row.links) ? row.links : []
  const links =
    fallback.links.length > 0
      ? fallback.links.map((item, index) => sanitizeLink(linksRaw[index], item))
      : []
  return {
    id: asString(row.id, fallback.id) || fallback.id,
    title: asString(row.title, fallback.title),
    lead: asString(row.lead, fallback.lead),
    tone,
    links,
  }
}

export function sanitizeSitemapContent(
  raw: unknown,
  fallback: SiteSitemapContent = DEFAULT_SITEMAP_CONTENT
): SiteSitemapContent {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const statsRaw = Array.isArray(row.stats) ? row.stats : []
  const sectionsRaw = Array.isArray(row.sections) ? row.sections : []
  return {
    eyebrow: asString(row.eyebrow, fallback.eyebrow),
    stats: fallback.stats.map((item, index) => sanitizeStat(statsRaw[index], item)),
    sections:
      sectionsRaw.length > 0
        ? fallback.sections.map((item, index) => sanitizeSection(sectionsRaw[index], item))
        : fallback.sections,
  }
}
