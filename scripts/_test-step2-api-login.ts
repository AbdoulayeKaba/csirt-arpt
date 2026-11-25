/**
 * Tests complémentaires étape 2 : API sans session + login correspondant.
 */
import { prisma } from '../lib/prisma';
import { verifyCredentialsLogin } from '../lib/auth/credentials-login';
import { getRolePermissionMap } from '../lib/services/role-permissions-admin';
import { createOrganization } from '../lib/services/organizations-admin';
import {
  acceptCorrespondentInvitation,
  createCorrespondentInvitation,
} from '../lib/services/user-invitations';

async function main() {
  const results: Array<{ name: string; ok: boolean; detail?: string }> = [];
  const record = (name: string, ok: boolean, detail?: string) => {
    results.push({ name, ok, detail });
    console.log(`[${ok ? 'OK' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
  };

  const base =
    process.env.NEXTAUTH_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    'http://localhost:3002';

  for (const path of ['/api/admin/organizations', '/api/admin/invitations']) {
    try {
      const res = await fetch(`${base}${path}`, {
        method: path.includes('invitations') ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: path.includes('invitations')
          ? JSON.stringify({ organizationId: 'x', email: 'a@b.com' })
          : undefined,
      });
      record(`API ${path} sans session → 401`, res.status === 401, `status=${res.status}`);
    } catch (e) {
      record(
        `API ${path} sans session → 401`,
        false,
        e instanceof Error ? e.message : 'fetch failed (serveur stoppé ?)'
      );
    }
  }

  const stamp = Date.now();
  const admin = await prisma.user.findFirst({
    where: { role: 'ASSISTANT', active: true, archived: false },
  });
  if (!admin) {
    record('admin pour login test', false, 'aucun ASSISTANT');
  } else {
    const org = await createOrganization({ name: `Login Org ${stamp}` }, admin.id);
    if (!org.ok) {
      record('org pour login', false, org.error);
    } else {
      const invite = await createCorrespondentInvitation(
        { organizationId: org.organization.id, email: `login-${stamp}@example.com` },
        admin.id
      );
      if (!invite.ok) {
        record('invite pour login', false, invite.error);
      } else {
        const password = 'LoginTest!23456';
        const accepted = await acceptCorrespondentInvitation({
          token: invite.activationToken,
          firstName: 'Login',
          lastName: 'Test',
          password,
        });
        record('accept pour login', accepted.ok, accepted.ok ? undefined : accepted.error);
        if (accepted.ok) {
          const login = await verifyCredentialsLogin(accepted.user.email, password);
          record(
            'connexion credentials CORRESPONDANT',
            login.ok && login.user.role === 'CORRESPONDANT',
            login.ok ? login.user.role : login.error
          );
          const perms = await getRolePermissionMap('CORRESPONDANT');
          record(
            'CORRESPONDANT ne peut pas gérer orgs',
            !perms['admin.organizations.manage'] && !perms['admin.invitations.manage']
          );

          await prisma.userInvitation.deleteMany({ where: { organizationId: org.organization.id } });
          await prisma.user.delete({ where: { id: accepted.user.id } });
          await prisma.organization.delete({ where: { id: org.organization.id } });
        }
      }
    }
  }

  const { createUser } = await import('../lib/services/users-admin');
  const blocked = await createUser(
    {
      email: `direct-${stamp}@example.com`,
      firstName: 'No',
      lastName: 'Invite',
      role: 'CORRESPONDANT',
      password: 'DirectTest!23456',
    },
    admin?.id ?? 'system'
  );
  record(
    'createUser CORRESPONDANT refusé',
    !blocked.ok && blocked.error === 'CORRESPONDANT_INVITE_ONLY',
    blocked.ok ? 'unexpected' : blocked.error
  );

  const failed = results.filter((r) => !r.ok);
  console.log(`\n--- résumé --- total=${results.length} fail=${failed.length}`);
  if (failed.length) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
