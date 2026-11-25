import { CSIRT_BRAND } from '@/lib/csirt/brand'
import { resolveEmailLogoAttachment, resolveEmailLogoSrc } from '@/lib/csirt/email-brand-assets'
import {
  escapeHtml,
  getEmailPublicBaseUrl,
  renderActionButtons,
  renderBrandRibbon,
  renderEmailFooter,
  renderEmailShell,
  renderInfoPanel,
  renderMetaTable,
  renderSectionTitle,
  renderTimeline,
} from '@/lib/csirt/email-template-utils'
import { sendEmail } from '@/lib/services/email'
import { getPlatformSettings } from '@/lib/services/platform-settings'
import { smtpConfigReady } from '@/lib/services/smtp-mailer'
import { isMockDataEnabled } from '@/lib/mock/config'
import type { WelcomeEmailDelivery } from '@/lib/welcome-email-delivery'

export type { WelcomeEmailDelivery } from '@/lib/welcome-email-delivery'

function buildUserWelcomeEmailHtml(params: {
  fullName: string
  email: string
  roleLabel: string
  temporaryPassword: string
  orgName: string
  loginUrl: string
  logoSrc?: string | null
}): string {
  const passwordHtml = `
    <span style="display:inline-block;padding:6px 10px;border-radius:8px;background:#0f172a;color:#f8fafc;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:14px;font-weight:700;letter-spacing:0.04em;">
      ${escapeHtml(params.temporaryPassword)}
    </span>
  `

  const body = `
    ${renderBrandRibbon({
      eyebrow: `Accès console · ${CSIRT_BRAND.name}`,
      title: 'Bienvenue sur la plateforme',
      subtitle:
        'Votre compte opérationnel a été créé. Vous pouvez désormais accéder à la console interne CSIRT.',
      dark: true,
      logoSrc: params.logoSrc,
    })}

    <tr>
      <td style="padding:24px 30px 8px;">
        <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#0f172a;">
          Bonjour <strong>${escapeHtml(params.fullName || 'collègue')}</strong>,
        </p>
        <p style="margin:0;font-size:15px;line-height:1.7;color:#334155;">
          Nous vous confirmons l’ouverture de votre compte sur
          <strong>${escapeHtml(params.orgName)}</strong>
          (${escapeHtml(CSIRT_BRAND.name)} — ${escapeHtml(CSIRT_BRAND.parent)}).
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:16px 30px 0;">
        ${renderInfoPanel(
          `<strong>Compte actif.</strong> Conservez ces informations en lieu sûr et ne partagez jamais votre mot de passe. Changez-le après votre première connexion si possible.`,
          'success'
        )}
      </td>
    </tr>

    <tr>
      <td style="padding:18px 30px 0;">
        ${renderMetaTable([
          { label: 'Plateforme', value: params.orgName },
          { label: 'Identifiant', value: params.email },
          { label: 'Rôle', value: params.roleLabel },
          {
            label: 'Mot de passe',
            value: params.temporaryPassword,
            valueHtml: passwordHtml,
          },
        ])}
      </td>
    </tr>

    <tr>
      <td style="padding:14px 30px 0;">
        ${renderInfoPanel(
          `<strong>Connexion :</strong> utilisez l’identifiant <strong>${escapeHtml(params.email)}</strong> et le mot de passe ci-dessus.`,
          'alert'
        )}
      </td>
    </tr>

    <tr>
      <td style="padding:22px 30px 0;">
        ${renderSectionTitle('Premiers pas')}
        ${renderTimeline([
          {
            title: 'Connexion sécurisée',
            detail: 'Ouvrez la console via le bouton ci-dessous avec votre adresse e-mail et le mot de passe fourni.',
          },
          {
            title: 'Prise en main',
            detail: 'Accédez aux modules autorisés selon votre rôle (incidents, site, administration…).',
          },
          {
            title: 'Bonnes pratiques',
            detail: 'Verrouillez votre session, modifiez votre mot de passe et signalez tout accès suspect.',
          },
        ])}
      </td>
    </tr>

    <tr>
      <td style="padding:22px 30px 8px;">
        ${renderActionButtons([
          { label: 'Se connecter à la console', href: params.loginUrl, primary: true },
        ])}
        <p style="margin:12px 0 0;font-size:12px;line-height:1.5;color:#64748b;">
          Si le bouton ne s’affiche pas, copiez ce lien dans votre navigateur :<br/>
          <a href="${escapeHtml(params.loginUrl)}" style="color:#0d5c3d;word-break:break-all;">${escapeHtml(params.loginUrl)}</a>
        </p>
      </td>
    </tr>

    ${renderEmailFooter(
      `Notification d’accès transmise par ${escapeHtml(CSIRT_BRAND.name)} — ${escapeHtml(CSIRT_BRAND.parent)}. En cas de doute, contactez ${escapeHtml(CSIRT_BRAND.email)}.`
    )}
  `

  return renderEmailShell({
    title: `Bienvenue — ${CSIRT_BRAND.name}`,
    preheader: `Votre compte ${params.roleLabel} est prêt — identifiant et mot de passe inclus`,
    accentColor: '#0d5c3d',
    body,
  })
}

/**
 * Envoie (ou simule) l’email de bienvenue à la création d’un utilisateur.
 *
 * Envoi réel : USE_MOCK_DATA=false, NEXT_PUBLIC_USE_MOCK_DATA=false, redémarrage,
 * puis SMTP renseigné (Administration → Paramètres : hôte + expéditeur).
 */
export async function sendUserWelcomeEmail(input: {
  email: string
  firstName: string
  lastName: string
  roleLabel: string
  temporaryPassword: string
}): Promise<WelcomeEmailDelivery> {
  const settings = await getPlatformSettings()
  const org = settings.organizationName?.trim() || CSIRT_BRAND.name
  const fullName = `${input.firstName} ${input.lastName}`.trim()
  const loginUrl = `${getEmailPublicBaseUrl()}/login`

  const logoSrc = await resolveEmailLogoSrc()
  const logoAttachment = await resolveEmailLogoAttachment()
  const html = buildUserWelcomeEmailHtml({
    fullName,
    email: input.email,
    roleLabel: input.roleLabel,
    temporaryPassword: input.temporaryPassword,
    orgName: org,
    loginUrl,
    logoSrc,
  })

  const mail = {
    to: input.email,
    subject: `[${CSIRT_BRAND.name}] Bienvenue — accès console activé`,
    html,
    attachments: logoAttachment
      ? [
          {
            filename: logoAttachment.filename,
            content: logoAttachment.content,
            contentType: logoAttachment.contentType,
            cid: logoAttachment.cid,
            contentDisposition: 'inline' as const,
          },
        ]
      : undefined,
  }

  if (isMockDataEnabled()) {
    await sendEmail(mail)
    // eslint-disable-next-line no-console
    console.log(
      '[welcome-email:mock]',
      input.email,
      '— Aucun envoi réel (USE_MOCK_DATA / NEXT_PUBLIC_USE_MOCK_DATA).',
      'Pour des emails réels : USE_MOCK_DATA=false, redémarrer, configurer SMTP.'
    )
    return 'mock'
  }

  if (!smtpConfigReady(settings)) {
    if (process.env.NODE_ENV === 'development') {
      await sendEmail(mail)
      return 'simulated'
    }
    return 'no_smtp'
  }

  const sent = await sendEmail(mail)
  return sent ? 'sent' : 'failed'
}
