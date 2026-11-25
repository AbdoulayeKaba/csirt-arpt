import { isMockDataEnabled } from '@/lib/mock/config'
import {
  getPlatformSettingValue,
  upsertPlatformSettingValue,
} from '@/lib/services/platform-settings-store'

export const CONTACT_MESSAGES_KEY = 'admin.contact.messages'

export type ContactMessage = {
  id: string
  fullName: string
  email: string
  organization: string
  subject: string
  body: string
  createdAt: string
  readAt?: string | null
  archivedAt?: string | null
}

let mockMessages: ContactMessage[] = []

function parseList(raw: string | null): ContactMessage[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is ContactMessage =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as ContactMessage).id === 'string' &&
        typeof (item as ContactMessage).email === 'string' &&
        typeof (item as ContactMessage).subject === 'string'
    )
  } catch {
    return []
  }
}

async function readRaw(): Promise<string | null> {
  if (isMockDataEnabled()) {
    return mockMessages.length ? JSON.stringify(mockMessages) : null
  }
  return getPlatformSettingValue(CONTACT_MESSAGES_KEY)
}

async function writeList(items: ContactMessage[], updatedById?: string): Promise<boolean> {
  const payload = JSON.stringify(items)
  if (isMockDataEnabled()) {
    mockMessages = items
    return true
  }
  return upsertPlatformSettingValue(CONTACT_MESSAGES_KEY, payload, updatedById)
}

async function readAll(): Promise<ContactMessage[]> {
  return parseList(await readRaw())
}

function isActive(item: ContactMessage) {
  return !item.archivedAt
}

function sortByCreatedDesc(items: ContactMessage[]) {
  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export async function listContactMessages(): Promise<ContactMessage[]> {
  return sortByCreatedDesc((await readAll()).filter(isActive))
}

export async function listContactTrash(): Promise<ContactMessage[]> {
  return (await readAll())
    .filter((item) => Boolean(item.archivedAt))
    .sort(
      (a, b) =>
        new Date(b.archivedAt ?? 0).getTime() - new Date(a.archivedAt ?? 0).getTime()
    )
}

export async function countUnreadContactMessages(): Promise<number> {
  return (await listContactMessages()).filter((item) => !item.readAt).length
}

export async function addContactMessage(input: {
  fullName: string
  email: string
  organization?: string
  subject: string
  body: string
}): Promise<ContactMessage> {
  const items = await readAll()
  const message: ContactMessage = {
    id: `cm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    organization: (input.organization ?? '').trim(),
    subject: input.subject.trim(),
    body: input.body.trim(),
    createdAt: new Date().toISOString(),
    readAt: null,
    archivedAt: null,
  }
  items.unshift(message)
  await writeList(items)
  return message
}

export async function markContactMessageRead(
  id: string,
  updatedById?: string
): Promise<ContactMessage | null> {
  const items = await readAll()
  const index = items.findIndex((item) => item.id === id)
  if (index < 0) return null
  if (!items[index].readAt) {
    items[index] = { ...items[index], readAt: new Date().toISOString() }
    await writeList(items, updatedById)
  }
  return items[index]
}

/** Soft-delete → corbeille */
export async function archiveContactMessages(
  ids: string[],
  updatedById?: string
): Promise<number> {
  const unique = Array.from(new Set(ids.filter(Boolean)))
  if (!unique.length) return 0
  const items = await readAll()
  const stamp = new Date().toISOString()
  let count = 0
  const next = items.map((item) => {
    if (!unique.includes(item.id) || item.archivedAt) return item
    count += 1
    return { ...item, archivedAt: stamp }
  })
  if (!count) return 0
  await writeList(next, updatedById)
  return count
}

export async function restoreContactMessages(
  ids: string[],
  updatedById?: string
): Promise<number> {
  const unique = Array.from(new Set(ids.filter(Boolean)))
  if (!unique.length) return 0
  const items = await readAll()
  let count = 0
  const next = items.map((item) => {
    if (!unique.includes(item.id) || !item.archivedAt) return item
    count += 1
    return { ...item, archivedAt: null }
  })
  if (!count) return 0
  await writeList(next, updatedById)
  return count
}

/** Suppression définitive */
export async function purgeContactMessages(
  ids: string[],
  updatedById?: string
): Promise<number> {
  const unique = Array.from(new Set(ids.filter(Boolean)))
  if (!unique.length) return 0
  const items = await readAll()
  const next = items.filter((item) => !unique.includes(item.id))
  const removed = items.length - next.length
  if (!removed) return 0
  await writeList(next, updatedById)
  return removed
}

export async function emptyContactTrash(updatedById?: string): Promise<number> {
  const items = await readAll()
  const next = items.filter(isActive)
  const removed = items.length - next.length
  if (!removed) return 0
  await writeList(next, updatedById)
  return removed
}
