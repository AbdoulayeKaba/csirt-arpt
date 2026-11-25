import { SignJWT, jwtVerify } from 'jose';
import type { NextResponse } from 'next/server';
import { getAuthSecret } from '@/lib/auth/session';

/** Session du déclarant / correspondant. Indépendante du cookie NextAuth de l’équipe. */
export const PORTAL_COOKIE = 'csirt_portal';

export const STAFF_SESSION_COOKIE_NAMES = [
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
  'next-auth.callback-url',
  '__Secure-next-auth.callback-url',
] as const;

export type PortalTokenPayload = {
  sub: string;
  email: string;
  firstName: string;
  lastName: string;
  department: string;
  sessionVersion?: number;
  exp: number;
};

function cookieBase(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
  };
}

export async function signPortalToken(payload: PortalTokenPayload): Promise<string> {
  return new SignJWT({
    email: payload.email,
    firstName: payload.firstName,
    lastName: payload.lastName,
    department: payload.department,
    role: 'CORRESPONDANT',
    ...(typeof payload.sessionVersion === 'number' ? { sessionVersion: payload.sessionVersion } : {}),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(payload.exp)
    .sign(getAuthSecret());
}

export async function verifyPortalToken(token: string): Promise<PortalTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret(), { algorithms: ['HS256'] });
    const sub = typeof payload.sub === 'string' ? payload.sub : '';
    const email = typeof payload.email === 'string' ? payload.email : '';
    const exp = typeof payload.exp === 'number' ? payload.exp : 0;
    if (!sub || !email || exp <= Math.floor(Date.now() / 1000)) return null;
    if (payload.role !== 'CORRESPONDANT') return null;
    return {
      sub,
      email,
      firstName: typeof payload.firstName === 'string' ? payload.firstName : '',
      lastName: typeof payload.lastName === 'string' ? payload.lastName : '',
      department: typeof payload.department === 'string' ? payload.department : '',
      sessionVersion: typeof payload.sessionVersion === 'number' ? payload.sessionVersion : undefined,
      exp,
    };
  } catch {
    return null;
  }
}

export async function portalJwtFromStaffToken(token: {
  sub?: string | null;
  email?: string | null;
  firstName?: unknown;
  lastName?: unknown;
  department?: unknown;
  sessionVersion?: unknown;
  exp?: number | null;
}): Promise<{ token: string; exp: number } | null> {
  const sub = token.sub?.trim() ?? '';
  const email = token.email?.trim() ?? '';
  if (!sub || !email) return null;
  const exp =
    typeof token.exp === 'number' && token.exp > Math.floor(Date.now() / 1000)
      ? token.exp
      : Math.floor(Date.now() / 1000) + 12 * 60 * 60;
  return { token: await signPortalToken({
    sub,
    email,
    firstName: typeof token.firstName === 'string' ? token.firstName : '',
    lastName: typeof token.lastName === 'string' ? token.lastName : '',
    department: typeof token.department === 'string' ? token.department : '',
    sessionVersion: typeof token.sessionVersion === 'number' ? token.sessionVersion : undefined,
    exp,
  }), exp };
}

export function applyPortalCookie(response: NextResponse, token: string, exp: number) {
  const maxAge = Math.max(60, exp - Math.floor(Date.now() / 1000));
  response.cookies.set(PORTAL_COOKIE, token, {
    ...cookieBase(process.env.NODE_ENV === 'production'),
    maxAge,
  });
}

export function clearPortalCookie(response: NextResponse) {
  response.cookies.set(PORTAL_COOKIE, '', {
    ...cookieBase(process.env.NODE_ENV === 'production'),
    maxAge: 0,
  });
}

export function clearStaffSessionCookies(response: NextResponse) {
  for (const name of STAFF_SESSION_COOKIE_NAMES) {
    response.cookies.set(name, '', {
      ...cookieBase(name.startsWith('__Secure-') || process.env.NODE_ENV === 'production'),
      maxAge: 0,
    });
  }
}

export function requestHasStaffSessionCookie(cookieNames: Iterable<string>) {
  const present = new Set(cookieNames);
  return STAFF_SESSION_COOKIE_NAMES.some((name) => present.has(name));
}
