import { NextResponse } from 'next/server';
import { requireSignalementCorrespondent } from '@/lib/csirt/signalement-access';
import { getAllIncidents } from '@/lib/services/incidents-store';

export async function GET() {
  const access = await requireSignalementCorrespondent();
  if (!access.ok) return access.response;

  const email = access.correspondent.email.trim().toLowerCase();
  const items = (await getAllIncidents())
    .filter((item) => !item.archived && item.email.trim().toLowerCase() === email)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((item) => ({
      id: item.id,
      reference: item.reference,
      status: item.status,
      createdAt: item.createdAt,
      typeLabels: item.typeLabels,
      messageCount: item.notes.filter((note) => !note.isInternal).length,
    }));

  return NextResponse.json({ items });
}
