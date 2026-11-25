import { NextResponse } from 'next/server'
import { requireApiPermission, userHasPermission } from '@/lib/auth/permission-guard'
import { refreshAllCollectedPublicationDates } from '@/lib/site/news-scrape'
import { getSiteContent, saveSiteContent } from '@/lib/site/store'
import { writeAudit } from '@/lib/services/audit'

export async function POST(req: Request) {
  const auth = await requireApiPermission('site.manage', undefined, req)
  if (auth.error) return auth.error
  if (!(await userHasPermission(auth.session.role, 'action.site.edit'))) {
    return NextResponse.json(
      {
        error: 'FORBIDDEN',
        message: 'Vous n’avez pas la permission de corriger les dates.',
      },
      { status: 403 }
    )
  }

  let sourceIds: string[] | undefined
  try {
    const body = (await req.json().catch(() => ({}))) as { sourceIds?: unknown }
    if (Array.isArray(body.sourceIds)) {
      sourceIds = body.sourceIds.filter((id): id is string => typeof id === 'string')
    }
  } catch {
    sourceIds = undefined
  }

  const current = await getSiteContent()
  const result = await refreshAllCollectedPublicationDates(current, { sourceIds })

  let site
  try {
    site = await saveSiteContent(result.site, auth.session.userId)
  } catch {
    return NextResponse.json(
      {
        error: 'SAVE_FAILED',
        message: 'Les dates ont été relues mais l’enregistrement a échoué. Réessayez.',
        updated: result.updated,
      },
      { status: 503 }
    )
  }

  await writeAudit(auth.session.userId, 'site.news.refresh_dates', undefined, {
    updated: result.updated,
    sourceIds: sourceIds ?? [],
  })

  return NextResponse.json({
    site,
    updated: result.updated,
  })
}
