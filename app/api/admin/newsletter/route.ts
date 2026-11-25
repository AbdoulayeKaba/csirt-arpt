import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireApiPermission } from '@/lib/auth/permission-guard'
import {
  addNewsletterSubscriber,
  archiveNewsletterSubscribers,
  dedupeNewsletterSubscribers,
  emptyNewsletterTrash,
  listNewsletterSubscribers,
  listNewsletterTrash,
  purgeNewsletterSubscribers,
  restoreNewsletterSubscribers,
} from '@/lib/admin/newsletter-subscribers'
import {
  addNewsletterCampaign,
  listNewsletterCampaigns,
  removeNewsletterCampaign,
  updateNewsletterCampaign,
} from '@/lib/admin/newsletter-campaigns'
import {
  normalizeCcEmails,
  sendNewsletterCampaignMails,
} from '@/lib/admin/newsletter-campaign-mail'
import {
  isAllowedNewsletterAttachment,
  NEWSLETTER_ATTACHMENT_MAX_BYTES,
  NEWSLETTER_ATTACHMENT_MAX_FILES,
  NEWSLETTER_ATTACHMENT_MAX_TOTAL_BYTES,
  saveNewsletterAttachments,
} from '@/lib/storage/newsletter-attachments'

const campaignSchema = z.object({
  subject: z.string().trim().min(3).max(180),
  previewText: z.string().trim().max(240).optional().default(''),
  body: z.string().trim().min(10).max(50000),
  recipientIds: z.array(z.string().min(1)).optional(),
  ccEmails: z.union([z.string(), z.array(z.string())]).optional(),
  scheduleAt: z.string().min(1).optional().nullable(),
})

type ParsedCampaignFiles = Array<{
  filename: string
  contentType: string
  buffer: Buffer
}>

async function parseCampaignRequest(req: Request): Promise<
  | { ok: true; data: z.infer<typeof campaignSchema>; files: ParsedCampaignFiles }
  | { ok: false; error: string; message?: string; status: number }
> {
  const contentType = req.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    let form: FormData
    try {
      form = await req.formData()
    } catch {
      return { ok: false, error: 'INVALID_REQUEST', status: 400 }
    }

    const recipientRaw = String(form.get('recipientIds') ?? '').trim()
    let recipientIds: string[] | undefined
    if (recipientRaw) {
      try {
        const parsedIds = JSON.parse(recipientRaw) as unknown
        recipientIds = Array.isArray(parsedIds)
          ? parsedIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
          : undefined
      } catch {
        recipientIds = recipientRaw
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      }
    }

    const payload = {
      subject: String(form.get('subject') ?? ''),
      previewText: String(form.get('previewText') ?? ''),
      body: String(form.get('body') ?? ''),
      recipientIds,
      ccEmails: String(form.get('ccEmails') ?? ''),
      scheduleAt: String(form.get('scheduleAt') ?? '') || null,
    }
    const parsed = campaignSchema.safeParse(payload)
    if (!parsed.success) {
      return { ok: false, error: 'VALIDATION_FAILED', status: 400 }
    }

    const files: ParsedCampaignFiles = []
    let totalBytes = 0
    for (const entry of form.getAll('files')) {
      if (!(entry instanceof File)) continue
      if (!entry.name || entry.size <= 0) continue
      if (files.length >= NEWSLETTER_ATTACHMENT_MAX_FILES) {
        return {
          ok: false,
          error: 'TOO_MANY_FILES',
          message: `Maximum ${NEWSLETTER_ATTACHMENT_MAX_FILES} fichiers.`,
          status: 400,
        }
      }
      if (entry.size > NEWSLETTER_ATTACHMENT_MAX_BYTES) {
        return {
          ok: false,
          error: 'FILE_TOO_LARGE',
          message: `Le fichier « ${entry.name} » dépasse 8 Mo.`,
          status: 400,
        }
      }
      totalBytes += entry.size
      if (totalBytes > NEWSLETTER_ATTACHMENT_MAX_TOTAL_BYTES) {
        return {
          ok: false,
          error: 'FILES_TOO_LARGE',
          message: 'La taille totale des pièces jointes dépasse 20 Mo.',
          status: 400,
        }
      }
      if (!isAllowedNewsletterAttachment(entry.name, entry.type)) {
        return {
          ok: false,
          error: 'FILE_TYPE_NOT_ALLOWED',
          message: `Type de fichier non autorisé : ${entry.name}`,
          status: 400,
        }
      }
      const buffer = Buffer.from(await entry.arrayBuffer())
      files.push({
        filename: entry.name,
        contentType: entry.type || 'application/octet-stream',
        buffer,
      })
    }

    return { ok: true, data: parsed.data, files }
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return { ok: false, error: 'INVALID_REQUEST', status: 400 }
  }
  const parsed = campaignSchema.safeParse(body)
  if (!parsed.success) {
    return { ok: false, error: 'VALIDATION_FAILED', status: 400 }
  }
  return { ok: true, data: parsed.data, files: [] }
}

const patchSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('add-subscriber'),
    email: z.string().trim().email().max(180),
    fullName: z.string().trim().min(2).max(120),
  }),
  z.object({
    action: z.literal('archive'),
    ids: z.array(z.string().min(1)).min(1).max(500),
  }),
  z.object({
    action: z.literal('restore'),
    ids: z.array(z.string().min(1)).min(1).max(500),
  }),
  z.object({
    action: z.literal('purge'),
    ids: z.array(z.string().min(1)).min(1).max(500),
  }),
  z.object({
    action: z.literal('empty-trash'),
  }),
  z.object({
    action: z.literal('dedupe'),
  }),
  z.object({
    action: z.literal('delete-campaign'),
    campaignId: z.string().min(1),
  }),
  z.object({
    action: z.literal('cancel-campaign'),
    campaignId: z.string().min(1),
  }),
])

export async function GET() {
  const auth = await requireApiPermission('menu.site.newsletter')
  if (auth.error) return auth.error

  const [items, trash, campaigns] = await Promise.all([
    listNewsletterSubscribers(),
    listNewsletterTrash(),
    listNewsletterCampaigns(),
  ])

  return NextResponse.json({
    items,
    trash,
    total: items.length,
    trashTotal: trash.length,
    campaigns,
    campaignsTotal: campaigns.length,
    scheduledTotal: campaigns.filter((item) => item.status === 'scheduled').length,
  })
}

