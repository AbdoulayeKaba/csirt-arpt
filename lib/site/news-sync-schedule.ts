import {
  SITE_SOURCE_FREQUENCIES,
  isArchivedFlag,
  type SiteNewsSource,
} from '@/lib/site/news-sources'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

/** Intervalle entre deux collectes automatiques pour une fréquence affichée. */
export function frequencyToIntervalMs(frequency?: string | null): number {
  const raw = (frequency || 'Quotidien').trim().toLowerCase()

  if (raw.includes('hebdom')) return 7 * DAY_MS
  if (raw.includes('12')) return 12 * HOUR_MS
  if (raw.includes('6')) return 6 * HOUR_MS
  if (raw.includes('heure')) return HOUR_MS

  return DAY_MS
}

export function normalizeSourceFrequency(frequency?: string | null): string {
  const value = (frequency || 'Quotidien').trim()
  if ((SITE_SOURCE_FREQUENCIES as readonly string[]).includes(value)) return value
  return 'Quotidien'
}

export function isSourceDueForSync(
  source: SiteNewsSource,
  nowMs: number = Date.now()
): boolean {
  if (!source.enabled || isArchivedFlag(source)) return false

  const lastRaw = source.lastFetchedAt
  if (!lastRaw) return true

  const lastMs = new Date(lastRaw).getTime()
  if (Number.isNaN(lastMs)) return true

  const interval = frequencyToIntervalMs(source.frequency)
  return nowMs - lastMs >= interval
}

export function listDueNewsSources(
  sources: readonly SiteNewsSource[],
  nowMs: number = Date.now()
): SiteNewsSource[] {
  return sources.filter((source) => isSourceDueForSync(source, nowMs))
}

export type SyncFreshness = 'never' | 'fresh' | 'recent' | 'stale'

export function getSyncFreshness(
  lastFetchedAt?: string | null,
  frequency?: string | null,
  nowMs: number = Date.now()
): SyncFreshness {
  if (!lastFetchedAt) return 'never'

  const lastMs = new Date(lastFetchedAt).getTime()
  if (Number.isNaN(lastMs)) return 'never'

  const age = nowMs - lastMs
  const interval = frequencyToIntervalMs(frequency)

  if (age <= interval * 0.35) return 'fresh'
  if (age <= interval) return 'recent'
  return 'stale'
}

export function syncFreshnessLabel(freshness: SyncFreshness): string {
  if (freshness === 'fresh') return 'À jour'
  if (freshness === 'recent') return 'Récente'
  if (freshness === 'stale') return 'En retard'
  return 'Jamais'
}

export function msUntilNextSync(
  source: SiteNewsSource,
  nowMs: number = Date.now()
): number | null {
  if (!source.enabled || isArchivedFlag(source)) return null
  if (!source.lastFetchedAt) return 0

  const lastMs = new Date(source.lastFetchedAt).getTime()
  if (Number.isNaN(lastMs)) return 0

  const interval = frequencyToIntervalMs(source.frequency)
  return Math.max(0, interval - (nowMs - lastMs))
}
