import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { isAuthDisabled } from '@/lib/auth/open-access';
import {
  applyPortalCookie,
  clearStaffSessionCookies,
  portalJwtFromStaffToken,
  requestHasStaffSessionCookie,
} from '@/lib/auth/portal-session';

function withSecurityHeaders(response: NextResponse, pathname: string) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  }
  if (pathname.toLowerCase().endsWith('.svg')) {
    response.headers.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  }
  return response;
}

/** Premiers segments réservés — ne jamais rewriter vers le catch-all éditorial. */
const RESERVED_TOP_SEGMENTS = new Set([
  '_next',
  '_site',
  'site-cms',
  'api',
  'dg',
  'dashboard',
  'account',
  'login',
  'logout',
  'forgot-password',
  'invitation',
  'abonnement',
  'accessibilite',
  'accompagnements',
  'actualites',
  'agrements',
  'bonnes-pratiques',
  'confidentialite',
  'contacts',
  'csirt',
  'csirt-arpt',
  'espace-confiance',
  'espace-rssi',
  'experts-auditeurs',
  'formations',
  'front',
  'guides',
  'historique',
  'mediatheque',
  'mentions-legales',
  'panorama-menaces',
  'plan-du-site',
  'publications',
  'rapports',
  'recherche',
  'reglementations',
  'signalement',
  'veille-vulnerabilites',
]);

function shouldRewriteToSiteCatchAll(pathname: string) {
  if (!pathname || pathname === '/') return false;
  if (pathname.includes('.')) return false;
  const first = pathname.split('/').filter(Boolean)[0]?.toLowerCase();
  if (!first || RESERVED_TOP_SEGMENTS.has(first)) return false;
  return true;
}

async function detachCorrespondentStaffSession(req: NextRequest) {
  if (!requestHasStaffSessionCookie(req.cookies.getAll().map((cookie) => cookie.name))) return null;
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  });
  const staffToken = token as { invalid?: boolean; role?: string };
  if (!token || staffToken.invalid || staffToken.role !== 'CORRESPONDANT') return null;

  const { pathname, origin } = req.nextUrl;
  const isPrivateApp =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/dg');
  const response = isPrivateApp ? NextResponse.redirect(new URL('/login', origin)) : NextResponse.next();
  const portal = await portalJwtFromStaffToken(token);
  if (portal && !req.cookies.get('csirt_portal')?.value) {
    applyPortalCookie(response, portal.token, portal.exp);
  }
  clearStaffSessionCookies(response);
  return response;
}

export async function middleware(req: NextRequest) {
  return withSecurityHeaders(await routeRequest(req), req.nextUrl.pathname);
}

async function routeRequest(req: NextRequest) {
  const { pathname, origin } = req.nextUrl;

  const retiredPrefixes = [
    '/dg/plan',
    '/dg/appointments',
    '/appointments',
    '/dg/availability',
    '/dg/workspace',
    '/dg/activity',
    '/dg/notifications',
    '/dg/admin/appointment-constraints',
    '/dg/admin/referentials',
    '/api/appointments',
    '/api/dg/appointments',
    '/api/dg/room-reservations',
    '/api/dg/availability',
    '/api/dg/calendar-sync',
    '/api/dg/calendar-overlays',
    '/api/ai/appointments',
    '/api/ai/agenda',
    '/api/ai/dga',
    '/api/admin/appointment-constraints',
    '/api/dashboard/assistant',
    '/api/dashboard/dg',
    '/api/workspace',
    '/api/cron/appointment-expiry',
    '/api/cron/reminders',
    '/api/cron/mission-status',
    '/api/cron/mail-deadlines',
    '/api/dg/activity',
    '/api/dg/search',
    '/api/dg/notifications',
    '/api/admin/referentials/schedule',
    '/pointage',
    '/admissions',
    '/admin/school',
    '/admin/admissions',
    '/admin/parametrage',
    '/admin/employes',
    '/admin/lieux',
    '/admin/securite',
    '/arpt',
    '/portal',
    '/front/admissions',
    '/api/school',
    '/api/admissions',
    '/api/attendance',
    '/api/arpt',
    '/api/admin/employees',
    '/api/admin/leaves',
    '/api/admin/public-holidays',
    '/api/dashboard/attendance',
    '/api/portal',
    '/api/locations',
    '/api/leaves',
    '/api/employees',
    '/api/admin/audit-logs',
  ];
  if (retiredPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'GONE' }, { status: 410 });
    }
    return NextResponse.redirect(new URL('/dashboard', origin));
  }

  // Pages CMS dynamiques : rewrite interne (évite que `[...slug]` racine mange `/api/*`)
  if (shouldRewriteToSiteCatchAll(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = `/site-cms${pathname}`;
    return NextResponse.rewrite(url);
  }

  if (isAuthDisabled()) return NextResponse.next();

  const detached = await detachCorrespondentStaffSession(req);
  if (detached) return detached;

  const isPublicAsset = /\.(?:png|jpe?g|svg|webp|gif|ico|css|js|woff2?|map)$/i.test(pathname);

  const isPublicRoute =
    isPublicAsset ||
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/logout') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/invitation') ||
    pathname.startsWith('/api/invitation') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/api/cron/news-sync') ||
    pathname.startsWith('/api/cron/newsletter-campaigns') ||
    pathname.startsWith('/api/platform/branding') ||
    pathname.startsWith('/api/assistant') ||
    pathname.startsWith('/csirt') ||
    pathname.startsWith('/veille-vulnerabilites') ||
    pathname.startsWith('/abonnement') ||
    pathname.startsWith('/api/abonnement') ||
    pathname.startsWith('/espace-confiance') ||
    pathname.startsWith('/contacts') ||
    pathname === '/api/contact' ||
    pathname.startsWith('/signalement') ||
    pathname.startsWith('/api/signalement') ||
    pathname.startsWith('/reglementations') ||
    pathname.startsWith('/accompagnements') ||
    pathname.startsWith('/publications') ||
    pathname.startsWith('/bonnes-pratiques') ||
    pathname.startsWith('/experts-auditeurs') ||
    pathname.startsWith('/agrements') ||
    pathname.startsWith('/formations') ||
    pathname.startsWith('/espace-rssi') ||
    pathname.startsWith('/recherche') ||
    pathname.startsWith('/actualites') ||
    pathname.startsWith('/mediatheque') ||
    pathname.startsWith('/historique') ||
    pathname.startsWith('/panorama-menaces') ||
    pathname.startsWith('/rapports') ||
    pathname.startsWith('/guides') ||
    pathname.startsWith('/mentions-legales') ||
    pathname.startsWith('/confidentialite') ||
    pathname.startsWith('/accessibilite') ||
    pathname.startsWith('/plan-du-site');

  if (isPublicRoute) return NextResponse.next();

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  });

  if (!token || (token as { invalid?: boolean }).invalid) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    // Espace connecté uniquement — le reste (contenu du site, URLs inconnues) reste public → 404.
    const isPrivateApp =
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/account') ||
      pathname.startsWith('/dg');

    if (isPrivateApp) {
      return NextResponse.redirect(new URL('/login', origin));
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|placeholder).*)'],
};
