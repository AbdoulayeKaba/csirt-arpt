import { NextResponse } from 'next/server';
import { requireApiSession } from '@/lib/auth/api-auth';
import { userHasPermission } from '@/lib/auth/permission-guard';
import { listReferentialItems } from '@/lib/services/referentials-admin';

/** Liste des départements actifs (référentiel) pour les formulaires utilisateur. */
export async function GET() {
  const { session, error } = await requireApiSession();
  if (error) return error;

  const canManageUsers =
    (await userHasPermission(session.role, 'menu.admin.users')) ||
    (await userHasPermission(session.role, 'admin.users.read')) ||
    (await userHasPermission(session.role, 'action.users.create')) ||
    (await userHasPermission(session.role, 'action.users.edit'));

  if (!canManageUsers) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const items = await listReferentialItems('departements', { archived: false }).catch(() => []);
  return NextResponse.json({
    items: items.map((item) => ({ id: item.id, name: item.name })),
  });
}
