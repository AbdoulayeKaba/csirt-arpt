import { NextResponse } from 'next/server'
import { clientRateKey, consumeRateLimit } from '@/lib/auth/login-rate-limit'
import {
  createLocalCaptchaChallenge,
  getRecaptchaSiteKey,
  isGoogleRecaptchaConfigured,
  issueLocalCaptchaToken,
  sealLocalCaptchaChallenge,
} from '@/lib/csirt/signalement-captcha'

export async function GET(req: Request) {
  if (!consumeRateLimit(clientRateKey(req, 'captcha'), 40, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Trop de demandes.' }, { status: 429 })
  }
  if (isGoogleRecaptchaConfigured()) {
    return NextResponse.json({
      provider: 'google',
      siteKey: getRecaptchaSiteKey(),
    })
  }

  const challenge = createLocalCaptchaChallenge()
  return NextResponse.json({
    provider: 'local',
    challengeId: challenge.id,
    seal: sealLocalCaptchaChallenge(challenge),
    expiresAt: challenge.expiresAt,
  })
}

export async function POST(req: Request) {
  if (!consumeRateLimit(clientRateKey(req, 'captcha'), 40, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Trop de demandes.' }, { status: 429 })
  }

  if (isGoogleRecaptchaConfigured()) {
    return NextResponse.json(
      { error: 'Utilisez le widget Google reCAPTCHA côté client.' },
      { status: 400 }
    )
  }

  let body: { seal?: string; dwellMs?: unknown; website?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  if (!body.seal) {
    return NextResponse.json({ error: 'Session de vérification manquante.' }, { status: 400 })
  }

  const dwellMs = typeof body.dwellMs === 'number' ? body.dwellMs : Number(body.dwellMs)
  const result = issueLocalCaptchaToken({
    challengeSeal: body.seal,
    dwellMs: Number.isFinite(dwellMs) ? dwellMs : undefined,
    website: body.website,
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ ok: true, token: result.token })
}
