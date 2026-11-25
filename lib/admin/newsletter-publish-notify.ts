import type { SiteContent, SitePage } from '@/lib/site/types'
import {
  isAlertNewsCategory,
  type SiteNewsCollectedItem,
  type SiteNewsTopic,
} from '@/lib/site/news-sources'
import {
  listNewsletterSubscribers,
  type NewsletterSubscriber,
} from '@/lib/admin/newsletter-subscribers'
import { addNewsletterCampaign } from '@/lib/admin/newsletter-campaigns'
import { sendNewsletterCampaignMails } from '@/lib/admin/newsletter-campaign-mail'
import { listIncidents } from '@/lib/services/incidents-store'

export type NewsletterNotifyResult = {
  notified: number
  campaigns: number
  articles: number
  declarants?: number
}

type CampaignRecipient = NewsletterSubscriber & {
  /** Déclarants de signalement : pas de lien désabonnement newsletter. */
  skipUnsubscribe?: boolean
}

function pageExcerpt(page: SitePage) {
  const lead = page.lead?.trim()
  if (lead) return lead.slice(0, 280)
  const body = page.body?.replace(/\s+/g, ' ').trim() ?? ''
  return body.slice(0, 280)
}

function collectedExcerpt(item: SiteNewsCollectedItem) {
  const excerpt = item.excerpt?.replace(/\s+/g, ' ').trim()
  if (excerpt) return excerpt.slice(0, 280)
  const html = item.bodyHtml?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() ?? ''
  return html.slice(0, 280)
}

