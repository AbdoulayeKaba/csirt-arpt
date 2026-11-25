import { NextResponse } from 'next/server';
import { requireSignalementCorrespondent } from '@/lib/csirt/signalement-access';
import { getIncidentById } from '@/lib/services/incidents-store';

function ownsIncident(email: string, incidentEmail: string) {
  return email.trim().toLowerCase() === incidentEmail.trim().toLowerCase();
}

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const access = await requireSignalementCorrespondent();
  if (!access.ok) return access.response;

  const { id } = await props.params;
  const incident = await getIncidentById(id);
  if (!incident || incident.archived || !ownsIncident(access.correspondent.email, incident.email)) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  return NextResponse.json({
    incident: {
      id: incident.id,
      reference: incident.reference,
      status: incident.status,
      createdAt: incident.createdAt,
      updatedAt: incident.updatedAt,
      declarantTypeName: incident.declarantTypeName,
      fullName: incident.fullName,
      organization: incident.organization,
      email: incident.email,
      phone: incident.phone,
      typeLabels: incident.typeLabels,
      severity: incident.severity,
      description: incident.description,
      measures: incident.measures,
      target: incident.target,
      reported: incident.reported,
      resolutionSummary: incident.resolutionSummary ?? '',
      attachments: incident.attachments.map((file) => ({
        id: file.id,
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
      })),
    },
  });
}
