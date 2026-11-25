import { NextResponse } from 'next/server'
import { requireApiSession } from '@/lib/auth/api-auth'
import { userHasPermission } from '@/lib/auth/permission-guard'
import { canManageReferentials } from '@/lib/dg/referential-access'
import {
  REFERENTIAL_CATEGORIES,
  type ReferentialCategoryId,
} from '@/lib/dg/referential-catalog'
import { listReferentialCatalog } from '@/lib/services/referentials-admin'

async function readableCategories(role: string): Promise<ReferentialCategoryId[] | null> {
  if (await canManageReferentials(role)) return null
  const allowed: ReferentialCategoryId[] = []
  for (const cat of REFERENTIAL_CATEGORIES) {
    if (cat.menuPermission && (await userHasPermission(role, cat.menuPermission))) {
      allowed.push(cat.id)
      continue
    }
    if (
      cat.id === 'thematiques' &&
      ((await userHasPermission(role, 'menu.site.news')) ||
        (await userHasPermission(role, 'action.site.edit')))
    ) {
      allowed.push(cat.id)
    }
  }
  return allowed
}

export async function GET() {
  const { session, error } = await requireApiSession()
  if (error) return error

  const [items, allowed] = await Promise.all([
    listReferentialCatalog(),
    readableCategories(session.role),
  ])
  return NextResponse.json({
    items: allowed ? items.filter((item) => allowed.includes(item.categoryId)) : items,
  })
}
