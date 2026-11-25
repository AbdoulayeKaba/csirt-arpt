import { NextResponse } from 'next/server';
import { requireSignalementCorrespondent } from '@/lib/csirt/signalement-access';
import { getIncidentById } from '@/lib/services/incidents-store';
import { readIncidentAttachment } from '@/lib/storage/incident-attachments';

function ownsIncident(email: string, incidentEmail: string) {
  return email.trim().toLowerCase() === incidentEmail.trim().toLowerCase();
}

export async function GET(
  _req: Request,
  props: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const access = await requireSignalementCorrespondent();
  if (!access.ok) return access.response;

  const { id, attachmentId } = await props.params;
  const incident = await getIncidentById(id);
  if (!incident || incident.archived || !ownsIncident(access.correspondent.email, incident.email)) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  const meta = incident.attachments.find((item) => item.id === attachmentId);
  if (!meta) {
    return NextResponse.json({ error: 'ATTACHMENT_NOT_FOUND' }, { status: 404 });
  }

  const file = await readIncidentAttachment({
    incidentId: id,
    attachmentId,
    fallbackName: meta.name,
    mimeType: meta.mimeType,
    allowDemoFallback: false,
  });
  if (!file) {
    return NextResponse.json({ error: 'FILE_MISSING' }, { status: 404 });
  }

  const asciiName = file.fileName.replace(/[^\x20-\x7E]/g, '_');
  const encodedName = encodeURIComponent(file.fileName);

  return new NextResponse(new Uint8Array(file.buffer), {
    headers: {
      'Content-Type': file.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
      'Content-Length': String(file.buffer.length),
      'Cache-Control': 'private, no-store',
    },
  });
}