function isValidEmail(value?: string | null): value is string {
  if (!value?.trim()) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

/** E-mails des déclarants de signalements actifs (non archivés). */
export async function listSignalementDeclarantRecipients(): Promise<CampaignRecipient[]> {
  const { items } = await listIncidents({ status: 'ALL' })
  const seen = new Set<string>()
  const recipients: CampaignRecipient[] = []

  for (const incident of items) {
    const email = incident.email?.trim().toLowerCase()
    if (!isValidEmail(email) || seen.has(email)) continue
    seen.add(email)
    const fullName =
      incident.identify === 'yes' && incident.fullName?.trim() && incident.fullName !== 'Anonyme'
        ? incident.fullName.trim()
        : ''
    recipients.push({
      id: `declarant-${incident.id}`,
      email,
      fullName,
      reference: incident.reference || incident.id,
      subscribedAt: incident.createdAt,
      skipUnsubscribe: true,
    })
  }

  return recipients
}

function mergeRecipients(
  subscribers: NewsletterSubscriber[],
  declarants: CampaignRecipient[]
): CampaignRecipient[] {
  const seen = new Set<string>()
  const merged: CampaignRecipient[] = []

  for (const subscriber of subscribers) {
    const email = subscriber.email.trim().toLowerCase()
    if (!email || seen.has(email)) continue
    seen.add(email)
    merged.push({ ...subscriber, email })
  }

  for (const declarant of declarants) {
    const email = declarant.email.trim().toLowerCase()
    if (!email || seen.has(email)) continue
    seen.add(email)
    merged.push({ ...declarant, email })
  }

  return merged
}

export function findNewlyPublishedPages(
  previous: SiteContent | null | undefined,
  next: SiteContent
): SitePage[] {
  const prevMap = new Map((previous?.pages ?? []).map((page) => [page.path, page]))
  return next.pages.filter((page) => {
    if (!page.published) return false
    const before = prevMap.get(page.path)
    return !before || !before.published
  })
}

/** Articles collectés qui viennent d’être affichés sur le site public. */
export function findNewlyEnabledCollected(
  previous: SiteContent | null | undefined,
  next: SiteContent
): SiteNewsCollectedItem[] {
  const prevMap = new Map((previous?.newsCollected ?? []).map((item) => [item.id, item]))
  return (next.newsCollected ?? []).filter((item) => {
    if (!item.enabled || item.archived) return false
    const before = prevMap.get(item.id)
    return !before || !before.enabled
  })
}

export function filterAlertCollectedItems(
  items: SiteNewsCollectedItem[],
  topics?: readonly SiteNewsTopic[] | null
): SiteNewsCollectedItem[] {
  return items.filter((item) => isAlertNewsCategory(item.category, topics))
}

async function sendOneCampaign(input: {
  subject: string
  previewText: string
  body: string
  href: string
  ctaLabel: string
  actorId?: string
  actorName?: string
  subscriberCount: number
  recipients: CampaignRecipient[]
}) {
  const result = await sendNewsletterCampaignMails({
    subject: input.subject,
    previewText: input.previewText,
    body: input.body,
    recipients: input.recipients,
    ctaHref: input.href,
    ctaLabel: input.ctaLabel,
  })

  if (result.delivery === 'no_smtp') {
    return { sent: 0, campaignCreated: false }
  }

  await addNewsletterCampaign(
    {
      subject: input.subject,
      previewText: input.previewText,
      body: input.body,
      recipientMode: 'all',
      recipientCount: input.subscriberCount,
      sentCount: result.sent,
      failedCount: result.failed,
      ccEmails: [],
      status: result.failed && !result.sent ? 'failed' : 'sent',
      scheduledAt: null,
      sentById: input.actorId,
      sentByName: input.actorName ?? 'Publication automatique',
    },
    input.actorId
  )

  return { sent: result.sent, campaignCreated: true }
}

export async function notifySubscribersOfPublishedPages(input: {
  pages: SitePage[]
  siteOrigin?: string
  actorId?: string
  actorName?: string
}): Promise<NewsletterNotifyResult> {
  if (!input.pages.length) return { notified: 0, campaigns: 0, articles: 0 }

  const subscribers = await listNewsletterSubscribers()
  if (!subscribers.length) return { notified: 0, campaigns: 0, articles: input.pages.length }

  const origin = (input.siteOrigin ?? process.env.NEXTAUTH_URL ?? 'https://csirt.arpt.gov.gn').replace(
    /\/$/,
    ''
  )

  let campaigns = 0
  let notified = 0

  for (const page of input.pages) {
    const subject = `Nouvelle publication : ${page.title}`
    const previewText = pageExcerpt(page)
    const href = `${origin}${page.path.startsWith('/') ? page.path : `/${page.path}`}`
    const body = [
      `Une nouvelle publication est disponible sur le portail officiel CSIRT-ARPT.`,
      ``,
      `Titre : ${page.title}`,
      previewText ? `Résumé : ${previewText}` : '',
      ``,
      `Consultez l’article sur le site public.`,
    ]
      .filter(Boolean)
      .join('\n')

    const result = await sendOneCampaign({
      subject,
      previewText,
      body,
      href,
      ctaLabel: 'Lire la publication',
      actorId: input.actorId,
      actorName: input.actorName,
      subscriberCount: subscribers.length,
      recipients: subscribers,
    })
    if (result.campaignCreated) campaigns += 1
    notified += result.sent
  }

  return { notified, campaigns, articles: input.pages.length }
}

export async function notifySubscribersOfEnabledCollected(input: {
  items: SiteNewsCollectedItem[]
  siteOrigin?: string
  actorId?: string
  actorName?: string
  newsTopics?: readonly SiteNewsTopic[] | null
}): Promise<NewsletterNotifyResult> {
  if (!input.items.length) return { notified: 0, campaigns: 0, articles: 0, declarants: 0 }

  const alertItems = filterAlertCollectedItems(input.items, input.newsTopics)
  const isAlertActivation = alertItems.length > 0

  const subscribers = await listNewsletterSubscribers()
  const declarants = isAlertActivation ? await listSignalementDeclarantRecipients() : []
  const recipients = mergeRecipients(subscribers, declarants)

  if (!recipients.length) {
    return {
      notified: 0,
      campaigns: 0,
      articles: input.items.length,
      declarants: declarants.length,
    }
  }

  const origin = (input.siteOrigin ?? process.env.NEXTAUTH_URL ?? 'https://csirt.arpt.gov.gn').replace(
    /\/$/,
    ''
  )

  // Un seul e-mail digest si plusieurs articles activés d’un coup (ex. « Tout afficher »)
  if (input.items.length > 1) {
    const subject = isAlertActivation
      ? `Alerte CSIRT-ARPT : ${input.items.length} publications activées`
      : `${input.items.length} nouvelles publications CSIRT-ARPT`
    const previewText = isAlertActivation
      ? `Alerte cyber : ${alertItems.length} alerte(s) parmi ${input.items.length} publication(s) activée(s).`
      : `Veille cyber : ${input.items.length} articles viennent d’être publiés.`
    const list = input.items
      .slice(0, 20)
      .map((item, index) => {
        const href = `${origin}/actualites/${item.id}`
        const alertMark = isAlertNewsCategory(item.category, input.newsTopics) ? ' [ALERTE]' : ''
        return `${index + 1}.${alertMark} ${item.title}\n   ${href}`
      })
      .join('\n\n')
    const more =
      input.items.length > 20
        ? `\n\n… et ${input.items.length - 20} autre(s) publication(s) sur le portail.`
        : ''
    const body = [
      isAlertActivation
        ? `Une ou plusieurs alertes de sécurité viennent d’être publiées sur le portail officiel CSIRT-ARPT.`
        : `De nouvelles publications sont disponibles sur le portail officiel CSIRT-ARPT :`,
      ``,
      list + more,
      ``,
      isAlertActivation
        ? `Merci de consulter ces informations et d’appliquer les mesures recommandées le cas échéant.`
        : `Consultez l’ensemble des actualités sur le site public.`,
    ].join('\n')

    const result = await sendOneCampaign({
      subject,
      previewText,
      body,
      href: `${origin}/actualites`,
      ctaLabel: isAlertActivation ? 'Voir les alertes' : 'Voir les actualités',
      actorId: input.actorId,
      actorName: input.actorName,
      subscriberCount: recipients.length,
      recipients,
    })

    return {
      notified: result.sent,
      campaigns: result.campaignCreated ? 1 : 0,
      articles: input.items.length,
      declarants: declarants.length,
    }
  }

  const item = input.items[0]
  const itemIsAlert = isAlertNewsCategory(item.category, input.newsTopics)
  const subject = itemIsAlert
    ? `Alerte CSIRT-ARPT : ${item.title}`
    : `Nouvelle publication : ${item.title}`
  const previewText = collectedExcerpt(item)
  const href = `${origin}/actualites/${item.id}`
  const body = [
    itemIsAlert
      ? `Une alerte de sécurité vient d’être activée sur le portail officiel CSIRT-ARPT.`
      : `Une nouvelle publication est disponible sur le portail officiel CSIRT-ARPT.`,
    ``,
    `Titre : ${item.title}`,
    previewText ? `Résumé : ${previewText}` : '',
    ``,
    itemIsAlert
      ? `Consultez l’alerte sur le site public et appliquez les mesures recommandées si nécessaire.`
      : `Consultez l’article sur le site public.`,
  ]
    .filter(Boolean)
    .join('\n')

  const result = await sendOneCampaign({
    subject,
    previewText,
    body,
    href,
    ctaLabel: itemIsAlert ? 'Lire l’alerte' : 'Lire la publication',
    actorId: input.actorId,
    actorName: input.actorName,
    subscriberCount: recipients.length,
    recipients,
  })

  return {
    notified: result.sent,
    campaigns: result.campaignCreated ? 1 : 0,
    articles: 1,
    declarants: declarants.length,
  }
}

/** Notifie pour pages + articles collectés nouvellement publiés. */
export async function notifySubscribersOfSitePublications(input: {
  previous: SiteContent | null | undefined
  next: SiteContent
  siteOrigin?: string
  actorId?: string
  actorName?: string
}): Promise<NewsletterNotifyResult> {
  const pages = findNewlyPublishedPages(input.previous, input.next)
  const collected = findNewlyEnabledCollected(input.previous, input.next)

  const pageResult = await notifySubscribersOfPublishedPages({
    pages,
    siteOrigin: input.siteOrigin,
    actorId: input.actorId,
    actorName: input.actorName,
  })
  const collectedResult = await notifySubscribersOfEnabledCollected({
    items: collected,
    siteOrigin: input.siteOrigin,
    actorId: input.actorId,
    actorName: input.actorName,
    newsTopics: input.next.newsTopics,
  })

  return {
    notified: pageResult.notified + collectedResult.notified,
    campaigns: pageResult.campaigns + collectedResult.campaigns,
    articles: pageResult.articles + collectedResult.articles,
    declarants: collectedResult.declarants ?? 0,
  }
}
