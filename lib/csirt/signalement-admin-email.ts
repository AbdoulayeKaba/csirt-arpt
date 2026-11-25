import { CSIRT_BRAND } from '@/lib/csirt/brand';
import { resolveEmailLogoAttachment, resolveEmailLogoSrc } from '@/lib/csirt/email-brand-assets';
import {
  escapeHtml,
  formatFrenchDateTime,
  formatMultilineHtml,
  getEmailPublicBaseUrl,
  renderActionButtons,
  renderEmailFooter,
  renderEmailShell,
  renderBrandRibbon,
  renderInfoPanel,
  renderKpiGrid,
  renderMetaTable,
  renderReferenceHero,
  renderSectionTitle,
  renderSeverityBadge,
  renderTagList,
  renderTimeline,
} from '@/lib/csirt/email-template-utils';
import { getIncidentSeverityMeta } from '@/lib/types/incident';
import { sendEmail } from '@/lib/services/email';

export type SignalementAdminEmailParams = {
  reference: string;
  severity: string;
  identify: 'yes' | 'no';
  declarantTypeName: string;
  organization: string;
  email: string;
  typeLabels: string[];
  target: string;
  fileNames: string[];
  description: string;
  measures: string;
  createdAt?: string;
};

function getSlaHint(severity: string): string {
  const key = severity.toUpperCase();
  if (key === 'CRITIQUE') {
    return 'Qualification immédiate recommandée — incident critique (P1).';
  }
  if (key === 'ELEVE') {
    return 'Qualification prioritaire recommandée sous 4 heures (P2).';
  }
  if (key === 'MOYEN') {
    return 'Qualification standard recommandée sous 24 heures (P3).';
  }
  return 'Qualification selon la procédure habituelle (P4).';
}

