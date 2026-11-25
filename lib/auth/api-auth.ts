import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { getCorrespondentSession, getDgSession, type DgSessionContext } from '@/lib/auth/session-server';
import type { DgRole } from '@/lib/dg/rbac';
import { isDgRole } from '@/lib/dg/role-ids';
import { resolveEffectiveDgRole } from '@/lib/dg/role-access';
import { getEffectivePermissionMap } from '@/lib/auth/effective-permissions';

export async function requireApiSession(roles?: DgRole[]) {
  const realm = (await headers()).get('x-csirt-realm');
  const session = realm === 'portal' ? await getCorrespondentSession() : await getDgSession();
  if (!session) {
    return { session: null as null, error: NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 }) };
  }
  if (roles?.length) {
    if (isDgRole(session.role) && roles.includes(session.role)) {
      return { session: session as DgSessionContext, error: null };
    }
    // Rôles personnalisés : autoriser via le rôle effectif dérivé des permissions.
    const permissions = await getEffectivePermissionMap(session.userId, session.role);
    const effective = resolveEffectiveDgRole(session.role, permissions);
    if (!roles.includes(effective)) {
      return { session: null as null, error: NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }) };
    }
  }
  return { session: session as DgSessionContext, error: null };
}
