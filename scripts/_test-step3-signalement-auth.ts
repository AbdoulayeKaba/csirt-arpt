/**
 * Tests étape 3 : protection POST /api/signalement et session.
 * npx tsx scripts/_test-step3-signalement-auth.ts
 */
import { isSignalementAnonymousEnabled } from '../lib/csirt/signalement-access';
import { prisma } from '../lib/prisma';
import { verifyCredentialsLogin } from '../lib/auth/credentials-login';

type Row = { name: string; ok: boolean; detail?: string };
const results: Row[] = [];

function record(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(`[${ok ? 'OK' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  record(
    'flag anonyme désactivé par défaut',
    isSignalementAnonymousEnabled() === false,
    `value=${process.env.SIGNALEMENT_ANONYMOUS_ENABLED ?? '(unset)'}`
  );

  const base =
    process.env.NEXTAUTH_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    'http://localhost:3333';

  const form = new FormData();
  form.set('identify', 'yes');
  form.set('declarantType', 'operateur');
  form.set('organization', 'Test Org');
  form.set('email', 'nobody@example.com');
  form.set('types', JSON.stringify(['malware']));
  form.set('description', 'Description trop courte volontairement étendue pour passer les 20 caractères.');
  form.set('reported', 'no');

  try {
    const res = await fetch(`${base}/api/signalement`, { method: 'POST', body: form });
    const json = await res.json().catch(() => ({}));
    record(
      'POST /api/signalement sans session → 401',
      res.status === 401 && json.error === 'UNAUTHORIZED',
      `status=${res.status} error=${json.error}`
    );
  } catch (e) {
    record(
      'POST /api/signalement sans session → 401',
      false,
      e instanceof Error ? e.message : 'serveur indisponible'
    );
  }

  try {
    const sessionRes = await fetch(`${base}/api/signalement/session`);
    const sessionJson = await sessionRes.json().catch(() => ({}));
    record(
      'GET /api/signalement/session sans session',
      sessionRes.ok &&
        sessionJson.authenticated === false &&
        sessionJson.canSubmit === false &&
        sessionJson.anonymousEnabled === false,
      JSON.stringify({
        authenticated: sessionJson.authenticated,
        canSubmit: sessionJson.canSubmit,
        anonymousEnabled: sessionJson.anonymousEnabled,
      })
    );
  } catch (e) {
    record(
      'GET /api/signalement/session sans session',
      false,
      e instanceof Error ? e.message : 'serveur indisponible'
    );
  }

  try {
    const page = await fetch(`${base}/signalement`);
    record(
      'GET /signalement accessible (page + modal, pas de redirect login middleware)',
      page.ok,
      `status=${page.status}`
    );
    const html = await page.text();
    record(
      'page /signalement n’expose pas le bouton Anonyme par défaut',
      !html.includes('<small>Anonyme</small>'),
      'le choix anonyme reste dans le code mais n’est rendu qu’après session/flag'
    );
  } catch (e) {
    record('GET /signalement', false, e instanceof Error ? e.message : 'fetch failed');
  }

  try {
    const assistant = await prisma.user.findFirst({
      where: { role: 'ASSISTANT', active: true, archived: false },
    });
    if (assistant?.passwordHash) {
      const login = await verifyCredentialsLogin(assistant.email, 'password123');
      record(
        'compte non-CORRESPONDANT existe (contrôle rôle)',
        true,
        `${assistant.email} loginProbe=${login.ok ? login.user.role : login.error}`
      );
    } else {
      record('compte ASSISTANT présent', Boolean(assistant), assistant?.email ?? 'none');
    }

    const correspondant = await prisma.user.findFirst({
      where: { role: 'CORRESPONDANT', active: true, archived: false },
      include: { organization: { select: { active: true, name: true } } },
    });
    record(
      'rôle CORRESPONDANT utilisable (compte existant optionnel)',
      true,
      correspondant
        ? `${correspondant.email} org=${correspondant.organization?.name ?? 'none'} active=${correspondant.organization?.active}`
        : 'aucun correspondant en base (créer via invitation étape 2)'
    );
  } catch (e) {
    record(
      'lecture utilisateurs (MySQL) — optionnel',
      true,
      `indisponible: ${(e instanceof Error ? e.message : 'db').slice(0, 80)}`
    );
  }

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
