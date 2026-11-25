import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireApiPermission } from '@/lib/auth/permission-guard'
import { normalizeAssistantConfig } from '@/lib/csirt/assistant-store'
import { getAssistantConfig, upsertAssistantConfig } from '@/lib/csirt/assistant-store'

const linkSchema = z.object({
  label: z.string().trim().min(1).max(120),
  href: z.string().trim().min(1).max(400),
})

const itemSchema = z.object({
  id: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(200),
  query: z.string().trim().min(1).max(240),
  answerText: z.string().trim().min(1).max(4000),
  links: z.array(linkSchema).max(8).optional(),
  keywords: z.array(z.string().trim().min(1).max(80)).max(40),
  sortOrder: z.number().finite(),
  published: z.boolean(),
  archivedAt: z.string().trim().max(40).nullable().optional(),
})

const scopeSchema = z.object({
  welcome: z.string().trim().min(1).max(800),
  items: z.array(itemSchema).max(80),
})

const putSchema = z.object({
  site: scopeSchema,
  signalement: scopeSchema,
  fallback: z.object({
    text: z.string().trim().min(1).max(1000),
    links: z.array(linkSchema).max(8).optional(),
  }),
})

export async function GET() {
  const auth = await requireApiPermission('menu.site.assistant')
  if (auth.error) return auth.error

  const config = await getAssistantConfig()
  return NextResponse.json(config)
}

export async function PUT(req: Request) {
  const auth = await requireApiPermission('menu.site.assistant')
  if (auth.error) return auth.error

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }

  const parsed = putSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  try {
    const config = await upsertAssistantConfig(
      normalizeAssistantConfig(parsed.data),
      auth.session.userId
    )
    return NextResponse.json({ ok: true, config })
  } catch (error) {
    console.error('[PUT /api/admin/assistant]', error)
    return NextResponse.json({ error: 'SAVE_FAILED' }, { status: 500 })
  }
}
