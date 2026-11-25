import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireApiPermission } from '@/lib/auth/permission-guard'
import {
  archiveContactMessages,
  emptyContactTrash,
  listContactMessages,
  listContactTrash,
  markContactMessageRead,
  purgeContactMessages,
  restoreContactMessages,
} from '@/lib/admin/contact-messages'

const patchSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.enum(['read', 'archive', 'restore', 'purge']),
    ids: z.array(z.string().min(1)).min(1).max(200),
  }),
  z.object({
    action: z.literal('empty-trash'),
  }),
])

async function payload() {
  const [items, trash] = await Promise.all([listContactMessages(), listContactTrash()])
  return {
    items,
    trash,
    unreadCount: items.filter((item) => !item.readAt).length,
    trashTotal: trash.length,
  }
}

export async function GET() {
  const auth = await requireApiPermission('menu.site.contact')
  if (auth.error) return auth.error
  return NextResponse.json(await payload())
}

export async function PATCH(req: Request) {
  const auth = await requireApiPermission('menu.site.contact')
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

  const userId = auth.session.userId
  let affected = 0

  if (parsed.data.action === 'read') {
    for (const id of parsed.data.ids) {
      await markContactMessageRead(id, userId)
    }
    affected = parsed.data.ids.length
  } else if (parsed.data.action === 'archive') {
    affected = await archiveContactMessages(parsed.data.ids, userId)
  } else if (parsed.data.action === 'restore') {
    affected = await restoreContactMessages(parsed.data.ids, userId)
  } else if (parsed.data.action === 'purge') {
    affected = await purgeContactMessages(parsed.data.ids, userId)
  } else {
    affected = await emptyContactTrash(userId)
  }

  return NextResponse.json({
    ...(await payload()),
    affected,
  })
}
