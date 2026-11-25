import { isMockDataEnabled } from '@/lib/mock/config'
import {
  getPlatformSettingValue,
  upsertPlatformSettingValue,
} from '@/lib/services/platform-settings-store'

export const NEWSLETTER_CAMPAIGNS_KEY = 'admin.newsletter.campaigns'

export type NewsletterCampaignStatus = 'scheduled' | 'sent' | 'cancelled' | 'failed'

export type NewsletterCampaign = {
  id: string
  subject: string
  previewText: string
  body: string
  recipientMode: 'all' | 'selected'
  recipientIds?: string[]
  recipientCount: number
  sentCount: number
  failedCount: number
  ccEmails?: string[]
  attachments?: Array<{
    filename: string
    contentType: string
    size: number
    storedName: string
  }>
  status: NewsletterCampaignStatus
  scheduledAt?: string | null
  sentAt: string
  sentById?: string
  sentByName?: string
}

let mockCampaigns: NewsletterCampaign[] = []

function normalizeCampaign(item: NewsletterCampaign): NewsletterCampaign {
  return {
    ...item,
    status: item.status ?? 'sent',
    ccEmails: Array.isArray(item.ccEmails) ? item.ccEmails : [],
    recipientIds: Array.isArray(item.recipientIds) ? item.recipientIds : [],
    attachments: Array.isArray(item.attachments) ? item.attachments : [],
    scheduledAt: item.scheduledAt ?? null,
  }
}

function parseList(raw: string | null): NewsletterCampaign[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (item): item is NewsletterCampaign =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as NewsletterCampaign).id === 'string' &&
          typeof (item as NewsletterCampaign).subject === 'string'
      )
      .map(normalizeCampaign)
  } catch {
    return []
  }
}

async function readRaw(): Promise<string | null> {
  if (isMockDataEnabled()) {
    return mockCampaigns.length ? JSON.stringify(mockCampaigns) : null
  }
  return getPlatformSettingValue(NEWSLETTER_CAMPAIGNS_KEY)
}

async function writeList(items: NewsletterCampaign[], updatedById?: string): Promise<boolean> {
  const payload = JSON.stringify(items)
  if (isMockDataEnabled()) {
    mockCampaigns = items
    return true
  }
  return upsertPlatformSettingValue(NEWSLETTER_CAMPAIGNS_KEY, payload, updatedById)
}

export async function listNewsletterCampaigns(): Promise<NewsletterCampaign[]> {
  const items = parseList(await readRaw())
  return items.sort((a, b) => {
    const aTime = new Date(a.scheduledAt || a.sentAt).getTime()
    const bTime = new Date(b.scheduledAt || b.sentAt).getTime()
    return bTime - aTime
  })
}

export async function getNewsletterCampaign(id: string): Promise<NewsletterCampaign | null> {
  const items = await listNewsletterCampaigns()
  return items.find((item) => item.id === id) ?? null
}

export async function addNewsletterCampaign(
  campaign: Omit<NewsletterCampaign, 'id' | 'sentAt'> & { sentAt?: string; id?: string },
  updatedById?: string
): Promise<NewsletterCampaign> {
  const items = await listNewsletterCampaigns()
  const entry: NewsletterCampaign = normalizeCampaign({
    ...campaign,
    id: campaign.id ?? `camp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sentAt: campaign.sentAt ?? new Date().toISOString(),
    status: campaign.status ?? 'sent',
  })
  await writeList([entry, ...items].slice(0, 150), updatedById)
  return entry
}

export async function updateNewsletterCampaign(
  id: string,
  patch: Partial<NewsletterCampaign>,
  updatedById?: string
): Promise<NewsletterCampaign | null> {
  const items = await listNewsletterCampaigns()
  const index = items.findIndex((item) => item.id === id)
  if (index < 0) return null
  const next = normalizeCampaign({ ...items[index], ...patch, id })
  const list = [...items]
  list[index] = next
  await writeList(list, updatedById)
  return next
}

export async function removeNewsletterCampaign(
  id: string,
  updatedById?: string
): Promise<boolean> {
  const items = await listNewsletterCampaigns()
  const next = items.filter((item) => item.id !== id)
  if (next.length === items.length) return false
  const ok = await writeList(next, updatedById)
  if (ok) {
    const { deleteNewsletterAttachments } = await import('@/lib/storage/newsletter-attachments')
    await deleteNewsletterAttachments(id)
  }
  return ok
}

export async function listDueScheduledCampaigns(now = new Date()): Promise<NewsletterCampaign[]> {
  const items = await listNewsletterCampaigns()
  const ts = now.getTime()
  return items.filter(
    (item) =>
      item.status === 'scheduled' &&
      item.scheduledAt &&
      new Date(item.scheduledAt).getTime() <= ts
  )
}
