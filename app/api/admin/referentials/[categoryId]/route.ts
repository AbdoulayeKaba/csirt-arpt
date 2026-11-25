import { NextResponse } from 'next/server'
import { requireApiSession } from '@/lib/auth/api-auth'
import { userHasPermission } from '@/lib/auth/permission-guard'
import { canManageReferentials } from '@/lib/dg/referential-access'
import {
  isReferentialCategoryId,
  REFERENTIAL_CATEGORY_MAP,
} from '@/lib/dg/referential-catalog'
import { writeAuditSafe } from '@/lib/services/audit'
import {
  createReferentialItem,
  listReferentialItems,
} from '@/lib/services/referentials-admin'

type RouteContext = { params: Promise<{ categoryId: string }> }

async function canReadCategory(role: string, categoryId: string) {
  const cat = isReferentialCategoryId(categoryId)
    ? REFERENTIAL_CATEGORY_MAP[categoryId]
    : null
  if (!cat) return false
  if (await userHasPermission(role, cat.menuPermission)) return true
  if (await canManageReferentials(role)) return true
  // Thématiques aussi utilisées dans Sources & Collecte
  if (categoryId === 'thematiques') {
    return (
      (await userHasPermission(role, 'menu.site.news')) ||
      (await userHasPermission(role, 'action.site.edit'))
    )
  }
  return false
}

export async function GET(_req: Request, context: RouteContext) {
  const { session, error } = await requireApiSession()
  if (error) return error

  const { categoryId } = await context.params
  if (!isReferentialCategoryId(categoryId)) {
    return NextResponse.json({ error: 'UNKNOWN_CATEGORY' }, { status: 404 })
  }
  if (!(await canReadCategory(session.role, categoryId))) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  const url = new URL(_req.url)
  const archived = url.searchParams.get('archived') === '1'
  const search = url.searchParams.get('q') ?? undefined
  const items = await listReferentialItems(categoryId, { archived, search })
  return NextResponse.json({ items })
}

export async function POST(req: Request, context: RouteContext) {
  const { session, error } = await requireApiSession()
  if (error) return error

  const { categoryId } = await context.params
  if (!isReferentialCategoryId(categoryId)) {
    return NextResponse.json({ error: 'UNKNOWN_CATEGORY' }, { status: 404 })
  }
  if (!(await canManageReferentials(session.role))) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    name?: string
    value?: string
    meta?: unknown
  }
  const result = await createReferentialItem({
    categoryId,
    name: body.name ?? '',
    value: body.value,
    meta: body.meta,
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const catLabel = REFERENTIAL_CATEGORY_MAP[categoryId].label
  await writeAuditSafe(session.userId, 'referential.create', result.item.id, {
    resource: 'Référentiel',
    target: `${catLabel} · ${result.item.name}`,
    comment: `${catLabel} « ${result.item.name} » créée`,
  })

  return NextResponse.json({ item: result.item }, { status: 201 })
}
