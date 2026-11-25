import { NextResponse } from 'next/server'
import { clientRateKey, consumeRateLimit } from '@/lib/auth/login-rate-limit'
import { CSIRT_BRAND } from '@/lib/csirt/brand'
import { addContactMessage } from '@/lib/admin/contact-messages'
import { getPlatformSettings } from '@/lib/services/platform-settings'
import { sendEmail } from '@/lib/services/email'

type Payload = {
  fullName?: string
  email?: string
  organization?: string
  phone?: string
  role?: string
  subject?: string
  body?: string
  attachmentNames?: string
  website?: string
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function asText(value: unknown, max: number) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, max)
}

export async function POST(req: Request) {
  let body: Payload
  try {
    body = (await req.json()) as Payload
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  if (!consumeRateLimit(clientRateKey(req, 'contact'), 15, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: 'Trop de messages. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': '3600' } }
    )
  }

  // Honeypot anti-bot
  if (asText(body.website, 200)) {
    return NextResponse.json({ ok: true })
  }

  const fullName = asText(body.fullName, 120)
  const email = asText(body.email, 180).toLowerCase()
  const organization = asText(body.organization, 200)
  const phone = asText(body.phone, 40)
  const role = asText(body.role, 120)
  const attachmentNames = asText(body.attachmentNames, 500)
  const subject = asText(body.subject, 200)
  const message = asText(body.body, 5000)

  if (!fullName || fullName.length < 2) {
    return NextResponse.json({ error: 'Le nom est obligatoire.' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Adresse e-mail invalide.' }, { status: 400 })
  }
  if (!subject || subject.length < 3) {
    return NextResponse.json({ error: 'L’objet est obligatoire.' }, { status: 400 })
  }
  if (!message || message.length < 10) {
    return NextResponse.json(
      { error: 'Le message doit contenir au moins 10 caractères.' },
      { status: 400 }
    )
  }

  const details = [
    phone ? `Téléphone : ${phone}` : '',
    role ? `Fonction : ${role}` : '',
    attachmentNames ? `Pièces jointes indiquées : ${attachmentNames}` : '',
  ].filter(Boolean)
  const storedBody = details.length ? `${details.join('\n')}\n\n${message}` : message

  const saved = await addContactMessage({
    fullName,
    email,
    organization,
    subject,
    body: storedBody,
  })

  const settings = await getPlatformSettings()
  const notifyTo =
    settings.institutionOfficialEmail?.trim() || CSIRT_BRAND.email

  void sendEmail({
    to: notifyTo,
    subject: `[Contact] ${subject}`,
    html: `
      <h2>Nouveau message de contact</h2>
      <p><strong>Nom :</strong> ${escapeHtml(fullName)}</p>
      <p><strong>E-mail :</strong> ${escapeHtml(email)}</p>
      ${organization ? `<p><strong>Organisation :</strong> ${escapeHtml(organization)}</p>` : ''}
      ${phone ? `<p><strong>Téléphone :</strong> ${escapeHtml(phone)}</p>` : ''}
      ${role ? `<p><strong>Fonction :</strong> ${escapeHtml(role)}</p>` : ''}
      <p><strong>Objet :</strong> ${escapeHtml(subject)}</p>
      <p><strong>Message :</strong></p>
      <pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(storedBody)}</pre>
      <p style="color:#64756c;font-size:12px">Réf. ${escapeHtml(saved.id)}</p>
    `,
  }).catch(() => undefined)

  return NextResponse.json({ ok: true, id: saved.id })
}
