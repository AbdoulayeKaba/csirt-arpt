import { NextResponse } from 'next/server'
import { requireApiSession } from '@/lib/auth/api-auth'
import { assertCanAccessIncident } from '@/lib/csirt/incident-access'
import { writeAuditSafe } from '@/lib/services/audit'
import { getIncidentById, restoreIncident } from '@/lib/services/incidents-store'

export async function POST(
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
  const ok = await restoreIncident(id, { id: session.userId, name: actorName })
  if (!ok) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  await writeAuditSafe(session.userId, 'incident.restore', id, {
    resource: 'Incident',
    reference: incident!.reference,
    comment: 'Restauré depuis la corbeille',
  })

  return NextResponse.json({ ok: true, restored: true })
}
