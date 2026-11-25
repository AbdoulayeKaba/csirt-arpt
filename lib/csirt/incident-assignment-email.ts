import { CSIRT_BRAND } from '@/lib/csirt/brand'
import { resolveEmailLogoAttachment, resolveEmailLogoSrc } from '@/lib/csirt/email-brand-assets'
import {
  escapeHtml,
  formatFrenchDateTime,
  getEmailPublicBaseUrl,
  renderActionButtons,
  renderBrandRibbon,
  renderEmailFooter,
  renderEmailShell,
  renderInfoPanel,
  renderMetaTable,
  renderReferenceHero,
  renderSeverityBadge,
} from '@/lib/csirt/email-template-utils'
import {
  getIncidentSeverityMeta,
  getIncidentStatusMeta,
  getIncidentTlpMeta,
  type CsirtIncident,
} from '@/lib/types/incident'
import { sendEmail } from '@/lib/services/email'

export function parseAssigneeEmails(raw?: string | null): string[] {
  if (!raw?.trim()) return []
  const seen = new Set<string>()
  const emails: string[] = []
  for (const part of raw.split(/[,;]+/)) {
    const email = part.trim().toLowerCase()
    if (!email || !email.includes('@') || seen.has(email)) continue
    seen.add(email)
    emails.push(email)
  }
  return emails
}

function buildAssignmentEmailHtml(params: {
  incident: CsirtIncident
  assigneeName: string
  actorName: string
  logoSrc?: string | null
}): string {
  const { incident, assigneeName, actorName, logoSrc } = params
  const severityMeta = getIncidentSeverityMeta(incident.severity)
  const statusMeta = getIncidentStatusMeta(incident.status)
  const tlpMeta = getIncidentTlpMeta(incident.tlp)
  const consoleUrl = `${getEmailPublicBaseUrl()}/dg/incidents?open=${encodeURIComponent(incident.id)}`
  const descriptionHtml = escapeHtml(incident.description || 'Aucune description fournie.')
    // Empêche Outlook / Gmail de transformer les e-mails en faux « liens » cliquables.
    .replaceAll('@', '&#8203;@')
    .replaceAll('\n', '<br/>')

  const body = `
    ${renderBrandRibbon({
      eyebrow: `Assignation opérationnelle · ${CSIRT_BRAND.name}`,
      title: 'Incident qui vous est assigné',
      subtitle:
        'Vous avez été désigné(e) comme analyste / responsable sur un incident CSIRT. Merci de prendre en charge le dossier dans la console.',
      badgeHtml: renderSeverityBadge(severityMeta.label, severityMeta.color),
      dark: true,
      logoSrc,
    })}

    <tr>
      <td style="padding:24px 30px 10px;">
        ${renderReferenceHero(
          incident.reference,
          formatFrenchDateTime(incident.createdAt),
          statusMeta.label
        )}
      </td>
    </tr>

    <tr>
      <td style="padding:8px 30px 0;">
        ${renderInfoPanel(
          `<strong>Bonjour ${escapeHtml(assigneeName || 'analyste')},</strong><br/>
          ${escapeHtml(actorName)} vous a assigné l’incident <strong>${escapeHtml(incident.reference)}</strong>.`,
          'success'
        )}
      </td>
    </tr>

    <tr>
      <td style="padding:18px 30px 0;">
        ${renderActionButtons([
          { label: 'Accéder à la plateforme', href: consoleUrl, primary: true },
        ])}
        <p style="margin:10px 0 0;font-size:12px;line-height:1.5;color:#64748b;">
          Cliquez sur le bouton ci-dessus pour ouvrir le dossier dans la console CSIRT.
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:18px 30px 0;">
        ${renderMetaTable([
          { label: 'Référence', value: incident.reference },
          { label: 'Statut', value: statusMeta.label },
          { label: 'Gravité', value: severityMeta.label },
          { label: 'TLP', value: tlpMeta.label },
          {
            label: 'Déclarant',
            value:
              incident.identify === 'yes'
                ? incident.fullName || incident.organization || '—'
                : 'Signalement anonyme',
          },
          { label: 'Organisation', value: incident.organization || '—' },
          {
            label: 'Nature',
            value: incident.typeLabels?.length ? incident.typeLabels.join(', ') : '—',
          },
          {
            label: 'Analystes assignés',
            value: incident.assignedTo?.name || '—',
          },
        ])}
      </td>
    </tr>

    <tr>
      <td style="padding:18px 30px 0;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#64748b;">
          Description du signalement
        </p>
        <div style="margin:0;padding:14px 16px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;color:#1e293b;font-size:14px;line-height:1.55;word-break:break-word;">
          ${descriptionHtml}
        </div>
        <p style="margin:8px 0 0;font-size:11px;color:#94a3b8;">
          Texte informatif uniquement — pour accéder à la plateforme, utilisez le bouton vert.
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:22px 30px 8px;">
        ${renderActionButtons([
          { label: 'Ouvrir le dossier dans la console', href: consoleUrl, primary: true },
        ])}
      </td>
    </tr>

    ${renderEmailFooter(
      `Notification d’assignation transmise par ${escapeHtml(CSIRT_BRAND.name)} — ${escapeHtml(CSIRT_BRAND.parent)}.`
    )}
  `

  return renderEmailShell({
    title: `Assignation ${incident.reference}`,
    preheader: `${incident.reference} — ${severityMeta.label} — prise en charge requise`,
    accentColor: severityMeta.color,
    body,
  })
}

/** Notifie les analystes nouvellement assignés (évite le spam si déjà notifiés). */
export async function notifyIncidentAssignees(params: {
  previousEmails: string[]
  incident: CsirtIncident
  actorName: string
}): Promise<{ sent: string[]; failed: string[] }> {
  const nextEmails = parseAssigneeEmails(params.incident.assignedTo?.email)
  const previous = new Set(params.previousEmails.map((e) => e.trim().toLowerCase()).filter(Boolean))
  const recipients = nextEmails.filter((email) => !previous.has(email))

  if (recipients.length === 0) {
    return { sent: [], failed: [] }
  }

  const names = (params.incident.assignedTo?.name || '')
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter(Boolean)

  const nameByEmail = new Map<string, string>()
  nextEmails.forEach((email, index) => {
    nameByEmail.set(email, names[index] || names[0] || email)
  })

  const logoSrc = await resolveEmailLogoSrc()
  const logoAttachment = await resolveEmailLogoAttachment()
  const attachments = logoAttachment
    ? [
        {
          filename: logoAttachment.filename,
          content: logoAttachment.content,
          contentType: logoAttachment.contentType,
          cid: logoAttachment.cid,
          contentDisposition: 'inline' as const,
        },
      ]
    : undefined

  const sent: string[] = []
  const failed: string[] = []

  for (const to of recipients) {
    const assigneeName = nameByEmail.get(to) || to
    const html = buildAssignmentEmailHtml({
      incident: params.incident,
      assigneeName,
      actorName: params.actorName,
      logoSrc,
    })

    const ok = await sendEmail({
      to,
      subject: `[CSIRT-ARPT] Assignation incident ${params.incident.reference}`,
      html,
      attachments,
    })
    if (ok) sent.push(to)
    else failed.push(to)
  }

  return { sent, failed }
}
