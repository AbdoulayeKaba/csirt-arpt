import { NextResponse } from 'next/server';
import { requireApiSession } from '@/lib/auth/api-auth';
import { canManageReferentials } from '@/lib/dg/referential-access';
import { writeAuditSafe } from '@/lib/services/audit';
import { emptyReferentialsTrash } from '@/lib/services/referentials-admin';

async function emptyTrash(userId: string) {
  const result = await emptyReferentialsTrash();
  await writeAuditSafe(userId, 'referential.trash.empty', undefined, {
    resource: 'Référentiel',
    comment: 'Corbeille des référentiels vidée',
  });
  return result;
}

export async function POST() {
  const { session, error } = await requireApiSession();
  if (error) return error;

  if (!(await canManageReferentials(session.role))) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const result = await emptyTrash(session.userId);
  return NextResponse.json(result);
}

export async function DELETE() {
  const { session, error } = await requireApiSession();
  if (error) return error;

  if (!(await canManageReferentials(session.role))) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const result = await emptyTrash(session.userId);
  return NextResponse.json(result);
}
