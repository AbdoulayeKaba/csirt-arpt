import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireApiSession } from '@/lib/auth/api-auth'
import { assertCanAccessIncident } from '@/lib/csirt/incident-access'
import {
  notifyIncidentAssignees,
  parseAssigneeEmails,
} from '@/lib/csirt/incident-assignment-email'
import { notifyIncidentStatusChange } from '@/lib/csirt/incident-status-email'
import { writeAuditSafe } from '@/lib/services/audit'
import {
  archiveIncident,
  deleteIncidentPermanently,
  getIncidentById,
  updateIncident,
} from '@/lib/services/incidents-store'
import { findCorrespondentEmails } from '@/lib/services/users-admin'
import type { IncidentSeverity, IncidentStatus, IncidentTlp } from '@/lib/types/incident'

const updateSchema = z.object({
  status: z
    .enum(['NOUVEAU', 'EN_COURS', 'INVESTIGATION', 'CONTENU', 'RESOLU', 'REJETE'])
    .optional(),
  severity: z.enum(['FAIBLE', 'MOYEN', 'ELEVE', 'CRITIQUE']).optional(),
  tlp: z.enum(['CLEAR', 'GREEN', 'AMBER', 'RED']).optional(),
  assignedTo: z
    .object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
    })
    .nullable()
    .optional(),
  resolutionSummary: z.string().optional(),
})

export async function GET(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireApiSession()
  if (error) return error

  const { id } = await props.params
  const incident = await getIncidentById(id)
  const access = await assertCanAccessIncident(incident, {
    userId: session.userId,
    email: session.email,
    role: session.role,
  })
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.error === 'NOT_FOUND' ? 404 : 403 }
    )
  }

  return NextResponse.json(incident)
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireApiSession()
  if (error) return error

  const { id } = await props.params
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error }, { status: 422 })
  }

  const current = await getIncidentById(id)
  const access = await assertCanAccessIncident(current, {
    userId: session.userId,
    email: session.email,
    role: session.role,
  })
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.error === 'NOT_FOUND' ? 404 : 403 }
    )
  }

  const previousAssigneeEmails = parseAssigneeEmails(current!.assignedTo?.email)
  if (parsed.data.assignedTo) {
    const nextEmails = parseAssigneeEmails(parsed.data.assignedTo.email)
    const alreadyAssigned = new Set(previousAssigneeEmails)
    const added = nextEmails.filter((email) => !alreadyAssigned.has(email))
    const blocked = await findCorrespondentEmails(added)
    if (blocked.length > 0) {
      return NextResponse.json({ error: 'CORRESPONDANT_NOT_ASSIGNABLE' }, { status: 400 })
    }
  }
  const previousStatus = current!.status
  const actorName = `${session.firstName} ${session.lastName}`.trim() || session.email
  const updated = await updateIncident(
    id,
    {
      status: parsed.data.status as IncidentStatus | undefined,
      severity: parsed.data.severity as IncidentSeverity | undefined,
      tlp: parsed.data.tlp as IncidentTlp | undefined,
      assignedTo: parsed.data.assignedTo,
      resolutionSummary: parsed.data.resolutionSummary,
    },
    { id: session.userId, name: actorName }
  )

  if (!updated) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  const changes: string[] = []
  if (parsed.data.status !== undefined && parsed.data.status !== previousStatus) {
    changes.push(`statut ${previousStatus} → ${parsed.data.status}`)
  }
  if (parsed.data.severity !== undefined && parsed.data.severity !== current!.severity) {
    changes.push(`gravité ${current!.severity} → ${parsed.data.severity}`)
  }
  if (parsed.data.tlp !== undefined && parsed.data.tlp !== current!.tlp) {
    changes.push(`TLP ${current!.tlp} → ${parsed.data.tlp}`)
  }
  if (parsed.data.assignedTo !== undefined) {
    changes.push(
      parsed.data.assignedTo
        ? `assigné à ${parsed.data.assignedTo.name || parsed.data.assignedTo.email}`
        : 'désassigné'
    )
  }
  if (parsed.data.resolutionSummary !== undefined) {
    changes.push('synthèse de résolution mise à jour')
  }

  await writeAuditSafe(session.userId, 'incident.update', updated.id, {
    resource: 'Incident',
    reference: updated.reference,
    comment: changes.length ? changes.join(' · ') : 'Qualification mise à jour',
  })

  let assignmentMail: { sent: string[]; failed: string[] } | undefined
  if (parsed.data.assignedTo !== undefined) {
    try {
      assignmentMail = await notifyIncidentAssignees({
        previousEmails: previousAssigneeEmails,
        incident: updated,
        actorName,
      })
    } catch (e) {
      console.error('[PATCH /api/admin/incidents/:id] assignment email', e)
      assignmentMail = {
        sent: [],
        failed: parseAssigneeEmails(updated.assignedTo?.email),
      }
    }
  }

  let statusMail: { sent: string[]; failed: string[] } | undefined
  if (parsed.data.status !== undefined && parsed.data.status !== previousStatus) {
    try {
      statusMail = await notifyIncidentStatusChange({
        previousStatus,
        incident: updated,
        actorName,
      })
    } catch (e) {
      console.error('[PATCH /api/admin/incidents/:id] status email', e)
      statusMail = { sent: [], failed: [] }
    }
  }

  return NextResponse.json({ ok: true, incident: updated, assignmentMail, statusMail })
}

export async function DELETE(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireApiSession()
  if (error) return error

  const { id } = await props.params
  const incident = await getIncidentById(id)
  const access = await assertCanAccessIncident(incident, {
    userId: session.userId,
    email: session.email,
    role: session.role,
  })
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.error === 'NOT_FOUND' ? 404 : 403 }
    )
  }

  const actorName = `${session.firstName} ${session.lastName}`.trim() || session.email
  if (!incident!.archived) {
    await archiveIncident(id, { id: session.userId, name: actorName })
    await writeAuditSafe(session.userId, 'incident.archive', id, {
      resource: 'Incident',
      reference: incident!.reference,
      comment: 'Déplacé en corbeille',
    })
    return NextResponse.json({ ok: true, archived: true })
  }

  await deleteIncidentPermanently(id, session.userId)
  await writeAuditSafe(session.userId, 'incident.delete', id, {
    resource: 'Incident',
    reference: incident!.reference,
    comment: 'Suppression définitive',
  })
  return NextResponse.json({ ok: true, deleted: true })
}
