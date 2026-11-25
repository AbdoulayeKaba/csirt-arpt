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
import { parseAssigneeEmails } from '@/lib/csirt/incident-assignment-email'
import {
  getIncidentSeverityMeta,
  getIncidentStatusMeta,
  getIncidentTlpMeta,
  type CsirtIncident,
  type IncidentStatus,
} from '@/lib/types/incident'
import { sendEmail } from '@/lib/services/email'

type StatusRecipientRole = 'analyst' | 'requester'

function buildStatusChangeEmailHtml(params: {
  incident: CsirtIncident
  previousStatus: IncidentStatus
  recipientName: string
  role: StatusRecipientRole
  actorName: string
  logoSrc?: string | null
}): string {
  const { incident, previousStatus, recipientName, role, actorName, logoSrc } = params
  const severityMeta = getIncidentSeverityMeta(incident.severity)
  const previousMeta = getIncidentStatusMeta(previousStatus)
  const statusMeta = getIncidentStatusMeta(incident.status)
  const tlpMeta = getIncidentTlpMeta(incident.tlp)
  const consoleUrl = `${getEmailPublicBaseUrl()}/dg/incidents?open=${encodeURIComponent(incident.id)}`
  const publicUrl = `${getEmailPublicBaseUrl()}/signalement`

  const isAnalyst = role === 'analyst'
  const greetingName = escapeHtml(recipientName || (isAnalyst ? 'analyste' : 'Madame, Monsieur'))
  const subtitle = isAnalyst
    ? 'Le statut de traitement d’un incident qui vous est assigné a été mis à jour.'
    : 'Le statut de votre signalement a été mis à jour par le CSIRT-ARPT.'

  const notice = isAnalyst
    ? `<strong>Bonjour ${greetingName},</strong><br/>
      ${escapeHtml(actorName)} a modifié le statut de l’incident
      <strong>${escapeHtml(incident.reference)}</strong>
      : <strong>${escapeHtml(previousMeta.label)}</strong> → <strong>${escapeHtml(statusMeta.label)}</strong>.`
    : `<strong>Bonjour ${greetingName},</strong><br/>
      Votre signalement <strong>${escapeHtml(incident.reference)}</strong> a changé de statut
      : <strong>${escapeHtml(previousMeta.label)}</strong> → <strong>${escapeHtml(statusMeta.label)}</strong>.
      ${statusMeta.desc ? `<br/><span style="color:#64748b;">${escapeHtml(statusMeta.desc)}</span>` : ''}`

  const actions = isAnalyst
    ? renderActionButtons([{ label: 'Accéder à la plateforme', href: consoleUrl, primary: true }])
    : renderActionButtons([{ label: 'Site CSIRT-ARPT', href: getEmailPublicBaseUrl(), primary: true }])

  const resolutionBlock =
    incident.resolutionSummary?.trim() &&
    (incident.status === 'RESOLU' || incident.status === 'REJETE' || incident.status === 'CONTENU')
      ? `
    <tr>
      <td style="padding:18px 30px 0;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#64748b;">
          Synthèse / remarques
        </p>
        <div style="margin:0;padding:14px 16px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;color:#1e293b;font-size:14px;line-height:1.55;word-break:break-word;">
          ${escapeHtml(incident.resolutionSummary.trim()).replaceAll('\n', '<br/>')}
        </div>
      </td>
    </tr>`
      : ''

  const body = `
    ${renderBrandRibbon({
      eyebrow: `Mise à jour de statut · ${CSIRT_BRAND.name}`,
      title: isAnalyst ? 'Statut d’incident mis à jour' : 'Mise à jour de votre signalement',
      subtitle,
      badgeHtml: renderSeverityBadge(statusMeta.label, severityMeta.color),
      dark: true,
      logoSrc,
    })}

    <tr>
      <td style="padding:24px 30px 10px;">
        ${renderReferenceHero(
          incident.reference,
          formatFrenchDateTime(incident.updatedAt || incident.createdAt),
          statusMeta.label
        )}
      </td>
    </tr>

    <tr>
      <td style="padding:8px 30px 0;">
        ${renderInfoPanel(notice, incident.status === 'REJETE' ? 'neutral' : 'success')}
      </td>
    </tr>

    <tr>
      <td style="padding:18px 30px 0;">
        ${actions}
      </td>
    </tr>

    <tr>
      <td style="padding:18px 30px 0;">
        ${renderMetaTable([
          { label: 'Référence', value: incident.reference },
          { label: 'Ancien statut', value: previousMeta.label },
          { label: 'Nouveau statut', value: statusMeta.label },
          { label: 'Gravité', value: severityMeta.label },
          { label: 'TLP', value: tlpMeta.label },
          {
            label: 'Organisation',
            value: incident.organization || '—',
          },
          ...(isAnalyst
            ? ([
                {
                  label: 'Déclarant',
                  value:
                    incident.identify === 'yes'
                      ? incident.fullName || incident.organization || '—'
                      : 'Signalement anonyme',
                },
                {
                  label: 'Analystes assignés',
                  value: incident.assignedTo?.name || '—',
                },
              ] as Array<{ label: string; value: string }>)
            : []),
        ])}
      </td>
    </tr>

    ${resolutionBlock}

    ${
      isAnalyst
        ? `<tr>
      <td style="padding:22px 30px 8px;">
        ${renderActionButtons([
          { label: 'Ouvrir le dossier dans la console', href: consoleUrl, primary: true },
        ])}
      </td>
    </tr>`
        : `<tr>
      <td style="padding:16px 30px 8px;">
        <p style="margin:0;font-size:12px;line-height:1.55;color:#64748b;">
          Pour toute précision, répondez à ${escapeHtml(CSIRT_BRAND.email)} en indiquant la référence
          <strong>${escapeHtml(incident.reference)}</strong>.
          Formulaire : <a href="${escapeHtml(publicUrl)}" style="color:#14532d;">${escapeHtml(publicUrl)}</a>
        </p>
      </td>
    </tr>`
    }

    ${renderEmailFooter(
      `Notification de statut transmise par ${escapeHtml(CSIRT_BRAND.name)} — ${escapeHtml(CSIRT_BRAND.parent)}.`
    )}
  `

  return renderEmailShell({
    title: `Statut ${incident.reference}`,
    preheader: `${incident.reference} — ${previousMeta.label} → ${statusMeta.label}`,
    accentColor: severityMeta.color,
    body,
  })
}

