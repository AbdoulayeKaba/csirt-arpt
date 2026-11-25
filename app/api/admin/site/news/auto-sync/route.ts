import { NextResponse } from 'next/server'
import { requireApiPermission, userHasPermission } from '@/lib/auth/permission-guard'

/** La collecte automatique est arrêtée : les alertes se saisissent manuellement. */
export async function POST(req: Request) {
  const auth = await requireApiPermission('site.manage', undefined, req)
  if (auth.error) return auth.error
  if (!(await userHasPermission(auth.session.role, 'action.site.edit'))) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  return NextResponse.json(
    {
      error: 'COLLECTION_DISABLED',
      message: 'La collecte automatique est arrêtée. Les alertes se saisissent manuellement, par catégorie.',
    },
    { status: 410 }
  )
}
