import { CSIRT_BRAND } from '@/lib/csirt/brand';
import {
  escapeHtml,
  formatFrenchDateTime,
  getPublicBaseUrl,
  renderActionButtons,
  renderBrandRibbon,
  renderEmailFooter,
  renderEmailShell,
  renderInfoNotice,
  renderMetaTable,
} from '@/lib/csirt/email-template-utils';
import { sendEmail } from '@/lib/services/email';

export async function sendOrganizationDeactivationRequestEmail(params: {
  to: string;
  organizationName: string;
  requestedByName: string;
  requestedAt: Date;
  expiresAt: Date;
}): Promise<boolean> {
  const reviewUrl = `${getPublicBaseUrl()}/dg/admin/referentiels`;
  const body = `
    ${renderBrandRibbon({
      eyebrow: `Organisation · ${CSIRT_BRAND.name}`,
      title: 'Demande de désactivation',
      subtitle: `${params.requestedByName} demande la désactivation de ${params.organizationName}.`,
      dark: true,
    })}

    <tr>
      <td style="padding:24px 30px 8px;">
        <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#0f172a;">Bonjour,</p>
        <p style="margin:0;font-size:15px;line-height:1.7;color:#334155;">
          Une demande de désactivation a été initiée pour l’organisation
          <strong>${escapeHtml(params.organizationName)}</strong>.
          Elle reste en attente <strong>3 jours</strong>. Sans votre autorisation, l’organisation reste active.
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:16px 30px 0;">
        ${renderMetaTable([
          { label: 'Organisation', value: params.organizationName },
          { label: 'Initiée par', value: params.requestedByName },
          { label: 'Date de la demande', value: formatFrenchDateTime(params.requestedAt.toISOString()) },
          { label: 'En attente jusqu’au', value: formatFrenchDateTime(params.expiresAt.toISOString()) },
        ])}
      </td>
    </tr>

    <tr>
      <td style="padding:18px 30px 0;">
        ${renderInfoNotice(
          'Si vous autorisez la demande, l’organisation est désactivée immédiatement. Une trace conserve l’initiateur et la date.',
          'alert'
        )}
      </td>
    </tr>

    <tr>
      <td style="padding:22px 30px 8px;">
        ${renderActionButtons([{ label: 'Examiner la demande', href: reviewUrl, primary: true }])}
      </td>
    </tr>

    ${renderEmailFooter(`Notification transmise par ${CSIRT_BRAND.name}.`)}
  `;

  const html = renderEmailShell({
    title: `Désactivation — ${params.organizationName}`,
    preheader: `Demande de désactivation de ${params.organizationName}, en attente 3 jours`,
    accentColor: '#0d5c3d',
    body,
  });

  return sendEmail({
    to: params.to,
    subject: `[${CSIRT_BRAND.name}] Demande de désactivation — ${params.organizationName}`,
    html,
  });
}

export async function sendCorrespondentDeactivationRequestEmail(params: {
  to: string;
  correspondentName: string;
  correspondentEmail: string;
  organizationName: string;
  requestedByName: string;
  requestedAt: Date;
  expiresAt: Date;
}): Promise<boolean> {
  const reviewUrl = `${getPublicBaseUrl()}/dg/admin/referentiels`;
  const identity = `${params.correspondentName} (${params.correspondentEmail})`;
  const body = `
    ${renderBrandRibbon({
      eyebrow: `Correspondant · ${CSIRT_BRAND.name}`,
      title: 'Demande de désactivation',
      subtitle: `${params.requestedByName} demande la désactivation du correspondant ${params.correspondentEmail}.`,
      dark: true,
    })}

    <tr>
      <td style="padding:24px 30px 8px;">
        <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#0f172a;">Bonjour,</p>
        <p style="margin:0;font-size:15px;line-height:1.7;color:#334155;">
          Une demande de désactivation a été initiée pour le correspondant
          <strong>${escapeHtml(params.correspondentEmail)}</strong>.
          Le compte reste en attente <strong>3 jours</strong>. Sans votre autorisation, le correspondant reste actif.
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:16px 30px 0;">
        ${renderMetaTable([
          { label: 'Correspondant', value: identity },
          { label: 'Organisation', value: params.organizationName },
          { label: 'Initiée par', value: params.requestedByName },
          { label: 'Date de la demande', value: formatFrenchDateTime(params.requestedAt.toISOString()) },
          { label: 'En attente jusqu’au', value: formatFrenchDateTime(params.expiresAt.toISOString()) },
        ])}
      </td>
    </tr>

    <tr>
      <td style="padding:18px 30px 0;">
        ${renderInfoNotice(
          'Si vous autorisez la demande, le compte est désactivé immédiatement. Une trace conserve l’initiateur et la date.',
          'alert'
        )}
      </td>
    </tr>

    <tr>
      <td style="padding:22px 30px 8px;">
        ${renderActionButtons([{ label: 'Examiner la demande', href: reviewUrl, primary: true }])}
      </td>
    </tr>

    ${renderEmailFooter(`Notification transmise par ${CSIRT_BRAND.name}.`)}
  `;

  const html = renderEmailShell({
    title: `Désactivation — ${params.correspondentEmail}`,
    preheader: `Demande de désactivation de ${params.correspondentEmail}, en attente 3 jours`,
    accentColor: '#0d5c3d',
    body,
  });

  return sendEmail({
    to: params.to,
    subject: `[${CSIRT_BRAND.name}] Demande de désactivation — ${params.correspondentEmail}`,
    html,
  });
}
