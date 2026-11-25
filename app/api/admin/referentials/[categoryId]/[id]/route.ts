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
  purgeReferentialItem,
  updateReferentialItem,
} from '@/lib/services/referentials-admin';

type RouteContext = { params: Promise<{ categoryId: string; id: string }> };

function categoryLabel(categoryId: string) {
  return isReferentialCategoryId(categoryId)
    ? REFERENTIAL_CATEGORY_MAP[categoryId].label
    : categoryId;
}

export async function GET(_req: Request, context: RouteContext) {
  const { session, error } = await requireApiSession();
  if (error) return error;

  const { categoryId, id } = await context.params;
  if (!isReferentialCategoryId(categoryId)) {
    return NextResponse.json({ error: 'UNKNOWN_CATEGORY' }, { status: 404 });
  }

  const item = await getReferentialItemById(id);
  if (!item || item.categoryId !== categoryId) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  return NextResponse.json({ item });
}

export async function PATCH(req: Request, context: RouteContext) {
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

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    value?: string;
    meta?: unknown;
    archived?: boolean;
  };

  const result = await updateReferentialItem(id, body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const catLabel = categoryLabel(categoryId);
  if (typeof body.archived === 'boolean' && body.archived !== existing.archived) {
    await writeAuditSafe(
      session.userId,
      body.archived ? 'referential.archive' : 'referential.restore',
      id,
      {
        resource: 'Référentiel',
        target: `${catLabel} · ${existing.name}`,
        comment: body.archived
          ? `${catLabel} « ${existing.name} » mise en corbeille`
          : `${catLabel} « ${existing.name} » restaurée`,
      }
    );
  } else {
    await writeAuditSafe(session.userId, 'referential.update', id, {
      resource: 'Référentiel',
      target: `${catLabel} · ${result.item.name}`,
      comment: `${catLabel} « ${result.item.name} » modifiée`,
    });
  }

  return NextResponse.json({ item: result.item });
}

export async function DELETE(req: Request, context: RouteContext) {
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

  const url = new URL(req.url);
  const permanent = url.searchParams.get('permanent') === '1';
  const catLabel = categoryLabel(categoryId);

  if (permanent) {
    const res = await purgeReferentialItem(id);
    if (!res.ok) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }
    await writeAuditSafe(session.userId, 'referential.purge', id, {
      resource: 'Référentiel',
      target: `${catLabel} · ${existing.name}`,
      comment: `${catLabel} « ${existing.name} » supprimée définitivement`,
    });
    return NextResponse.json({ success: true, purged: true });
  }

  // Soft delete (archive)
  const result = await updateReferentialItem(id, { archived: true });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await writeAuditSafe(session.userId, 'referential.archive', id, {
    resource: 'Référentiel',
    target: `${catLabel} · ${existing.name}`,
    comment: `${catLabel} « ${existing.name} » mise en corbeille`,
  });

  return NextResponse.json({ item: result.item, archived: true });
}
