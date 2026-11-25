import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireApiSession } from '@/lib/auth/api-auth'
import { assertCanAccessIncident } from '@/lib/csirt/incident-access'
import { writeAuditSafe } from '@/lib/services/audit'
import { addIncidentNote, getIncidentById } from '@/lib/services/incidents-store'

const noteSchema = z.object({
  content: z.string().min(1).max(10000),
  isInternal: z.boolean().optional().default(true),
})

export async function POST(
  req: Request,
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

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }

  const parsed = noteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error }, { status: 422 })
  }

  const actorName = `${session.firstName} ${session.lastName}`.trim() || session.email
  const note = await addIncidentNote(
    id,
    parsed.data.content,
    { id: session.userId, name: actorName, email: session.email },
    parsed.data.isInternal
  )

  if (!note) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  await writeAuditSafe(session.userId, 'incident.note', id, {
    resource: 'Incident',
    reference: incident!.reference,
    comment: parsed.data.isInternal ? 'Note interne ajoutée' : 'Note ajoutée',
  })

  return NextResponse.json({ ok: true, note }, { status: 201 })
}
