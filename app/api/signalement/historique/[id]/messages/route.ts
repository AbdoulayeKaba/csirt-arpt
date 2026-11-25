import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSignalementCorrespondent } from '@/lib/csirt/signalement-access';
import { listExchangeMessages } from '@/lib/csirt/incident-exchange';
import { addIncidentNote, getIncidentById } from '@/lib/services/incidents-store';

const bodySchema = z.object({
  content: z.string().trim().min(2).max(2000),
});

function ownsIncident(email: string, incidentEmail: string) {
  return email.trim().toLowerCase() === incidentEmail.trim().toLowerCase();
}

function forCorrespondent(
  incident: { email: string; notes: Parameters<typeof listExchangeMessages>[0]['notes'] },
  viewer: { userId: string; email: string }
) {
  return listExchangeMessages(incident).map((message) => ({
    id: message.id,
    from: message.from === 'correspondent' ? ('correspondent' as const) : ('admin' as const),
    author:
      message.from === 'correspondent' &&
      (message.authorName === viewer.email ||
        viewer.email.trim().toLowerCase() === incident.email.trim().toLowerCase())
        ? 'Vous'
        : message.from === 'staff'
          ? 'CSIRT-ARPT'
          : message.authorName,
    content: message.content,
    createdAt: message.createdAt,
  }));
}

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const access = await requireSignalementCorrespondent();
  if (!access.ok) return access.response;

  const { id } = await props.params;
  const incident = await getIncidentById(id);
  if (!incident || incident.archived || !ownsIncident(access.correspondent.email, incident.email)) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  const messages = forCorrespondent(incident, access.correspondent);

  return NextResponse.json({ messages });
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const access = await requireSignalementCorrespondent();
  if (!access.ok) return access.response;

  const { id } = await props.params;
  const incident = await getIncidentById(id);
  if (!incident || incident.archived || !ownsIncident(access.correspondent.email, incident.email)) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 422 });
  }

  const { firstName, lastName, email, userId } = access.correspondent;
  const authorName = [firstName, lastName].map((part) => part.trim()).filter(Boolean).join(' ') || email;
  const note = await addIncidentNote(
    id,
    parsed.data.content,
    { id: userId, name: authorName, email },
    false,
    'Message du correspondant'
  );
  if (!note) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  const message = forCorrespondent(
    { email: incident.email, notes: [note, ...incident.notes] },
    access.correspondent
  ).at(-1);

  return NextResponse.json({ message });
}
