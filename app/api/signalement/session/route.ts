import { NextResponse } from 'next/server';
import { getCorrespondentSession } from '@/lib/auth/session-server';
import { resolveOrganisationDeclarant } from '@/lib/csirt/correspondent-identity';
import { isSignalementAnonymousEnabled } from '@/lib/csirt/signalement-access';
import { prisma } from '@/lib/prisma';
import { getCorrespondentSignalementCooldown } from '@/lib/services/incidents-store';

/**
 * État d’accès pour la page publique /signalement (modal + formulaire).
 * Ne divulgue aucune donnée sensible au-delà de l’identité de session.
 */
export async function GET() {
  const anonymousEnabled = isSignalementAnonymousEnabled();
  const session = await getCorrespondentSession();

  if (!session) {
    return NextResponse.json({
      authenticated: false,
      anonymousEnabled,
      canSubmit: false,
      reason: 'UNAUTHORIZED' as const,
    });
  }

  if (session.role !== 'CORRESPONDANT') {
    return NextResponse.json({
      authenticated: true,
      anonymousEnabled,
      canSubmit: false,
      reason: 'FORBIDDEN' as const,
      role: session.role,
      email: session.email,
      firstName: session.firstName,
      lastName: session.lastName,
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      active: true,
      archived: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      department: true,
      organization: { select: { id: true, name: true, active: true, slug: true, notes: true } },
    },
  });

  if (!user || user.archived || !user.active) {
    return NextResponse.json({
      authenticated: true,
      anonymousEnabled,
      canSubmit: false,
      reason: 'ACCOUNT_INACTIVE' as const,
      role: 'CORRESPONDANT',
      email: session.email,
    });
  }

  if (!user.organization?.active) {
    return NextResponse.json({
      authenticated: true,
      anonymousEnabled,
      canSubmit: false,
      reason: user.organization ? ('ORG_INACTIVE' as const) : ('ORG_REQUIRED' as const),
      role: 'CORRESPONDANT',
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    });
  }

  const declarant = await resolveOrganisationDeclarant(user.organization.name);
  const cooldown = await getCorrespondentSignalementCooldown(user.email);

  return NextResponse.json({
    authenticated: true,
    anonymousEnabled,
    canSubmit: true,
    reason: null,
    cooldownUntil: cooldown.retryAt,
    cooldownRemainingSeconds: cooldown.active ? Math.ceil(cooldown.remainingMs / 1000) : 0,
    role: 'CORRESPONDANT',
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone ?? '',
    jobTitle: user.department ?? '',
    organizationId: user.organization.id,
    organizationName: user.organization.name,
    organizationSlug: user.organization.slug,
    organizationNotes: user.organization.notes ?? '',
    organizationActive: user.organization.active,
    declarantType: declarant.id,
    declarantTypeLabel: declarant.label,
  });
}
