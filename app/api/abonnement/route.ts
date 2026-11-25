import { NextResponse } from 'next/server'
import { clientRateKey, consumeRateLimit } from '@/lib/auth/login-rate-limit'
import { CSIRT_BRAND } from '@/lib/csirt/brand'
import {
  addNewsletterSubscriber,
  findNewsletterSubscriberByEmail,
} from '@/lib/admin/newsletter-subscribers'
import { sendEmail } from '@/lib/services/email'

type Payload = {
  email?: string
  fullName?: string
  consent?: boolean
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function asText(value: unknown, max = 200) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, max)
}

export async function POST(req: Request) {
  if (!consumeRateLimit(clientRateKey(req, 'newsletter'), 20, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: 'Trop de demandes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': '3600' } }
    )
  }

  let body: Payload
  try {
    body = (await req.json()) as Payload
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  const email = asText(body.email, 180).toLowerCase()
  const fullName = asText(body.fullName, 120)

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Adresse e-mail invalide.' }, { status: 400 })
  }
  if (!fullName || fullName.length < 2) {
    return NextResponse.json({ error: 'Le nom est obligatoire.' }, { status: 400 })
  }
  if (!body.consent) {
    return NextResponse.json(
      { error: 'Vous devez accepter de recevoir les alertes officielles.' },
      { status: 400 },
    )
  }

  const alreadySubscribed = await findNewsletterSubscriberByEmail(email)
  if (alreadySubscribed) {
    return NextResponse.json(
      {
        error: 'Cette adresse e-mail est déjà inscrite. Vous recevez déjà les alertes CSIRT-ARPT.',
        code: 'EMAIL_ALREADY_SUBSCRIBED',
      },
      { status: 409 },
    )
  }

  const stamp = new Date()
  const reference = `NL-${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, '0')}${String(stamp.getDate()).padStart(2, '0')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

  const result = await addNewsletterSubscriber({ email, fullName, reference })
  if (!result.created) {
    return NextResponse.json(
      {
        error: 'Cette adresse e-mail est déjà inscrite. Vous recevez déjà les alertes CSIRT-ARPT.',
        code: 'EMAIL_ALREADY_SUBSCRIBED',
      },
      { status: 409 },
    )
  }

  const html = `
    <h2>Nouvel abonnement newsletter ${escapeHtml(reference)}</h2>
    <p><strong>Nom :</strong> ${escapeHtml(fullName)}</p>
    <p><strong>E-mail :</strong> ${escapeHtml(email)}</p>
    <p><strong>Consentement :</strong> Oui</p>
  `

  await sendEmail({
    to: CSIRT_BRAND.email,
    subject: `[CSIRT-ARPT] Abonnement alertes ${reference}`,
    html,
  })

  return NextResponse.json({ ok: true, reference })
}

export async function GET(req: Request) {
  const email = asText(new URL(req.url).searchParams.get('email') ?? '', 180).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ exists: false, valid: false })
  }

  const existing = await findNewsletterSubscriberByEmail(email)
  return NextResponse.json({ exists: Boolean(existing), valid: true })
}
