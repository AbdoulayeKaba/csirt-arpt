import { NextResponse } from 'next/server'
import { requireApiSession } from '@/lib/auth/api-auth'
import { assertCanAccessIncident } from '@/lib/csirt/incident-access'
import { getIncidentById } from '@/lib/services/incidents-store'
import { readIncidentAttachment } from '@/lib/storage/incident-attachments'

export async function GET(
  _req: Request,
  props: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const { session, error } = await requireApiSession()
  if (error) return error

  const { id, attachmentId } = await props.params
  if (!id || !attachmentId) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

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

  const meta = incident?.attachments?.find((item) => item.id === attachmentId)
  if (!meta) {
    return NextResponse.json({ error: 'ATTACHMENT_NOT_FOUND' }, { status: 404 })
  }

  const file = await readIncidentAttachment({
    incidentId: id,
    attachmentId,
    fallbackName: meta.name,
    mimeType: meta.mimeType,
    allowDemoFallback: true,
  })
  if (!file) {
    return NextResponse.json({ error: 'FILE_MISSING' }, { status: 404 })
  }

  const asciiName = file.fileName.replace(/[^\x20-\x7E]/g, '_')
  const encodedName = encodeURIComponent(file.fileName)

  return new NextResponse(new Uint8Array(file.buffer), {
    headers: {
      'Content-Type': file.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
      'Content-Length': String(file.buffer.length),
      'Cache-Control': 'private, no-store',
    },
  })
}
