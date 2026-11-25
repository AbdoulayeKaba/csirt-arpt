import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiPermission, userHasPermission } from '@/lib/auth/permission-guard';
import { getDgSession } from '@/lib/auth/session-server';
import { prisma } from '@/lib/prisma';
import {
  reactivateCorrespondent,
  requestCorrespondentDeactivation,
} from '@/lib/services/correspondent-deactivation';
import { deleteUser, updateUser } from '@/lib/services/users-admin';

const patchSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  role: z.string().min(1).max(64).optional(),
  department: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
  password: z.string().min(6).max(128).optional(),
  active: z.boolean().optional(),
  archived: z.boolean().optional(),
  groupIds: z.array(z.string().min(1).max(191)).max(30).optional(),
  deniedPermissionIds: z.array(z.string().max(80)).max(80).optional(),
});

async function correspondentToggleResponse(id: string, active: boolean, actorUserId: string) {
  const result = active
    ? await reactivateCorrespondent(id, actorUserId)
    : await requestCorrespondentDeactivation(id, actorUserId);
  if (!result.ok) {
    const status = result.error === 'Correspondant introuvable.' ? 404 : 403;
    return NextResponse.json({ error: result.error }, { status });
  }
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      active: true,
      archived: true,
    },
  });
  return NextResponse.json({
    user,
    immediate: result.immediate,
    notified: 'notified' in result ? result.notified : 0,
    alreadyPending: 'alreadyPending' in result && result.alreadyPending,
    deactivation: 'request' in result ? result.request : null,
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 422 });
  }

  const data = parsed.data;
  const keys = Object.keys(data);
  const onlyActive = keys.length === 1 && data.active !== undefined;

  if (onlyActive) {
    const target = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });
    if (!target) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    if (target.role.toUpperCase() === 'CORRESPONDANT') {
      const session = await getDgSession();
      if (!session) {
        return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
      }
      try {
        return await correspondentToggleResponse(id, data.active === true, session.userId);
      } catch (e) {
        console.error('[PATCH /api/admin/users/:id] correspondent toggle', e);
        return NextResponse.json({ error: 'UPDATE_FAILED' }, { status: 500 });
      }
    }
  }

  const auth = await requireApiPermission('admin.users.update');
  if (auth.error) return auth.error;
  const { session } = auth;
  const onlyArchived = keys.length === 1 && data.archived !== undefined;

  let requiredAction: string;
  if (onlyActive) {
    requiredAction = 'action.users.toggle_active';
  } else if (onlyArchived) {
    requiredAction = data.archived
      ? 'action.users.archive'
      : 'action.users.restore';
  } else {
    requiredAction = 'action.users.edit';
  }

  if (!(await userHasPermission(session!.role, requiredAction, session!.userId))) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const result = await updateUser(id, data, session!.userId);
  if (!result.ok) {
    const status =
      result.error === 'EMAIL_EXISTS'
        ? 409
        : typeof result.error === 'string' && result.error.startsWith('PASSWORD_')
          ? 422
          : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    user: result.user,
    sessionRevoked: result.sessionRevoked === true,
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiPermission('admin.users.update');
  if (auth.error) return auth.error;
  const { session } = auth;
  if (!(await userHasPermission(session!.role, 'action.users.delete', session!.userId))) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const { id } = await params;
  const result = await deleteUser(id, session!.userId);
  if (!result.ok) {
    const status =
      result.error === 'NOT_FOUND'
        ? 404
        : result.error === 'USER_NOT_ARCHIVED'
          ? 409
          : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
