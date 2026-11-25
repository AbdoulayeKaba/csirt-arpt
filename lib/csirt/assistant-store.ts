import { isMockDataEnabled } from '@/lib/mock/config'
import {
  buildDefaultAssistantConfig,
  type AssistantAnswer,
  type AssistantConfig,
  type AssistantFaqItem,
  type AssistantLink,
  type AssistantScope,
  type AssistantScopeConfig,
} from '@/lib/csirt/assistant'
import {
  getPlatformSettingValue,
  upsertPlatformSettingValue,
} from '@/lib/services/platform-settings-store'

export const ASSISTANT_CONFIG_KEY = 'csirt.assistant'

let mockConfig: AssistantConfig | null = null

function normalizeLink(raw: unknown): AssistantLink | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  const label = typeof record.label === 'string' ? record.label.trim() : ''
  const href = typeof record.href === 'string' ? record.href.trim() : ''
  if (!label || !href) return null
  return { label: label.slice(0, 120), href: href.slice(0, 400) }
}

function normalizeItem(raw: unknown, index: number): AssistantFaqItem | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  const id =
    typeof record.id === 'string' && record.id.trim()
      ? record.id.trim().slice(0, 80)
      : `item-${index + 1}`
  const label = typeof record.label === 'string' ? record.label.trim() : ''
  const query = typeof record.query === 'string' ? record.query.trim() : label
  const answerText = typeof record.answerText === 'string' ? record.answerText.trim() : ''
  if (!label || !answerText) return null

  const keywords = Array.isArray(record.keywords)
    ? record.keywords
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean)
        .slice(0, 40)
    : []

  const links = Array.isArray(record.links)
    ? record.links.map(normalizeLink).filter((link): link is AssistantLink => Boolean(link)).slice(0, 8)
    : undefined

  const sortOrder =
    typeof record.sortOrder === 'number' && Number.isFinite(record.sortOrder)
      ? record.sortOrder
      : (index + 1) * 10

  const archivedAt =
    typeof record.archivedAt === 'string' && record.archivedAt.trim()
      ? record.archivedAt.trim().slice(0, 40)
      : null

  return {
    id,
    label: label.slice(0, 200),
    query: (query || label).slice(0, 240),
    answerText: answerText.slice(0, 4000),
    links: links?.length ? links : undefined,
    keywords,
    sortOrder,
    published: record.published !== false,
    archivedAt,
  }
}

function normalizeScope(raw: unknown, fallback: AssistantScopeConfig): AssistantScopeConfig {
  if (!raw || typeof raw !== 'object') {
    return {
      welcome: fallback.welcome,
      items: fallback.items.map((entry) => ({
        ...entry,
        links: entry.links ? entry.links.map((link) => ({ ...link })) : undefined,
        keywords: [...entry.keywords],
      })),
    }
  }
  const record = raw as Record<string, unknown>
  const welcome =
    typeof record.welcome === 'string' && record.welcome.trim()
      ? record.welcome.trim().slice(0, 800)
      : fallback.welcome
  const items = Array.isArray(record.items)
    ? record.items
        .map((entry, index) => normalizeItem(entry, index))
        .filter((entry): entry is AssistantFaqItem => Boolean(entry))
    : fallback.items.map((entry) => ({
        ...entry,
        links: entry.links ? entry.links.map((link) => ({ ...link })) : undefined,
        keywords: [...entry.keywords],
      }))

  return { welcome, items }
}

function normalizeFallback(raw: unknown, fallback: AssistantAnswer): AssistantAnswer {
  if (!raw || typeof raw !== 'object') {
    return {
      text: fallback.text,
      links: fallback.links ? fallback.links.map((link) => ({ ...link })) : undefined,
    }
  }
  const record = raw as Record<string, unknown>
  const text =
    typeof record.text === 'string' && record.text.trim()
      ? record.text.trim().slice(0, 1000)
      : fallback.text
  const links = Array.isArray(record.links)
    ? record.links.map(normalizeLink).filter((link): link is AssistantLink => Boolean(link)).slice(0, 8)
    : fallback.links
      ? fallback.links.map((link) => ({ ...link }))
      : undefined
  return { text, links: links?.length ? links : undefined }
}

export function normalizeAssistantConfig(raw: unknown): AssistantConfig {
  const defaults = buildDefaultAssistantConfig()
  if (!raw || typeof raw !== 'object') return defaults
  const record = raw as Record<string, unknown>
  return {
    site: normalizeScope(record.site, defaults.site),
    signalement: normalizeScope(record.signalement, defaults.signalement),
    fallback: normalizeFallback(record.fallback, defaults.fallback),
  }
}

function parseConfig(raw: string | null): AssistantConfig {
  if (!raw) return buildDefaultAssistantConfig()
  try {
    return normalizeAssistantConfig(JSON.parse(raw) as unknown)
  } catch {
    return buildDefaultAssistantConfig()
  }
}

export async function getAssistantConfig(): Promise<AssistantConfig> {
  if (isMockDataEnabled()) {
    return mockConfig ? normalizeAssistantConfig(mockConfig) : buildDefaultAssistantConfig()
  }
  return parseConfig(await getPlatformSettingValue(ASSISTANT_CONFIG_KEY))
}

export async function upsertAssistantConfig(
  nextRaw: unknown,
  updatedById?: string
): Promise<AssistantConfig> {
  const next = normalizeAssistantConfig(nextRaw)
  const payload = JSON.stringify(next)

  if (isMockDataEnabled()) {
    mockConfig = next
    return normalizeAssistantConfig(next)
  }

  const ok = await upsertPlatformSettingValue(ASSISTANT_CONFIG_KEY, payload, updatedById)
  if (!ok) {
    throw new Error('ASSISTANT_CONFIG_SAVE_FAILED')
  }
  return next
}

export type AssistantPublicPayload = {
  scope: AssistantScope
  welcome: string
  suggestions: Array<{
    id: string
    label: string
    query: string
    answerText: string
    links?: AssistantLink[]
  }>
  fallback: AssistantAnswer
}

export async function getPublicAssistantPayload(
  scope: AssistantScope
): Promise<AssistantPublicPayload> {
  const config = await getAssistantConfig()
  const suggestions = [...config[scope].items]
    .filter((entry) => entry.published && !entry.archivedAt)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, 'fr'))
    .map((entry) => ({
      id: entry.id,
      label: entry.label,
      query: entry.query,
      answerText: entry.answerText,
      links: entry.links,
    }))

  return {
    scope,
    welcome: config[scope].welcome,
    suggestions,
    fallback: config.fallback,
  }
}
