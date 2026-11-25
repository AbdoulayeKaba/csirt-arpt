import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiSession } from '@/lib/auth/api-auth';
import { canViewAllIncidents } from '@/lib/csirt/incident-access';
import { writeAuditSafe } from '@/lib/services/audit';
import {
  createIncidentFromVisitor,
  listIncidents,
} from '@/lib/services/incidents-store';
import type { IncidentFilterStatus, IncidentSeverity } from '@/lib/types/incident';

const listQuerySchema = z.object({
  q: z.string().max(200).optional(),
  status: z
    .enum(['ALL', 'NOUVEAU', 'EN_COURS', 'INVESTIGATION', 'CONTENU', 'RESOLU', 'REJETE', 'TRASH'])
    .optional(),
  severity: z.enum(['ALL', 'FAIBLE', 'MOYEN', 'ELEVE', 'CRITIQUE']).optional(),
  declarantType: z.string().max(64).optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  limit: z.coerce.number().min(1).max(200).optional(),
  offset: z.coerce.number().min(0).optional(),
});

export async function GET(req: Request) {
  const { session, error } = await requireApiSession();
  if (error) return error;

  const url = new URL(req.url);
  const parsed = listQuerySchema.safeParse({
    q: url.searchParams.get('q') || undefined,
    status: url.searchParams.get('status') || undefined,
    severity: url.searchParams.get('severity') || undefined,
    declarantType: url.searchParams.get('declarantType') || undefined,
    from: url.searchParams.get('from') || undefined,
    to: url.searchParams.get('to') || undefined,
    limit: url.searchParams.get('limit') || undefined,
    offset: url.searchParams.get('offset') || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error }, { status: 422 });
  }

  const viewAll = await canViewAllIncidents(session.role);
  const result = await listIncidents({
    q: parsed.data.q,
    status: (parsed.data.status || 'ALL') as IncidentFilterStatus,
    severity: (parsed.data.severity || 'ALL') as IncidentSeverity | 'ALL',
    declarantType: parsed.data.declarantType,
    from: parsed.data.from,
    to: parsed.data.to,
    limit: parsed.data.limit,
    offset: parsed.data.offset,
    assignedToActor: viewAll
      ? undefined
      : { userId: session.userId, email: session.email },
  });

  return NextResponse.json(result);
}

const createSchema = z.object({
  identify: z.enum(['yes', 'no']),
  declarantType: z.string().optional(),
  fullName: z.string().optional(),
  organization: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  types: z.array(z.string()).min(1),
  description: z.string().min(10),
  measures: z.string().optional(),
  target: z.string().optional(),
  reported: z.enum(['yes', 'no']),
  attachments: z
    .array(
      z.object({
        name: z.string(),
        size: z.number().optional(),
        mimeType: z.string().optional(),
        url: z.string().optional(),
      })
    )
    .optional(),
});

export async function POST(req: Request) {
  const { session, error } = await requireApiSession();
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error }, { status: 422 });
  }

  const incident = await createIncidentFromVisitor(parsed.data);
  await writeAuditSafe(session.userId, 'incident.create', incident.id, {
    resource: 'Incident',
    reference: incident.reference,
    comment: 'Signalement consigné manuellement',
  });
  return NextResponse.json({ ok: true, incident }, { status: 201 });
}
