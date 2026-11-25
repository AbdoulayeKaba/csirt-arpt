import { CSIRT_BRAND } from '@/lib/csirt/brand';
import { resolveEmailLogoAttachment, resolveEmailLogoSrc } from '@/lib/csirt/email-brand-assets';
import {
  escapeHtml,
  formatFrenchDateTime,
  getEmailPublicBaseUrl,
  renderActionButtons,
  renderBrandRibbon,
  renderEmailFooter,
  renderEmailShell,
  renderInfoPanel,
  renderReferenceHero,
  renderSectionTitle,
  renderTimeline,
} from '@/lib/csirt/email-template-utils';
import { sendEmail } from '@/lib/services/email';

export function buildSignalementAckEmailHtml(params: {
  reference: string;
  recipientName?: string;
  createdAt?: string;
  logoSrc?: string | null;
}): string {
  const greeting = params.recipientName?.trim()
    ? `Bonjour ${escapeHtml(params.recipientName.trim())},`
    : 'Bonjour,';
  const suiviUrl = `${getEmailPublicBaseUrl()}/signalement/suivi`;
  const reference = params.reference;
  const receivedAt = formatFrenchDateTime(params.createdAt);

  const body = `
    ${renderBrandRibbon({
      eyebrow: CSIRT_BRAND.name,
      title: 'Merci pour votre signalement',
      subtitle:
        'Votre déclaration a bien été reçue et transmise à notre équipe d’intervention cyber.',
      logoSrc: params.logoSrc,
    })}

    <tr>
      <td style="padding:26px 30px 8px;">
        <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#0f172a;">${greeting}</p>
        <p style="margin:0;font-size:15px;line-height:1.7;color:#334155;">
          Nous vous remercions d’avoir contribué à la sécurisation du numérique en signalant un incident
          auprès du <strong>${escapeHtml(CSIRT_BRAND.fullName)}</strong> (${escapeHtml(CSIRT_BRAND.parent)}).
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:10px 30px 0;">
        ${renderReferenceHero(reference, receivedAt, 'Reçu')}
      </td>
    </tr>

    <tr>
      <td style="padding:20px 30px 0;">
        ${renderInfoPanel(
          `<strong>Prochaine étape :</strong> notre équipe analyse votre déclaration. Vous serez recontacté(e) <strong>dans les plus brefs délais</strong> si des précisions complémentaires sont nécessaires ou pour vous informer de l’avancement.`,
          'success'
        )}
      </td>
    </tr>

    <tr>
      <td style="padding:22px 30px 0;">
        ${renderSectionTitle('Ce qui va se passer ensuite')}
        ${renderTimeline([
          {
            title: 'Accusé de réception',
            detail: 'Votre signalement est enregistré avec la référence ci-dessus.',
          },
          {
            title: 'Analyse & qualification',
            detail: 'Les analystes CSIRT-ARPT examinent la nature, la gravité et le périmètre de l’incident.',
          },
          {
            title: 'Prise de contact si besoin',
            detail: 'Nous vous écrirons ou vous appellerons uniquement si des informations complémentaires sont utiles.',
          },
          {
            title: 'Suivi de traitement',
            detail: 'Conservez votre référence pour toute communication ultérieure avec le CSIRT-ARPT.',
          },
        ])}
      </td>
    </tr>

    <tr>
      <td style="padding:22px 30px 8px;">
        ${renderActionButtons([
          { label: 'Suivre mon signalement', href: suiviUrl, primary: true },
          { label: 'Nous contacter', href: CSIRT_BRAND.mailto },
        ])}
        <p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:#64748b;">
          En cas d’urgence opérationnelle, contactez directement
          <a href="${CSIRT_BRAND.mailto}" style="color:#166534;font-weight:700;text-decoration:none;">${escapeHtml(CSIRT_BRAND.email)}</a>.
          ${escapeHtml(CSIRT_BRAND.hours)}.
        </p>
      </td>
    </tr>

    ${renderEmailFooter(
      'Ce message confirme la bonne réception de votre signalement. Merci de ne pas répondre automatiquement à cette notification si ce n’est pas nécessaire.'
    )}
  `;

  return renderEmailShell({
    title: `Confirmation ${reference}`,
    preheader: `Votre signalement ${reference} a bien été reçu par le CSIRT-ARPT.`,
    accentColor: '#166534',
    body,
  });
}

export async function sendSignalementAckEmail(params: {
  email: string;
  reference: string;
  fullName?: string;
  createdAt?: string;
}): Promise<void> {
  const logoSrc = await resolveEmailLogoSrc();
  const logoAttachment = await resolveEmailLogoAttachment();
  const html = buildSignalementAckEmailHtml({
    reference: params.reference,
    recipientName: params.fullName,
    createdAt: params.createdAt,
    logoSrc,
  });

  await sendEmail({
    to: params.email,
    subject: `[CSIRT-ARPT] Confirmation de réception — ${params.reference}`,
    html,
    attachments: logoAttachment
      ? [
          {
            filename: logoAttachment.filename,
            content: logoAttachment.content,
            contentType: logoAttachment.contentType,
            cid: logoAttachment.cid,
            contentDisposition: 'inline',
          },
        ]
      : undefined,
  });
}
