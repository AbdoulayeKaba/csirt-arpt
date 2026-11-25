import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiPermission, userHasPermission } from '@/lib/auth/permission-guard';
import {
  adminDisableCorrespondentTwoFactor,
  adminEnableCorrespondentEmailTwoFactor,
  getAccountTwoFactorStatus,
} from '@/lib/services/account-two-factor';

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('enable') }),
  z.object({ action: z.literal('disable') }),
]);

async function authorize() {
  const auth = await requireApiPermission('admin.users.update');
  if (auth.error) return { error: auth.error, session: null };
  if (!(await userHasPermission(auth.session!.role, 'action.users.edit'))) {
    return {
      error: NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }),
      session: null,
    };
  }
  return { error: null, session: auth.session! };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize();
  if (auth.error) return auth.error;
  const { id } = await params;
  const status = await getAccountTwoFactorStatus(id);
  if (!status) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  return NextResponse.json(status);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorize();
  if (auth.error) return auth.error;
  const { id } = await params;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 422 });
  }

  if (parsed.data.action === 'enable') {
    const result = await adminEnableCorrespondentEmailTwoFactor(id, auth.session!.userId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.error === 'NOT_FOUND' ? 404 : 422 });
    }
    return NextResponse.json({ ok: true, enabled: true });
  }

  const result = await adminDisableCorrespondentTwoFactor(id, auth.session!.userId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.error === 'NOT_FOUND' ? 404 : 422 });
  }
  return NextResponse.json({ ok: true, enabled: false });
}
