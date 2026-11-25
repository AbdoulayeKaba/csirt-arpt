/**
 * Tests métier étape 2 (organisations / invitations / correspondant).
 * Exécution : npx tsx scripts/_test-step2-org-invitations.ts
 * Ne logge jamais le token en clair.
 */
import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword } from '../lib/auth/password';
import {
  createOrganization,
  updateOrganization,
} from '../lib/services/organizations-admin';
import {
  acceptCorrespondentInvitation,
  cancelCorrespondentInvitation,
  createCorrespondentInvitation,
  hashInvitationToken,
  previewInvitationByToken,
  resendCorrespondentInvitation,
} from '../lib/services/user-invitations';
import { getRolePermissionMap } from '../lib/services/role-permissions-admin';
import { listAssignableRoles } from '../lib/services/assignable-roles';

type Result = { name: string; ok: boolean; detail?: string };

const results: Result[] = [];

function record(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  const mark = ok ? 'OK' : 'FAIL';
  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  const stamp = Date.now();
  const admin =
    (await prisma.user.findFirst({
      where: { role: 'ASSISTANT', active: true, archived: false },
      orderBy: { email: 'asc' },
    })) ??
    (await prisma.user.create({
      data: {
        email: `admin-step2-${stamp}@test.local`,
        firstName: 'Admin',
        lastName: 'Step2',
        role: 'ASSISTANT',
        passwordHash: await hashPassword('AdminTest!234'),
        passwordChangedAt: new Date(),
        active: true,
      },
    }));

  const orgResult = await createOrganization(
    { name: `Org Test Step2 ${stamp}`, notes: 'test étape 2' },
    admin.id
  );
  record('création organisation', orgResult.ok, orgResult.ok ? orgResult.organization.slug : orgResult.error);
  if (!orgResult.ok) throw new Error('org create failed');
  const orgId = orgResult.organization.id;

  const inactive = await updateOrganization(orgId, { active: false }, admin.id);
  record('désactivation organisation', inactive.ok);

  const inviteOnInactive = await createCorrespondentInvitation(
    { organizationId: orgId, email: `corr-${stamp}@example.com` },
    admin.id
  );
  record(
    'invitation refusée si org inactive',
    !inviteOnInactive.ok && inviteOnInactive.error === 'ORG_INACTIVE',
    inviteOnInactive.ok ? 'unexpected ok' : inviteOnInactive.error
  );

  await updateOrganization(orgId, { active: true }, admin.id);

  const invite = await createCorrespondentInvitation(
    {
      organizationId: orgId,
      email: `corr-${stamp}@example.com`,
    },
    admin.id
  );
  record('création invitation', invite.ok, invite.ok ? `emailSent=${invite.emailSent}` : invite.error);
  if (!invite.ok) throw new Error('invite failed');

  const token = invite.activationToken;
  const stored = await prisma.userInvitation.findUnique({ where: { id: invite.invitation.id } });
  record(
    'token stocké uniquement en hash',
    Boolean(stored && stored.tokenHash === hashInvitationToken(token) && !JSON.stringify(stored).includes(token))
  );

  const preview = await previewInvitationByToken(token);
  record('prévisualisation lien valide', preview.ok, preview.ok ? preview.organizationName : preview.error);

  const resend = await resendCorrespondentInvitation(invite.invitation.id, admin.id);
  record('renvoi invitation', resend.ok, resend.ok ? `emailSent=${resend.emailSent}` : resend.error);
  if (!resend.ok) throw new Error('resend failed');

  const oldPreview = await previewInvitationByToken(token);
  record(
    'ancien token invalidé après renvoi',
    !oldPreview.ok && oldPreview.error === 'INVALID_TOKEN',
    oldPreview.ok ? 'still valid' : oldPreview.error
  );

  const newToken = resend.activationToken;
  const cancel = await cancelCorrespondentInvitation(invite.invitation.id, admin.id);
  record('annulation invitation', cancel.ok);

  const cancelledPreview = await previewInvitationByToken(newToken);
  record(
    'token annulé refusé',
    !cancelledPreview.ok &&
      (cancelledPreview.error === 'CANCELLED' || cancelledPreview.error === 'INVALID_TOKEN'),
    cancelledPreview.ok ? 'still valid' : cancelledPreview.error
  );

  const invite2 = await createCorrespondentInvitation(
    { organizationId: orgId, email: `corr2-${stamp}@example.com` },
    admin.id
  );
  record('nouvelle invitation', invite2.ok);
  if (!invite2.ok) throw new Error('invite2 failed');

  await prisma.userInvitation.update({
    where: { id: invite2.invitation.id },
    data: { expiresAt: new Date(Date.now() - 60_000) },
  });
  const expiredPreview = await previewInvitationByToken(invite2.activationToken);
  record(
    'expiration invitation',
    !expiredPreview.ok && expiredPreview.error === 'EXPIRED',
    expiredPreview.ok ? 'still valid' : expiredPreview.error
  );

  const invite3 = await createCorrespondentInvitation(
    { organizationId: orgId, email: `corr3-${stamp}@example.com` },
    admin.id
  );
  record('invitation pour acceptation', invite3.ok);
  if (!invite3.ok) throw new Error('invite3 failed');

  const password = 'CorrTest!23456';
  const accepted = await acceptCorrespondentInvitation({
    token: invite3.activationToken,
    firstName: 'Awa',
    lastName: 'Diallo',
    password,
  });
  record(
    'acceptation invitation',
    accepted.ok,
    accepted.ok ? accepted.user.email : accepted.error
  );
  if (!accepted.ok) throw new Error('accept failed');

  const user = await prisma.user.findUnique({ where: { id: accepted.user.id } });
  record(
    'compte CORRESPONDANT créé',
    Boolean(user && user.role === 'CORRESPONDANT' && user.organizationId === orgId && user.active)
  );
  record(
    'mot de passe hashé vérifiable',
    Boolean(user?.passwordHash && (await verifyPassword(password, user.passwordHash)))
  );

  const reuse = await acceptCorrespondentInvitation({
    token: invite3.activationToken,
    firstName: 'Awa',
    lastName: 'Diallo',
    password,
  });
  record(
    'réutilisation invitation refusée',
    !reuse.ok,
    reuse.ok ? 'unexpected ok' : reuse.error
  );

  const assignable = await listAssignableRoles();
  record(
    'CORRESPONDANT exclu des rôles assignables (invite-only)',
    !assignable.some((r) => r.id === 'CORRESPONDANT'),
    assignable.map((r) => r.id).join(',')
  );

  const corrPerms = await getRolePermissionMap('CORRESPONDANT');
  const adminPerms = await getRolePermissionMap('ASSISTANT');
  record(
    'CORRESPONDANT sans permissions admin',
    !corrPerms['admin.platform'] &&
      !corrPerms['menu.admin.users'] &&
      !corrPerms['menu.admin.organizations']
  );
  record(
    'ASSISTANT a permissions organisations',
    Boolean(
      adminPerms['menu.admin.organizations'] &&
        adminPerms['action.invitations.create'] &&
        adminPerms['admin.organizations.read']
    )
  );

  // Nettoyage
  await prisma.userInvitation.deleteMany({ where: { organizationId: orgId } });
  await prisma.user.deleteMany({ where: { organizationId: orgId } });
  await prisma.organization.delete({ where: { id: orgId } });
  if (admin.email.startsWith('admin-step2-')) {
    await prisma.user.delete({ where: { id: admin.id } }).catch(() => undefined);
  }

  const failed = results.filter((r) => !r.ok);
  console.log('\n--- résumé ---');
  console.log(`total=${results.length} ok=${results.length - failed.length} fail=${failed.length}`);
  if (failed.length) {
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
