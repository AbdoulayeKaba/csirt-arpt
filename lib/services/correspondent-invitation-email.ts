import { CSIRT_BRAND } from '@/lib/csirt/brand';
import {
  escapeHtml,
  getPublicBaseUrl,
  renderActionButtons,
  renderBrandRibbon,
  renderEmailFooter,
  renderEmailShell,
  renderInfoNotice,
  renderMetaTable,
} from '@/lib/csirt/email-template-utils';
import { sendEmail } from '@/lib/services/email';
import { getPlatformSettings } from '@/lib/services/platform-settings';
import { smtpConfigReady } from '@/lib/services/smtp-mailer';
import { isMockDataEnabled } from '@/lib/mock/config';

function formatExpiry(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Africa/Conakry',
  }).format(date);
}

/**
 * E-mail d’invitation correspondant.
 * Contenu minimal : organisation, lien d’activation, durée de validité.
 * Le token n’apparaît que dans l’URL du lien (jamais loggé ici).
 */
export async function sendCorrespondentInvitationEmail(params: {
  to: string;
  organizationName: string;
  activationToken: string;
  expiresAt: Date;
  expiryHours: number;
}): Promise<{ ok: boolean }> {
  const activationUrl = `${getPublicBaseUrl()}/signalement?invitation=${encodeURIComponent(params.activationToken)}`;
  const settings = await getPlatformSettings();

  const body = `
    ${renderBrandRibbon({
      eyebrow: `Invitation · ${CSIRT_BRAND.name}`,
      title: 'Activation de votre compte correspondant',
      subtitle: `Un accès correspondant vous a été attribué pour ${params.organizationName}.`,
      dark: true,
    })}

    <tr>
      <td style="padding:24px 30px 8px;">
        <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#0f172a;">
          Bonjour,
        </p>
        <p style="margin:0;font-size:15px;line-height:1.7;color:#334155;">
          L’équipe ${escapeHtml(CSIRT_BRAND.name)} vous invite à activer votre compte
          <strong>Correspondant</strong> pour l’organisation
          <strong>${escapeHtml(params.organizationName)}</strong>.
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:16px 30px 0;">
        ${renderMetaTable([
          { label: 'Organisation', value: params.organizationName },
          { label: 'Validité du lien', value: `${params.expiryHours} heures` },
          { label: 'Expire le', value: formatExpiry(params.expiresAt) },
        ])}
      </td>
    </tr>

    <tr>
      <td style="padding:18px 30px 0;">
        ${renderInfoNotice(
          '<strong>Sécurité :</strong> ce lien est personnel. Ne le partagez pas. Après activation, connectez-vous avec votre adresse e-mail et le mot de passe que vous aurez défini.',
          'alert'
        )}
      </td>
    </tr>

    <tr>
      <td style="padding:22px 30px 8px;">
        ${renderActionButtons([
          { label: 'Activer mon compte', href: activationUrl, primary: true },
        ])}
      </td>
    </tr>

    ${renderEmailFooter(
      `Invitation transmise par ${CSIRT_BRAND.name}. En cas de doute, contactez ${CSIRT_BRAND.email}.`
    )}
  `;

  const html = renderEmailShell({
    title: `Invitation correspondant — ${CSIRT_BRAND.name}`,
    preheader: `Activez votre compte correspondant pour ${params.organizationName}`,
    accentColor: '#0d5c3d',
    body,
  });
  const sent = await sendEmail({
    to: params.to,
    subject: `[${CSIRT_BRAND.name}] Activation de votre compte correspondant`,
    html,
  });

  if (!sent && (isMockDataEnabled() || process.env.NODE_ENV === 'development') && !smtpConfigReady(settings)) {
    return { ok: true };
  }

  return { ok: sent };
}
