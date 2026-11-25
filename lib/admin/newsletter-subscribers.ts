import { isMockDataEnabled } from '@/lib/mock/config'
import {
  getPlatformSettingValue,
  upsertPlatformSettingValue,
} from '@/lib/services/platform-settings-store'

export const NEWSLETTER_SUBSCRIBERS_KEY = 'admin.newsletter.subscribers'

export type NewsletterSubscriber = {
  id: string
  email: string
  fullName: string
  reference: string
  subscribedAt: string
  /** Soft-delete : présent = en corbeille */
  archivedAt?: string | null
}

let mockSubscribers: NewsletterSubscriber[] = []

function parseList(raw: string | null): NewsletterSubscriber[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is NewsletterSubscriber =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as NewsletterSubscriber).id === 'string' &&
        typeof (item as NewsletterSubscriber).email === 'string'
    )
  } catch {
    return []
  }
}

async function readRaw(): Promise<string | null> {
  if (isMockDataEnabled()) {
    return mockSubscribers.length ? JSON.stringify(mockSubscribers) : null
  }
  return getPlatformSettingValue(NEWSLETTER_SUBSCRIBERS_KEY)
}

async function writeList(items: NewsletterSubscriber[], updatedById?: string): Promise<boolean> {
  const payload = JSON.stringify(items)
  if (isMockDataEnabled()) {
    mockSubscribers = items
    return true
  }
  return upsertPlatformSettingValue(NEWSLETTER_SUBSCRIBERS_KEY, payload, updatedById)
}

async function readAll(): Promise<NewsletterSubscriber[]> {
  return parseList(await readRaw())
}

function isActive(item: NewsletterSubscriber) {
  return !item.archivedAt
}

export async function listNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
  const items = (await readAll()).filter(isActive)
  return items.sort(
    (a, b) => new Date(b.subscribedAt).getTime() - new Date(a.subscribedAt).getTime()
  )
}

export async function listNewsletterTrash(): Promise<NewsletterSubscriber[]> {
  const items = (await readAll()).filter((item) => Boolean(item.archivedAt))
  return items.sort(
    (a, b) =>
      new Date(b.archivedAt ?? 0).getTime() - new Date(a.archivedAt ?? 0).getTime()
  )
}

export async function findNewsletterSubscriberByEmail(
  email: string
): Promise<NewsletterSubscriber | null> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return null
  const items = await listNewsletterSubscribers()
  return items.find((item) => item.email.toLowerCase() === normalized) ?? null
}

export async function findNewsletterSubscriberById(
  id: string
): Promise<NewsletterSubscriber | null> {
  const all = await readAll()
  return all.find((item) => item.id === id) ?? null
}

/** Désabonnement public (soft-delete → corbeille). */
export async function unsubscribeNewsletterSubscriber(input: {
  id: string
  email: string
}): Promise<'unsubscribed' | 'already' | 'not_found'> {
  const all = await readAll()
  const email = input.email.trim().toLowerCase()
  const item = all.find((row) => row.id === input.id && row.email.toLowerCase() === email)
  if (!item) return 'not_found'
  if (item.archivedAt) return 'already'
  const stamp = new Date().toISOString()
  await writeList(
    all.map((row) => (row.id === item.id ? { ...row, archivedAt: stamp } : row))
  )
  return 'unsubscribed'
}

export async function addNewsletterSubscriber(input: {
  email: string
  fullName: string
  reference: string
}): Promise<
  | { created: true; subscriber: NewsletterSubscriber }
  | { created: false; subscriber: NewsletterSubscriber }