export function buildSignalementAdminEmailHtml(
  params: SignalementAdminEmailParams & { logoSrc?: string | null }
): string {
  const severityMeta = getIncidentSeverityMeta(params.severity);
  const reference = params.reference;
  const receivedAt = formatFrenchDateTime(params.createdAt);
  const consoleUrl = `${getEmailPublicBaseUrl()}/dg/incidents`;
  const identityLabel = params.identify === 'yes' ? 'Identité communiquée' : 'Signalement anonyme';
  const mailtoDeclarant = params.email ? `mailto:${encodeURIComponent(params.email)}` : CSIRT_BRAND.mailto;

  const body = `
    ${renderBrandRibbon({
      eyebrow: `Alerte opérationnelle · ${CSIRT_BRAND.name}`,
      title: 'Nouveau signalement d’incident',
      subtitle:
        'Un incident cyber vient d’être déclaré via le portail public. Analyse, qualification et assignation requises.',
      badgeHtml: renderSeverityBadge(severityMeta.label, severityMeta.color),
      dark: true,
      logoSrc: params.logoSrc,
    })}

    <tr>
      <td style="padding:24px 30px 10px;">
        ${renderReferenceHero(reference, receivedAt, 'Nouveau')}
      </td>
    </tr>

    <tr>
      <td style="padding:8px 30px 0;">
        ${renderKpiGrid([
          { label: 'Gravité', value: severityMeta.label, tone: severityMeta.color },
          { label: 'Profil déclarant', value: identityLabel, tone: '#14532d' },
          {
            label: 'Pièces jointes',
            value: params.fileNames.length > 0 ? `${params.fileNames.length} fichier(s)` : 'Aucune',
            tone: '#334155',
          },
        ])}
      </td>
    </tr>

    <tr>
      <td style="padding:18px 30px 0;">
        ${renderInfoPanel(
          `<strong>Consigne opérationnelle :</strong> ${escapeHtml(getSlaHint(params.severity))}`,
          'success'
        )}
      </td>
    </tr>

    <tr>
      <td style="padding:22px 30px 0;">
        ${renderSectionTitle('Synthèse du déclarant', 'Informations transmises via le formulaire public')}
        ${renderMetaTable([
          { label: 'Type de déclarant', value: params.declarantTypeName || '—' },
          { label: 'Organisation', value: params.organization || 'Non renseignée' },
          {
            label: 'E-mail de contact',
            value: params.email || '—',
            valueHtml: params.email
              ? `<a href="mailto:${escapeHtml(params.email)}" style="color:#166534;text-decoration:none;font-weight:700;">${escapeHtml(params.email)}</a>`
              : undefined,
          },
          {
            label: 'Nature(s) signalée(s)',
            value: '',
            valueHtml: renderTagList(params.typeLabels, 'Non précisée'),
          },
          { label: 'Cible / URL / IP', value: params.target || '—' },
          {
            label: 'Pièces jointes',
            value: '',
            valueHtml: renderTagList(params.fileNames, 'Aucune pièce jointe'),
          },
        ])}
      </td>
    </tr>

    <tr>
      <td style="padding:22px 30px 0;">
        ${renderSectionTitle('Description de l’incident')}
        ${renderInfoPanel(formatMultilineHtml(params.description || '—'), 'alert')}
      </td>
    </tr>

    <tr>
      <td style="padding:18px 30px 0;">
        ${renderSectionTitle('Mesures déjà entreprises')}
        ${renderInfoPanel(
          formatMultilineHtml(params.measures || 'Aucune mesure renseignée par le déclarant.'),
          'neutral'
        )}
      </td>
    </tr>

    <tr>
      <td style="padding:22px 30px 0;">
        ${renderSectionTitle('Actions recommandées', 'Checklist rapide pour l’analyste de garde')}
        ${renderTimeline([
          {
            title: 'Qualifier l’incident',
            detail: 'Vérifier la cohérence des informations, la gravité et le périmètre impacté.',
          },
          {
            title: 'Assigner un analyste',
            detail: 'Désigner un référent CSIRT et ouvrir le suivi dans la console incidents.',
          },
          {
            title: 'Contacter le déclarant si nécessaire',
            detail: 'Demander des éléments complémentaires (logs, horodatage, preuves techniques).',
          },
          {
            title: 'Documenter les actions',
            detail: 'Tracer toutes les décisions et mises à jour dans le dossier incident.',
          },
        ])}
      </td>
    </tr>

    <tr>
      <td style="padding:26px 30px 8px;">
        ${renderActionButtons([
          { label: 'Ouvrir la console incidents', href: consoleUrl, primary: true },
          { label: 'Répondre au déclarant', href: mailtoDeclarant },
        ])}
        <p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:#64748b;">
          Ce message est généré automatiquement par le portail de signalement CSIRT-ARPT.
          <strong>TLP:AMBER</strong> — diffusion limitée à l’équipe CSIRT et aux parties prenantes autorisées.
        </p>
      </td>
    </tr>

    ${renderEmailFooter(
      `Notification interne transmise à <strong>${escapeHtml(CSIRT_BRAND.email)}</strong> pour traitement opérationnel.`
    )}
  `;

  return renderEmailShell({
    title: `Nouveau signalement ${reference}`,
    preheader: `${reference} — ${severityMeta.label} — ${params.organization || 'Organisation non renseignée'}`,
    accentColor: severityMeta.color,
    body,
  });
}

export async function sendSignalementAdminEmail(params: SignalementAdminEmailParams): Promise<void> {
  const severityMeta = getIncidentSeverityMeta(params.severity);
  const logoSrc = await resolveEmailLogoSrc();
  const logoAttachment = await resolveEmailLogoAttachment();
  const html = buildSignalementAdminEmailHtml({ ...params, logoSrc });

  await sendEmail({
    to: CSIRT_BRAND.email,
    subject: `[CSIRT-ARPT] [${severityMeta.label}] Nouveau signalement ${params.reference}`,
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
