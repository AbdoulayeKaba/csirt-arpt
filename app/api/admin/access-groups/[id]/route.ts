import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiSession } from '@/lib/auth/api-auth';
import { canManageReferentials } from '@/lib/dg/referential-access';
import { updateAccessGroup } from '@/lib/services/access-groups';
import { writeAuditSafe } from '@/lib/services/audit';

const bodySchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).optional(),
  active: z.boolean().optional(),
  permissionIds: z.array(z.string().max(80)).max(80).optional(),
  userIds: z.array(z.string().min(1).max(191)).max(500).optional(),
  roleId: z.string().trim().max(80).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if (auth.error) return auth.error;
  if (!(await canManageReferentials(auth.session.role, auth.session.userId))) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 422 });
  }
  const result = await updateAccessGroup(id, parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.error === 'NOT_FOUND' ? 404 : 422 });
  }
  await writeAuditSafe(auth.session.userId, 'admin.access_group.update', undefined, {
    groupId: id,
    active: result.group.active,
  });
  return NextResponse.json({ group: result.group, rejected: result.rejected });
}
