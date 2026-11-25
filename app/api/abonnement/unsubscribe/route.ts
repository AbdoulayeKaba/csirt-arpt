import { NextResponse } from 'next/server'
import {
  findNewsletterSubscriberById,
  unsubscribeNewsletterSubscriber,
} from '@/lib/admin/newsletter-subscribers'
import { verifyUnsubscribeToken } from '@/lib/admin/newsletter-unsubscribe'

function maskEmail(email: string) {
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  const visible = local.slice(0, Math.min(2, local.length))
  return `${visible}${'*'.repeat(Math.max(local.length - visible.length, 2))}@${domain}`
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token')?.trim() ?? ''
  const payload = verifyUnsubscribeToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'INVALID_TOKEN', valid: false }, { status: 400 })
  }

  const subscriber = await findNewsletterSubscriberById(payload.id)
  if (!subscriber || subscriber.email.toLowerCase() !== payload.email) {
    return NextResponse.json({ error: 'NOT_FOUND', valid: false }, { status: 404 })
  }

  return NextResponse.json({
    valid: true,
    emailMasked: maskEmail(subscriber.email),
    alreadyUnsubscribed: Boolean(subscriber.archivedAt),
  })
}

export async function POST(req: Request) {
  let body: { token?: string }
  try {
    body = (await req.json()) as { token?: string }
  } catch {
    return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 })
  }

  const payload = verifyUnsubscribeToken(String(body.token ?? '').trim())
  if (!payload) {
    return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 400 })
  }

  const result = await unsubscribeNewsletterSubscriber(payload)
  if (result === 'not_found') {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  return NextResponse.json({
    ok: true,
    status: result,
    message:
      result === 'already'
        ? 'Cette adresse est déjà désabonnée.'
        : 'Vous êtes désabonné(e) des alertes CSIRT-ARPT.',
  })
}
