import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiPermission, userHasPermission } from '@/lib/auth/permission-guard';
import { getDgSession } from '@/lib/auth/session-server';
import {
  organizationDeactivationContext,
  reactivateOrganization,
  requestOrganizationDeactivation,
} from '@/lib/services/organization-deactivation';
import { correspondentDeactivationContext } from '@/lib/services/correspondent-deactivation';
import {
  getOrganizationDetail,
  updateOrganization,
} from '@/lib/services/organizations-admin';

const patchSchema = z.object({
  notes: z.string().trim().max(2000).nullable().optional(),
  active: z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const auth = await requireApiPermission('admin.organizations.read');
    if (auth.error) return auth.error;

    const { id } = await ctx.params;
    const detail = await getOrganizationDetail(id);
    if (!detail) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    const [deactivation, correspondents] = await Promise.all([
      organizationDeactivationContext(id, auth.session.role),
      correspondentDeactivationContext(detail.users.map((user) => user.id)),
    ]);
    return NextResponse.json({
      organization: {
        ...detail,
        ...deactivation,
        users: detail.users.map((user) => {
          const state = correspondents.get(user.id);
          return {
            ...user,
            pendingDeactivation: state?.pending
              ? {
                  id: state.pending.id,
                  requestedAt: state.pending.requestedAt,
                  expiresAt: state.pending.expiresAt,
                  requestedByName: state.pending.requestedByName,
                }
              : null,
            deactivationTrace: state?.trace
              ? {
                  status: state.trace.status,
                  requestedAt: state.trace.requestedAt,
                  requestedByName: state.trace.requestedByName,
                  decidedAt: state.trace.decidedAt,
                  decidedByName: state.trace.decidedByName,
                }
              : null,
          };
        }),
      },
    });
  } catch (e) {
    console.error('[GET /api/admin/organizations/:id]', e);
    return NextResponse.json({ error: 'LOAD_FAILED' }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await getDgSession();
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 422 });
  }

  const { id } = await ctx.params;
  const wantsToggle = parsed.data.active !== undefined && parsed.data.notes === undefined;

  if (wantsToggle) {
    try {
      if (parsed.data.active === false) {
        const result = await requestOrganizationDeactivation(id, session.userId);
        if (!result.ok) {
          return NextResponse.json(
            { error: result.error },
            { status: result.error === 'Organisation introuvable.' ? 404 : 403 }
          );
        }
        const detail = await getOrganizationDetail(id);
        return NextResponse.json({
          organization: detail,
          deactivation: result.request,
          immediate: result.immediate,
          notified: result.notified,
          alreadyPending: 'alreadyPending' in result && result.alreadyPending,
        });
      }

      const result = await reactivateOrganization(id, session.userId);
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error },
          { status: result.error === 'Organisation introuvable.' ? 404 : 403 }
        );
      }
      return NextResponse.json({
        organization: {
          id: result.organization.id,
          name: result.organization.name,
          slug: result.organization.slug,
          active: result.organization.active,
          notes: result.organization.notes,
          updatedAt: result.organization.updatedAt.toISOString(),
        },
        immediate: true,
      });
    } catch (e) {
      console.error('[PATCH /api/admin/organizations/:id] toggle', e);
      return NextResponse.json({ error: 'UPDATE_FAILED' }, { status: 500 });
    }
  }

  const auth = await requireApiPermission('admin.organizations.manage');
  if (auth.error) return auth.error;
  if (!(await userHasPermission(auth.session.role, 'action.organizations.edit'))) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  try {
    const result = await updateOrganization(id, parsed.data, auth.session.userId);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === 'NOT_FOUND' ? 404 : 422 }
      );
    }
    return NextResponse.json({
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
        active: result.organization.active,
        notes: result.organization.notes,
        updatedAt: result.organization.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    console.error('[PATCH /api/admin/organizations/:id]', e);
    return NextResponse.json({ error: 'UPDATE_FAILED' }, { status: 500 });
  }
}
