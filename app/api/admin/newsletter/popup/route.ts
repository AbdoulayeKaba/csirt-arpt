import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireApiPermission } from '@/lib/auth/permission-guard'
import {
  getNewsletterPopupConfig,
  listNewsletterPopupPageOptions,
  updateNewsletterPopupConfig,
} from '@/lib/admin/newsletter-popup'

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  scrollPercent: z.number().min(1).max(100).optional(),
  delayMs: z.number().min(0).max(60000).optional(),
  cookieDays: z.number().min(0).max(365).optional(),
  paths: z.array(z.string().max(200)).max(80).optional(),
  title: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().min(2).max(400).optional(),
  ctaLabel: z.string().trim().min(2).max(80).optional(),
})

export async function GET() {
  const auth = await requireApiPermission('menu.site.newsletter')
  if (auth.error) return auth.error

  const [config, pages] = await Promise.all([
    getNewsletterPopupConfig(),
    listNewsletterPopupPageOptions(),
  ])
  return NextResponse.json({ ...config, pages })
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

  try {
    const current = await getNewsletterPopupConfig()
    const nextEnabled = parsed.data.enabled ?? current.enabled
    const nextPaths = parsed.data.paths ?? current.paths
    if (nextEnabled && nextPaths.length === 0) {
      return NextResponse.json(
        {
          error: 'PAGES_REQUIRED',
          message: 'Sélectionnez au moins une page avant d’activer le pop-up.',
        },
        { status: 400 }
      )
    }

    const config = await updateNewsletterPopupConfig(parsed.data, auth.session.userId)
    const pages = await listNewsletterPopupPageOptions()
    return NextResponse.json({ ...config, pages })
  } catch {
    return NextResponse.json({ error: 'SAVE_FAILED' }, { status: 500 })
  }
}
