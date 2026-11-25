import { NextResponse } from 'next/server';
import { getCorrespondentSession } from '@/lib/auth/session-server';
import { prisma } from '@/lib/prisma';

/** Parcours anonyme conservé mais désactivé par défaut. */
export function isSignalementAnonymousEnabled(): boolean {
  const raw = process.env.SIGNALEMENT_ANONYMOUS_ENABLED?.trim().toLowerCase();
  if (!raw) return false;
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

export type SignalementCorrespondentContext = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  jobTitle: string;
  organizationId: string;
  organizationName: string;
};

/**
 * Accès au POST signalement authentifié :
 * session + rôle CORRESPONDANT + compte actif + organisation partenaire active.
 */
export async function requireSignalementCorrespondent(): Promise<
  | { ok: true; correspondent: SignalementCorrespondentContext }
  | { ok: false; response: NextResponse }
> {
  const session = await getCorrespondentSession();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          message: 'Authentification requise pour déposer un signalement.',
        },
        { status: 401 }
      ),
    };
  }

  if (session.role !== 'CORRESPONDANT') {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: 'Seuls les correspondants d’organisations partenaires peuvent signaler.',
        },
        { status: 403 }
      ),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      department: true,
      role: true,
      active: true,
      archived: true,
      organizationId: true,
      organization: {
        select: { id: true, name: true, active: true },
      },
    },
  });

  if (!user || user.archived || !user.active) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'ACCOUNT_INACTIVE', message: 'Compte correspondant inactif.' },
        { status: 403 }
      ),
    };
  }

  if (user.role !== 'CORRESPONDANT') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }),
    };
  }

  if (!user.organizationId || !user.organization) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'ORG_REQUIRED',
          message: 'Aucune organisation partenaire rattachée à ce compte.',
        },
        { status: 403 }
      ),
    };
  }

  if (!user.organization.active) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'ORG_INACTIVE',
          message: 'L’organisation partenaire est désactivée.',
        },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    correspondent: {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? '',
      jobTitle: user.department ?? '',
      organizationId: user.organization.id,
      organizationName: user.organization.name,
    },
  };
}
