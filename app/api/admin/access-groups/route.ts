import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiSession } from '@/lib/auth/api-auth';
import { requireApiPermission } from '@/lib/auth/permission-guard';
import { canManageReferentials } from '@/lib/dg/referential-access';
import { createAccessGroup, listAccessGroups } from '@/lib/services/access-groups';
import { getRolesPermissionsAdmin } from '@/lib/services/role-permissions-admin';
import { writeAuditSafe } from '@/lib/services/audit';

const bodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  permissionIds: z.array(z.string().max(80)).max(80).optional(),
  userIds: z.array(z.string().min(1).max(191)).max(500).optional(),
});

export async function GET() {
  const auth = await requireApiPermission('menu.admin.referentiels');
  if (auth.error) return auth.error;
  try {
    const items = await listAccessGroups();
    let roles: Array<{ id: string; label: string; permissionIds: string[] }> = [];
    try {
      const admin = await getRolesPermissionsAdmin();
      roles = admin.roles
        .filter((role) => !role.archived && role.id !== 'CORRESPONDANT')
        .map((role) => ({
          id: role.id,
          label: role.label,
          permissionIds: Object.entries(admin.permissions[role.id] ?? {})
            .filter(([, enabled]) => enabled === true)
            .map(([id]) => id),
        }));
    } catch (error) {
      console.error('[GET /api/admin/access-groups] roles', error);
    }
    return NextResponse.json({ items, roles });
  } catch (error) {
    console.error('[GET /api/admin/access-groups]', error);
    return NextResponse.json({ error: 'LOAD_FAILED' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireApiSession();
  if (auth.error) return auth.error;
  if (!(await canManageReferentials(auth.session.role, auth.session.userId))) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 422 });
  }
  const result = await createAccessGroup(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }
  await writeAuditSafe(auth.session.userId, 'admin.access_group.create', undefined, {
    groupId: result.group.id,
    name: result.group.name,
  });
  return NextResponse.json({ group: result.group, rejected: result.rejected }, { status: 201 });
}
