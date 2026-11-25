import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiSession } from '@/lib/auth/api-auth';
import { CSIRT_BRAND } from '@/lib/csirt/brand';
import { assertCanAccessIncident } from '@/lib/csirt/incident-access';
import { writeAuditSafe } from '@/lib/services/audit';
import { sendEmail } from '@/lib/services/email';
import { addIncidentNote, getIncidentById } from '@/lib/services/incidents-store';

const replySchema = z.object({
  subject: z.string().trim().min(3).max(200).optional(),
  message: z.string().trim().min(2).max(2000),
});

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireApiSession();
  if (error) return error;

  const { id } = await props.params;
  const incident = await getIncidentById(id);
  const access = await assertCanAccessIncident(incident, {
    userId: session.userId,
    email: session.email,
    role: session.role,
  });
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.error === 'NOT_FOUND' ? 404 : 403 }
    );
  }

  if (!incident || !incident.email) {
    return NextResponse.json({ error: incident ? 'NO_DECLARANT_EMAIL' : 'NOT_FOUND' }, { status: incident ? 400 : 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const parsed = replySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error }, { status: 422 });
  }

  const actorName = `${session.firstName} ${session.lastName}`.trim() || session.email;
  const subject = parsed.data.subject?.trim() || `Réponse — ${incident.reference}`;

  const note = await addIncidentNote(
    id,
    `[Message envoyé au déclarant (${incident.email})] : ${parsed.data.message}`,
    { id: session.userId, name: actorName, email: session.email },
    false,
    'Réponse au correspondant'
  );
  if (!note) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  const html = `
    <h2>Communication officielle CSIRT-ARPT — Réf. ${incident.reference}</h2>
    <p>Bonjour ${incident.fullName && incident.fullName !== 'Anonyme' ? incident.fullName : ''},</p>
    <div style="background:#f8fafc;border-left:4px solid #16a34a;padding:14px 18px;margin:16px 0;line-height:1.6;color:#1e293b;">
      ${parsed.data.message.replaceAll('\n', '<br/>')}
    </div>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/>
    <p style="font-size:12px;color:#64748b;">
      <strong>Référence de l'incident :</strong> ${incident.reference}<br/>
      <strong>Statut :</strong> ${incident.status}<br/>
      <strong>Équipe en charge :</strong> CSIRT-ARPT (${actorName})<br/>
      ${CSIRT_BRAND.parent} — Conakry, République de Guinée
    </p>
  `;

  const mailed = await sendEmail({
    to: incident.email,
    subject: `[CSIRT-ARPT] [${incident.reference}] ${subject}`,
    html,
  });

  await writeAuditSafe(session.userId, 'incident.reply', id, {
    resource: 'Incident',
    reference: incident.reference,
    comment: `Réponse envoyée à ${incident.email}`,
  });

  return NextResponse.json({ ok: true, sentTo: incident.email, mailed, note });
}
