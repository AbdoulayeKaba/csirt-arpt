import 'server-only'
import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

const TOKEN_TTL_MS = 10 * 60 * 1000
const CHALLENGE_TTL_MS = 10 * 60 * 1000
/** Délai minimum humain entre émission du défi et validation. */
const MIN_INTERACTION_MS = 400
const PREFIX = 'sigcap1'

function secret() {
  return (
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    'csirt-signalement-captcha-dev'
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

function parseSeal(seal: string): { body: string; signature: string } | null {
  const parts = seal.split('.')
  if (parts.length !== 3 || parts[0] !== PREFIX) return null
  return { body: parts[1], signature: parts[2] }
}

function parseToken(token: string): { body: string; signature: string } | null {
  const parts = token.split('.')
  if (parts.length !== 4 || parts[0] !== PREFIX || parts[1] !== 'tok') return null
  return { body: parts[2], signature: parts[3] }
}

/** Clé publique Google reCAPTCHA v2 (case à cocher), si configurée. */
export function getRecaptchaSiteKey() {
  return (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '').trim()
}

export function isGoogleRecaptchaConfigured() {
  return Boolean(getRecaptchaSiteKey() && (process.env.RECAPTCHA_SECRET_KEY || '').trim())
}

export type CaptchaChallenge = {
  id: string
  issuedAt: number
  expiresAt: number
}

/** Émet un défi interactif (case à cocher) pour les signalements anonymes. */
export function createLocalCaptchaChallenge(): CaptchaChallenge {
  return {
    id: randomBytes(12).toString('hex'),
    issuedAt: Date.now(),
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  }
}

export function sealLocalCaptchaChallenge(challenge: CaptchaChallenge) {
  const body = Buffer.from(
    JSON.stringify({
      id: challenge.id,
      iat: challenge.issuedAt,
      exp: challenge.expiresAt,
    }),
    'utf8'
  ).toString('base64url')
  return `${PREFIX}.${body}.${sign(body)}`
}

export function issueLocalCaptchaToken(input: {
  challengeSeal: string
  /** Temps passé sur le widget avant validation (ms). */
  dwellMs?: number
  /** Champ honeypot : doit rester vide. */
  website?: string
}): { ok: true; token: string } | { ok: false; error: string } {
  if ((input.website || '').trim()) {
    return { ok: false, error: 'Vérification anti-robot refusée.' }
  }

  const parsed = parseSeal(input.challengeSeal)
  if (!parsed) {
    return { ok: false, error: 'Session de vérification invalide.' }
  }
  if (!safeEqual(sign(parsed.body), parsed.signature)) {
    return { ok: false, error: 'Session de vérification altérée.' }
  }

  let payload: { id?: string; iat?: number; exp?: number }
  try {
    payload = JSON.parse(Buffer.from(parsed.body, 'base64url').toString('utf8')) as typeof payload
  } catch {
    return { ok: false, error: 'Session de vérification illisible.' }
  }

  if (!payload.id || typeof payload.iat !== 'number' || typeof payload.exp !== 'number') {
    return { ok: false, error: 'Session de vérification incomplète.' }
  }
  if (Date.now() > payload.exp) {
    return { ok: false, error: 'Session de vérification expirée. Rechargez-la.' }
  }

  // Contrôle anti-bot basé sur le temps serveur (fiable), pas uniquement le dwell client.
  const elapsed = Date.now() - payload.iat
  if (elapsed < MIN_INTERACTION_MS) {
    return { ok: false, error: 'Vérification trop rapide. Réessayez.' }
  }

  const tokenBody = Buffer.from(
    JSON.stringify({
      id: payload.id,
      kind: 'local',
      exp: Date.now() + TOKEN_TTL_MS,
    }),
    'utf8'
  ).toString('base64url')
  return { ok: true, token: `${PREFIX}.tok.${tokenBody}.${sign(tokenBody)}` }
}

export function verifyLocalCaptchaToken(token: string): boolean {
  const parsed = parseToken(token)
  if (!parsed) return false
  if (!safeEqual(sign(parsed.body), parsed.signature)) return false
  try {
    const payload = JSON.parse(Buffer.from(parsed.body, 'base64url').toString('utf8')) as {
      exp?: number
      kind?: string
    }
    if (payload.kind !== 'local' || typeof payload.exp !== 'number') return false
    return Date.now() <= payload.exp
  } catch {
    return false
  }
}

export async function verifyGoogleRecaptchaToken(token: string, remoteIp?: string) {
  const secretKey = (process.env.RECAPTCHA_SECRET_KEY || '').trim()
  if (!secretKey || !token.trim()) return false

  const params = new URLSearchParams({
    secret: secretKey,
    response: token,
  })
  if (remoteIp) params.set('remoteip', remoteIp)

  const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    cache: 'no-store',
  })
  if (!response.ok) return false
  const data = (await response.json()) as { success?: boolean }
  return Boolean(data.success)
}

export async function verifyAnonymousCaptcha(input: {
  provider?: 'google' | 'local'
  token?: string
  remoteIp?: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = (input.token || '').trim()
  if (!token) {
    return { ok: false, error: 'Veuillez confirmer que vous n’êtes pas un robot.' }
  }

  if (input.provider === 'google' || (isGoogleRecaptchaConfigured() && !token.startsWith(`${PREFIX}.`))) {
    const ok = await verifyGoogleRecaptchaToken(token, input.remoteIp)
    return ok
      ? { ok: true }
      : { ok: false, error: 'Échec de la vérification anti-robot. Réessayez.' }
  }

  return verifyLocalCaptchaToken(token)
    ? { ok: true }
    : { ok: false, error: 'Vérification anti-robot expirée ou invalide. Recommencez.' }
}
