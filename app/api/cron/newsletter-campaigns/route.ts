import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/site/cron-auth'
import {
  listDueScheduledCampaigns,
  updateNewsletterCampaign,
} from '@/lib/admin/newsletter-campaigns'
import { listNewsletterSubscribers } from '@/lib/admin/newsletter-subscribers'
import { sendNewsletterCampaignMails } from '@/lib/admin/newsletter-campaign-mail'
import { readNewsletterAttachments } from '@/lib/storage/newsletter-attachments'

export async function POST(req: Request) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const due = await listDueScheduledCampaigns()
  if (!due.length) {
    return NextResponse.json({ ok: true, processed: 0, skipped: true })
  }

  const subscribers = await listNewsletterSubscribers()
  let processed = 0
  let sent = 0
  let failed = 0

  for (const campaign of due) {
    const recipients =
      campaign.recipientMode === 'selected' && campaign.recipientIds?.length
        ? subscribers.filter((item) => campaign.recipientIds?.includes(item.id))
        : subscribers

    if (!recipients.length) {
      await updateNewsletterCampaign(campaign.id, {
        status: 'failed',
        failedCount: campaign.recipientCount,
        sentCount: 0,
        sentAt: new Date().toISOString(),
      })
      processed += 1
      failed += 1
      continue
    }

    const fileAttachments = await readNewsletterAttachments(campaign.id, campaign.attachments)
    const result = await sendNewsletterCampaignMails({
      subject: campaign.subject,
      previewText: campaign.previewText,
      body: campaign.body,
      recipients,
      ccEmails: campaign.ccEmails,
      fileAttachments,
    })

    await updateNewsletterCampaign(campaign.id, {
      status: result.delivery === 'no_smtp' || (result.failed && !result.sent) ? 'failed' : 'sent',
      sentCount: result.sent,
      failedCount: result.failed,
      recipientCount: recipients.length,
      sentAt: new Date().toISOString(),
      scheduledAt: null,
    })

    processed += 1
    sent += result.sent
    failed += result.failed
  }

  return NextResponse.json({ ok: true, processed, sent, failed, skipped: false })
}
