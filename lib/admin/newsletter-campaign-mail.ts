import { CSIRT_BRAND } from '@/lib/csirt/brand'
import {
  resolveEmailLogoAttachment,
  resolveEmailLogoSrc,
} from '@/lib/csirt/email-brand-assets'
import {
  escapeHtml,
  getEmailPublicBaseUrl,
  renderActionButtons,
  renderBrandRibbon,
  renderEmailFooter,
  renderEmailShell,
  renderInfoPanel,
} from '@/lib/csirt/email-template-utils'
import { sendEmail } from '@/lib/services/email'
import { getPlatformSettings } from '@/lib/services/platform-settings'
import { smtpConfigReady } from '@/lib/services/smtp-mailer'
import { isMockDataEnabled } from '@/lib/mock/config'
import type { NewsletterSubscriber } from '@/lib/admin/newsletter-subscribers'
import { buildUnsubscribeUrl } from '@/lib/admin/newsletter-unsubscribe'

function toHtmlParagraphs(body: string) {
  const escaped = escapeHtml(body.trim())
  return escaped
    .split(/\n{2,}/)
    .map(
      (block) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#334155;">${block.replaceAll('\n', '<br/>')}</p>`
    )
    .join('')
}

function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

/** Nettoyage léger pour HTML admin → e-mail. */
function sanitizeEmailHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
}

function toBodyHtml(body: string) {
  const trimmed = body.trim()
  if (!trimmed) return ''
  if (looksLikeHtml(trimmed)) {
    return `<div style="font-size:15px;line-height:1.7;color:#334155;">${sanitizeEmailHtml(trimmed)}</div>`
  }
  return toHtmlParagraphs(trimmed)
}

export function normalizeCcEmails(raw: string[] | string | undefined | null): string[] {
  const parts = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(/[;,]/)
      : []
  const emails = parts
    .map((item) => item.trim().toLowerCase())
    .filter((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item))
  return Array.from(new Set(emails))
}

export function buildNewsletterCampaignHtml(input: {
  fullName: string
  subject: string
  previewText?: string
  body: string
  ctaHref?: string
  ctaLabel?: string
  logoSrc?: string | null
  unsubscribeUrl?: string | null
}) {
  const greeting = input.fullName.trim()
    ? `Bonjour ${escapeHtml(input.fullName.trim())},`
    : 'Bonjour,'
  const preview = input.previewText?.trim()
  const siteUrl = getEmailPublicBaseUrl()
  const ctaHref = input.ctaHref || `${siteUrl}/actualites`
  const ctaLabel = input.ctaLabel || 'Voir le portail'

  const body = `
    ${renderBrandRibbon({
      eyebrow: CSIRT_BRAND.name,
      title: input.subject,
      subtitle:
        preview ||
        'Alerte et publication officielle du Centre de réponse aux incidents de cybersécurité.',
      logoSrc: input.logoSrc,
    })}

    <tr>
      <td style="padding:26px 30px 8px;">
        <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#0f172a;">${greeting}</p>
        ${
          preview
            ? renderInfoPanel(
                `<strong style="display:block;margin-bottom:6px;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;">En bref</strong>${escapeHtml(preview)}`,
                'success'
              )
            : ''
        }
      </td>
    </tr>

    <tr>
      <td style="padding:${preview ? '18px' : '8px'} 30px 8px;">
        ${toBodyHtml(input.body)}
      </td>
    </tr>

    <tr>
      <td style="padding:18px 30px 8px;">
        ${renderActionButtons([{ label: ctaLabel, href: ctaHref, primary: true }])}
      </td>
    </tr>

    <tr>
      <td style="padding:8px 30px 18px;">
        <p style="margin:0;font-size:15px;line-height:1.7;color:#0f172a;">
          Cordialement,<br/>
          <strong>${escapeHtml(CSIRT_BRAND.name)}</strong><br/>
          <span style="color:#64748b;font-size:13px;">${escapeHtml(CSIRT_BRAND.fullName)}</span>
        </p>
      </td>
    </tr>

    ${renderEmailFooter(
      `Vous recevez cet e-mail car vous êtes abonné(e) aux alertes officielles du ${CSIRT_BRAND.name}.`,
      { unsubscribeUrl: input.unsubscribeUrl }
    )}
  `

  return renderEmailShell({
    title: input.subject,
    preheader: preview || input.subject,
    accentColor: '#166534',
    body,
  })
}

export type CampaignSendResult = {
  sent: number
  failed: number
  delivery: 'sent' | 'mock' | 'simulated' | 'no_smtp' | 'failed'
}

export async function sendNewsletterCampaignMails(input: {
  subject: string
  previewText?: string
  body: string
  recipients: Array<NewsletterSubscriber & { skipUnsubscribe?: boolean }>
  ccEmails?: string[]
  ctaHref?: string
  ctaLabel?: string
  fileAttachments?: Array<{
    filename: string
    content: Buffer
    contentType?: string
  }>
}): Promise<CampaignSendResult> {
  const settings = await getPlatformSettings()
  const recipients = input.recipients.filter((item) => item.email.trim())
  const cc = normalizeCcEmails(input.ccEmails)
  if (!recipients.length) {
    return { sent: 0, failed: 0, delivery: 'failed' }
  }

  const canRealSmtp = smtpConfigReady(settings) && !isMockDataEnabled()
  let delivery: CampaignSendResult['delivery'] = canRealSmtp
    ? 'sent'
    : isMockDataEnabled()
      ? 'mock'
      : process.env.NODE_ENV === 'development'
        ? 'simulated'
        : 'no_smtp'

  if (!canRealSmtp && delivery === 'no_smtp') {
    return { sent: 0, failed: recipients.length, delivery: 'no_smtp' }
  }

  const logoSrc = await resolveEmailLogoSrc()
  const logoAttachment = await resolveEmailLogoAttachment()
  const attachments = [
    ...(logoAttachment
      ? [
          {
            filename: logoAttachment.filename,
            content: logoAttachment.content,
            contentType: logoAttachment.contentType,
            cid: logoAttachment.cid,
            contentDisposition: 'inline' as const,
          },
        ]
      : []),
    ...(input.fileAttachments ?? []).map((file) => ({
      filename: file.filename,
      content: file.content,
      contentType: file.contentType,
      contentDisposition: 'attachment' as const,
    })),
  ]
  let sent = 0
  let failed = 0

  for (let index = 0; index < recipients.length; index += 1) {
    const recipient = recipients[index]
    const html = buildNewsletterCampaignHtml({
      fullName: recipient.fullName,
      subject: input.subject,
      previewText: input.previewText,
      body: input.body,
      ctaHref: input.ctaHref,
      ctaLabel: input.ctaLabel,
      logoSrc,
      unsubscribeUrl: recipient.skipUnsubscribe
        ? null
        : buildUnsubscribeUrl({ id: recipient.id, email: recipient.email }),
    })
    const ok = await sendEmail({
      to: recipient.email,
      // Cc only on the first mail to avoid flooding copy recipients
      cc: index === 0 && cc.length ? cc : undefined,
      subject: `[${CSIRT_BRAND.name}] ${input.subject}`,
      html,
      attachments: attachments.length ? attachments : undefined,
    })
    if (ok || delivery === 'mock' || delivery === 'simulated') {
      sent += 1
    } else {
      failed += 1
      delivery = 'failed'
    }
  }

  return { sent, failed, delivery }
}