function isValidEmail(value?: string | null): value is string {
  if (!value?.trim()) return false
  const email = value.trim().toLowerCase()
  return email.includes('@') && email.includes('.')
}

/** Notifie les analystes assignés et le demandeur lorsqu’un statut change. */
export async function notifyIncidentStatusChange(params: {
  previousStatus: IncidentStatus
  incident: CsirtIncident
  actorName: string
}): Promise<{ sent: string[]; failed: string[] }> {
  if (params.previousStatus === params.incident.status) {
    return { sent: [], failed: [] }
  }

  const analystEmails = parseAssigneeEmails(params.incident.assignedTo?.email)
  const analystNames = (params.incident.assignedTo?.name || '')
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter(Boolean)

  const recipients: Array<{ email: string; name: string; role: StatusRecipientRole }> = []
  const seen = new Set<string>()

  analystEmails.forEach((email, index) => {
    if (seen.has(email)) return
    seen.add(email)
    recipients.push({
      email,
      name: analystNames[index] || analystNames[0] || email,
      role: 'analyst',
    })
  })

  const requesterEmail = params.incident.email?.trim().toLowerCase()
  if (isValidEmail(requesterEmail) && !seen.has(requesterEmail)) {
    seen.add(requesterEmail)
    const requesterName =
      params.incident.identify === 'yes' && params.incident.fullName?.trim()
        ? params.incident.fullName.trim()
        : 'Madame, Monsieur'
    recipients.push({
      email: requesterEmail,
      name: requesterName,
      role: 'requester',
    })
  }

  if (recipients.length === 0) {
    return { sent: [], failed: [] }
  }

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

  const previousMeta = getIncidentStatusMeta(params.previousStatus)
  const nextMeta = getIncidentStatusMeta(params.incident.status)
  const sent: string[] = []
  const failed: string[] = []

  for (const recipient of recipients) {
    const html = buildStatusChangeEmailHtml({
      incident: params.incident,
      previousStatus: params.previousStatus,
      recipientName: recipient.name,
      role: recipient.role,
      actorName: params.actorName,
      logoSrc,
    })

    const ok = await sendEmail({
      to: recipient.email,
      subject: `[CSIRT-ARPT] [${params.incident.reference}] Statut : ${previousMeta.label} → ${nextMeta.label}`,
      html,
      attachments,
    })
    if (ok) sent.push(recipient.email)
    else failed.push(recipient.email)
  }

  return { sent, failed }
}
