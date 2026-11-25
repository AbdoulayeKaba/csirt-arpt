import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiPermission, userHasPermission } from '@/lib/auth/permission-guard';
import {
  adminDisableEmailTwoFactorForUsers,
  adminEnableEmailTwoFactorForUsers,
} from '@/lib/services/account-two-factor';

const bodySchema = z.object({
  action: z.enum(['enable', 'disable']),
  userIds: z.array(z.string().trim().min(1).max(64)).min(1).max(500),
});

export async function POST(req: Request) {
  const auth = await requireApiPermission('admin.users.update');
  if (auth.error) return auth.error;
  if (!(await userHasPermission(auth.session!.role, 'action.users.edit'))) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 422 });
  }

  const apply =
    parsed.data.action === 'enable'
      ? adminEnableEmailTwoFactorForUsers
      : adminDisableEmailTwoFactorForUsers;
  const result = await apply(parsed.data.userIds, auth.session!.userId);
  return NextResponse.json({ ok: true, updated: result.updated });
}