export async function POST(req: Request) {
  const auth = await requireApiPermission('menu.site.newsletter')
  if (auth.error) return auth.error

  const parsedReq = await parseCampaignRequest(req)
  if (!parsedReq.ok) {
    return NextResponse.json(
      { error: parsedReq.error, message: parsedReq.message },
      { status: parsedReq.status }
    )
  }

  const subscribers = await listNewsletterSubscribers()
  if (!subscribers.length) {
    return NextResponse.json({ error: 'NO_SUBSCRIBERS' }, { status: 400 })
  }

  const selectedIds = parsedReq.data.recipientIds?.filter(Boolean) ?? []
  const recipients =
    selectedIds.length > 0
      ? subscribers.filter((item) => selectedIds.includes(item.id))
      : subscribers

  if (!recipients.length) {
    return NextResponse.json({ error: 'NO_RECIPIENTS' }, { status: 400 })
  }

  const ccEmails = normalizeCcEmails(parsedReq.data.ccEmails)
  const scheduleRaw = parsedReq.data.scheduleAt?.trim()
  const scheduleAt = scheduleRaw ? new Date(scheduleRaw) : null
  const actorName = `${auth.session.firstName} ${auth.session.lastName}`.trim()
  const campaignId = `camp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const storedAttachments = await saveNewsletterAttachments(campaignId, parsedReq.files)

  if (
    scheduleAt &&
    !Number.isNaN(scheduleAt.getTime()) &&
    scheduleAt.getTime() > Date.now() + 30_000
  ) {
    const campaign = await addNewsletterCampaign(
      {
        id: campaignId,
        subject: parsedReq.data.subject,
        previewText: parsedReq.data.previewText ?? '',
        body: parsedReq.data.body,
        recipientMode: selectedIds.length > 0 ? 'selected' : 'all',
        recipientIds: selectedIds,
        recipientCount: recipients.length,
        sentCount: 0,
        failedCount: 0,
        ccEmails,
        attachments: storedAttachments,
        status: 'scheduled',
        scheduledAt: scheduleAt.toISOString(),
        sentAt: new Date().toISOString(),
        sentById: auth.session.userId,
        sentByName: actorName,
      },
      auth.session.userId
    )

    return NextResponse.json({
      ok: true,
      scheduled: true,
      campaign,
      delivery: 'scheduled',
    })
  }

  const result = await sendNewsletterCampaignMails({
    subject: parsedReq.data.subject,
    previewText: parsedReq.data.previewText,
    body: parsedReq.data.body,
    recipients,
    ccEmails,
    fileAttachments: parsedReq.files.map((file) => ({
      filename: file.filename,
      content: file.buffer,
      contentType: file.contentType,
    })),
  })

  if (result.delivery === 'no_smtp') {
    return NextResponse.json(
      {
        error: 'NO_SMTP',
        message:
          'Configurez le SMTP (Administration → Paramètres) pour envoyer une campagne réelle.',
      },
      { status: 503 }
    )
  }

  const campaign = await addNewsletterCampaign(
    {
      id: campaignId,
      subject: parsedReq.data.subject,
      previewText: parsedReq.data.previewText ?? '',
      body: parsedReq.data.body,
      recipientMode: selectedIds.length > 0 ? 'selected' : 'all',
      recipientIds: selectedIds,
      recipientCount: recipients.length,
      sentCount: result.sent,
      failedCount: result.failed,
      ccEmails,
      attachments: storedAttachments,
      status: result.failed && !result.sent ? 'failed' : 'sent',
      scheduledAt: null,
      sentById: auth.session.userId,
      sentByName: actorName,
    },
    auth.session.userId
  )

  return NextResponse.json({
    ok: true,
    scheduled: false,
    campaign,
    sent: result.sent,
    failed: result.failed,
    delivery: result.delivery,
  })
}

export async function PATCH(req: Request) {
  const auth = await requireApiPermission('menu.site.newsletter')
  if (auth.error) return auth.error

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_FAILED' }, { status: 400 })
  }

  if (parsed.data.action === 'add-subscriber') {
    const stamp = new Date()
    const reference = `NL-${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, '0')}${String(stamp.getDate()).padStart(2, '0')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    const result = await addNewsletterSubscriber({
      email: parsed.data.email.toLowerCase(),
      fullName: parsed.data.fullName,
      reference,
    })
    if (!result.created) {
      return NextResponse.json(
        {
          error: 'EMAIL_ALREADY_SUBSCRIBED',
          message: 'Cette adresse e-mail est déjà inscrite.',
        },
        { status: 409 }
      )
    }
    return NextResponse.json({ ok: true, subscriber: result.subscriber })
  }

  if (parsed.data.action === 'archive') {
    const removed = await archiveNewsletterSubscribers(parsed.data.ids, auth.session.userId)
    return NextResponse.json({ ok: true, removed })
  }

  if (parsed.data.action === 'restore') {
    const restored = await restoreNewsletterSubscribers(parsed.data.ids, auth.session.userId)
    return NextResponse.json({ ok: true, restored })
  }

  if (parsed.data.action === 'purge') {
    const purged = await purgeNewsletterSubscribers(parsed.data.ids, auth.session.userId)
    return NextResponse.json({ ok: true, purged })
  }

  if (parsed.data.action === 'empty-trash') {
    const purged = await emptyNewsletterTrash(auth.session.userId)
    return NextResponse.json({ ok: true, purged })
  }

  if (parsed.data.action === 'dedupe') {
    const removed = await dedupeNewsletterSubscribers(auth.session.userId)
    return NextResponse.json({ ok: true, removed })
  }

  if (parsed.data.action === 'cancel-campaign') {
    const updated = await updateNewsletterCampaign(
      parsed.data.campaignId,
      { status: 'cancelled', scheduledAt: null },
      auth.session.userId
    )
    if (!updated) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, campaign: updated })
  }

  const ok = await removeNewsletterCampaign(parsed.data.campaignId, auth.session.userId)
  if (!ok) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const auth = await requireApiPermission('menu.site.newsletter')
  if (auth.error) return auth.error

  let payload: { id?: string; ids?: string[] } = {}
  try {
    payload = (await req.json()) as { id?: string; ids?: string[] }
  } catch {
    return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 })
  }

  const ids = [
    ...(Array.isArray(payload.ids) ? payload.ids : []),
    typeof payload.id === 'string' ? payload.id.trim() : '',
  ].filter(Boolean)

  if (!ids.length) {
    return NextResponse.json({ error: 'MISSING_ID' }, { status: 400 })
  }

  const removed = await archiveNewsletterSubscribers(ids, auth.session.userId)
  if (!removed) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, removed })
}