> {
  const all = await readAll()
  const existingActive = all.find(
    (item) => isActive(item) && item.email.toLowerCase() === input.email.toLowerCase()
  )
  if (existingActive) return { created: false, subscriber: existingActive }

  const existingTrash = all.find(
    (item) => !isActive(item) && item.email.toLowerCase() === input.email.toLowerCase()
  )
  if (existingTrash) {
    const restored: NewsletterSubscriber = {
      ...existingTrash,
      fullName: input.fullName,
      reference: input.reference,
      subscribedAt: new Date().toISOString(),
      archivedAt: null,
    }
    await writeList(all.map((item) => (item.id === restored.id ? restored : item)))
    return { created: true, subscriber: restored }
  }

  const entry: NewsletterSubscriber = {
    id: `nl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    email: input.email,
    fullName: input.fullName,
    reference: input.reference,
    subscribedAt: new Date().toISOString(),
    archivedAt: null,
  }

  await writeList([entry, ...all])
  return { created: true, subscriber: entry }
}

/** Soft-delete → corbeille */
export async function archiveNewsletterSubscribers(
  ids: string[],
  updatedById?: string
): Promise<number> {
  const unique = Array.from(new Set(ids.filter(Boolean)))
  if (!unique.length) return 0
  const all = await readAll()
  const stamp = new Date().toISOString()
  let count = 0
  const next = all.map((item) => {
    if (!unique.includes(item.id) || item.archivedAt) return item
    count += 1
    return { ...item, archivedAt: stamp }
  })
  if (!count) return 0
  await writeList(next, updatedById)
  return count
}

export async function restoreNewsletterSubscribers(
  ids: string[],
  updatedById?: string
): Promise<number> {
  const unique = Array.from(new Set(ids.filter(Boolean)))
  if (!unique.length) return 0
  const all = await readAll()
  let count = 0
  const next = all.map((item) => {
    if (!unique.includes(item.id) || !item.archivedAt) return item
    count += 1
    return { ...item, archivedAt: null }
  })
  if (!count) return 0
  await writeList(next, updatedById)
  return count
}

/** Suppression définitive */
export async function purgeNewsletterSubscribers(
  ids: string[],
  updatedById?: string
): Promise<number> {
  const unique = Array.from(new Set(ids.filter(Boolean)))
  if (!unique.length) return 0
  const all = await readAll()
  const next = all.filter((item) => !unique.includes(item.id))
  const removed = all.length - next.length
  if (!removed) return 0
  await writeList(next, updatedById)
  return removed
}

export async function emptyNewsletterTrash(updatedById?: string): Promise<number> {
  const all = await readAll()
  const next = all.filter(isActive)
  const removed = all.length - next.length
  if (!removed) return 0
  await writeList(next, updatedById)
  return removed
}

/** @deprecated alias soft-delete */
export async function removeNewsletterSubscriber(id: string, updatedById?: string): Promise<boolean> {
  return (await archiveNewsletterSubscribers([id], updatedById)) > 0
}

/** @deprecated alias soft-delete */
export async function removeNewsletterSubscribers(
  ids: string[],
  updatedById?: string
): Promise<number> {
  return archiveNewsletterSubscribers(ids, updatedById)
}

export async function dedupeNewsletterSubscribers(updatedById?: string): Promise<number> {
  const active = await listNewsletterSubscribers()
  const trash = await listNewsletterTrash()
  const seen = new Map<string, NewsletterSubscriber>()
  for (const item of active) {
    const key = item.email.toLowerCase()
    const current = seen.get(key)
    if (!current) {
      seen.set(key, item)
      continue
    }
    const newer =
      new Date(item.subscribedAt).getTime() >= new Date(current.subscribedAt).getTime()
        ? item
        : current
    seen.set(key, newer)
  }
  const nextActive = Array.from(seen.values())
  const removed = active.length - nextActive.length
  if (!removed) return 0
  await writeList([...nextActive, ...trash], updatedById)
  return removed
}

export type BulkImportSubscriberInput = {
  email: string
  fullName: string
}

export type BulkImportResult = {
  created: number
  restored: number
  skipped: number
  invalid: number
  total: number
}

/** Import en masse (Excel / CSV) — déduplique par e-mail. */
export async function bulkAddNewsletterSubscribers(
  rows: BulkImportSubscriberInput[],
  updatedById?: string
): Promise<BulkImportResult> {
  const stamp = new Date()
  const all = await readAll()
  const byEmail = new Map(all.map((item) => [item.email.toLowerCase(), item]))
  let created = 0
  let restored = 0
  let skipped = 0
  let invalid = 0
  const next = [...all]

  const seenInFile = new Set<string>()

  for (const row of rows) {
    const email = row.email.trim().toLowerCase()
    const fullName = row.fullName.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || fullName.length < 2) {
      invalid += 1
      continue
    }
    if (seenInFile.has(email)) {
      skipped += 1
      continue
    }
    seenInFile.add(email)

    const existing = byEmail.get(email)
    if (existing && isActive(existing)) {
      skipped += 1
      continue
    }

    const reference = `NL-${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, '0')}${String(stamp.getDate()).padStart(2, '0')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

    if (existing && !isActive(existing)) {
      const restoredItem: NewsletterSubscriber = {
        ...existing,
        fullName,
        reference,
        subscribedAt: stamp.toISOString(),
        archivedAt: null,
      }
      const idx = next.findIndex((item) => item.id === existing.id)
      if (idx >= 0) next[idx] = restoredItem
      byEmail.set(email, restoredItem)
      restored += 1
      continue
    }

    const entry: NewsletterSubscriber = {
      id: `nl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${created}`,
      email,
      fullName,
      reference,
      subscribedAt: stamp.toISOString(),
      archivedAt: null,
    }
    next.unshift(entry)
    byEmail.set(email, entry)
    created += 1
  }

  if (created || restored) {
    await writeList(next, updatedById)
  }

  return {
    created,
    restored,
    skipped,
    invalid,
    total: rows.length,
  }
}
