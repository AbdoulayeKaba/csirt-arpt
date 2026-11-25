import { NextResponse } from 'next/server';
import { requireApiSession } from '@/lib/auth/api-auth';
import { canManageReferentials } from '@/lib/dg/referential-access';
import {
  isReferentialCategoryId,
  REFERENTIAL_CATEGORY_MAP,
} from '@/lib/dg/referential-catalog';
import { writeAuditSafe } from '@/lib/services/audit';
import {
  getReferentialItemById,
  updateReferentialItem,
} from '@/lib/services/referentials-admin';

type RouteContext = { params: Promise<{ categoryId: string; id: string }> };

export async function POST(_req: Request, context: RouteContext) {
  const { session, error } = await requireApiSession();
  if (error) return error;

  const { categoryId, id } = await context.params;
  if (!isReferentialCategoryId(categoryId)) {
    return NextResponse.json({ error: 'UNKNOWN_CATEGORY' }, { status: 404 });
  }
  if (!(await canManageReferentials(session.role))) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const existing = await getReferentialItemById(id);
  if (!existing || existing.categoryId !== categoryId) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  const result = await updateReferentialItem(id, { archived: false });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const catLabel = REFERENTIAL_CATEGORY_MAP[categoryId].label;
  await writeAuditSafe(session.userId, 'referential.restore', id, {
    resource: 'Référentiel',
    target: `${catLabel} · ${existing.name}`,
    comment: `${catLabel} « ${existing.name} » restaurée`,
  });

  return NextResponse.json({ item: result.item, restored: true });
}
