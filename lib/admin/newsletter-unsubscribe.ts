import 'server-only'

import { createHmac, timingSafeEqual } from 'crypto'
import { getEmailPublicBaseUrl } from '@/lib/csirt/email-template-utils'

const PREFIX = 'nlunsub1'

function secret() {
  return (
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    'csirt-newsletter-unsubscribe-dev'
  )
}

function sign(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export type UnsubscribeTokenPayload = {
  id: string
  email: string
}

/** Jeton durable lié à l’abonné (lien dans les e-mails). */
export function createUnsubscribeToken(input: UnsubscribeTokenPayload): string {
  const email = input.email.trim().toLowerCase()
  const id = input.id.trim()
  const body = Buffer.from(JSON.stringify({ id, email }), 'utf8').toString('base64url')
  return `${PREFIX}.${body}.${sign(`${PREFIX}.${body}`)}`
}

export function verifyUnsubscribeToken(token: string): UnsubscribeTokenPayload | null {
  const parts = token.trim().split('.')
  if (parts.length !== 3 || parts[0] !== PREFIX) return null
  const [, body, signature] = parts
  if (!body || !signature) return null
  if (!safeEqual(sign(`${PREFIX}.${body}`), signature)) return null
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
      id?: unknown
      email?: unknown
    }
    const id = typeof parsed.id === 'string' ? parsed.id.trim() : ''
    const email =
      typeof parsed.email === 'string' ? parsed.email.trim().toLowerCase() : ''
    if (!id || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
    return { id, email }
  } catch {
    return null
  }
}

export function buildUnsubscribeUrl(input: UnsubscribeTokenPayload): string {
  const base = getEmailPublicBaseUrl().replace(/\/$/, '')
  const token = createUnsubscribeToken(input)
  return `${base}/abonnement/desinscription?token=${encodeURIComponent(token)}`
}
