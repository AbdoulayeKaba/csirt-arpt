import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiPermission, userHasPermission } from '@/lib/auth/permission-guard';
import {
  createOrganization,
  listOrganizationCatalog,
  listOrganizations,
} from '@/lib/services/organizations-admin';
import { invitationExpiryHours } from '@/lib/services/user-invitations';

const createSchema = z.object({
  catalogId: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(2000).optional(),
  active: z.boolean().optional(),
});

export async function GET() {
  try {
    const auth = await requireApiPermission('admin.organizations.read');
    if (auth.error) return auth.error;

    const [items, catalog] = await Promise.all([listOrganizations(), listOrganizationCatalog()]);
    return NextResponse.json({ items, catalog, expiryHours: invitationExpiryHours() });
  } catch (e) {
    console.error('[GET /api/admin/organizations]', e);
    return NextResponse.json({ error: 'LOAD_FAILED' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireApiPermission('admin.organizations.manage');
  if (auth.error) return auth.error;
  if (!(await userHasPermission(auth.session!.role, 'action.organizations.create'))) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 422 });
  }

  try {
    const result = await createOrganization(parsed.data, auth.session!.userId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }
    return NextResponse.json(
      {
        organization: {
          id: result.organization.id,
          name: result.organization.name,
          slug: result.organization.slug,
          active: result.organization.active,
          notes: result.organization.notes,
          createdAt: result.organization.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (e) {
    console.error('[POST /api/admin/organizations]', e);
    return NextResponse.json({ error: 'CREATE_FAILED' }, { status: 500 });
  }
}
