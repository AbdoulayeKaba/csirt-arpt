import { after, NextResponse } from 'next/server'
import { requireApiPermission, userHasPermission } from '@/lib/auth/permission-guard'
import { getSiteContent, saveSiteContent } from '@/lib/site/store'
import { revalidateSitePublicPaths } from '@/lib/site/revalidate-site'
import { writeAudit } from '@/lib/services/audit'
import {
  findNewlyEnabledCollected,
  findNewlyPublishedPages,
  notifySubscribersOfSitePublications,
} from '@/lib/admin/newsletter-publish-notify'

export async function GET() {
  const auth = await requireApiPermission('site.manage')
  if (auth.error) return auth.error
  const site = await getSiteContent()
  return NextResponse.json({ site })
}

export async function PUT(req: Request) {
  const auth = await requireApiPermission('site.manage')
  if (auth.error) return auth.error
  if (!(await userHasPermission(auth.session.role, 'action.site.edit'))) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }

  const sitePayload =
    body && typeof body === 'object' && 'site' in body
      ? (body as { site: unknown }).site
      : body

  let previous
  let site
  try {
    previous = await getSiteContent()
    site = await saveSiteContent(sitePayload, auth.session.userId)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'SITE_SAVE_FAILED'
    return NextResponse.json(
      {
        error: message,
        message:
          message === 'SITE_SAVE_FAILED'
            ? 'Enregistrement impossible (contenu trop volumineux ou base indisponible). Réessayez.'
            : 'La modification n’a pas pu être appliquée.',
      },
      { status: 503 }
    )
  }

  await writeAudit(auth.session.userId, 'site.update', undefined, {
    resource: 'Site',
    updatedAt: site.updatedAt,
    comment: 'Contenu du site public enregistré',
  })
  revalidateSitePublicPaths()

  const newlyPublishedPages = findNewlyPublishedPages(previous, site)
  const newlyEnabledCollected = findNewlyEnabledCollected(previous, site)
  const shouldNotify = newlyPublishedPages.length + newlyEnabledCollected.length > 0
  const siteOrigin = req.headers.get('origin') ?? undefined
  const actorName =
    `${auth.session.firstName} ${auth.session.lastName}`.trim() || 'Publication'

  // Envoi newsletter hors chemin critique : l’UI reste réactive (évite « Action non enregistrée »)
  if (shouldNotify) {
    after(async () => {
      try {
        await notifySubscribersOfSitePublications({
          previous,
          next: site,
          siteOrigin,
          actorId: auth.session.userId,
          actorName,
        })
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[newsletter:publish-notify]', err)
      }
    })
  }

  return NextResponse.json({
    site,
    newsletterQueued: shouldNotify,
    newsletterPending: {
      pages: newlyPublishedPages.length,
      collected: newlyEnabledCollected.length,
    },
  })
}
