import { NextResponse } from 'next/server';
import { LEGACY_SESSION_COOKIES, SESSION_COOKIE } from '@/lib/auth/session';

const NEXT_AUTH_COOKIES = [
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
  'next-auth.csrf-token',
  '__Host-next-auth.csrf-token',
  'next-auth.callback-url',
  '__Secure-next-auth.callback-url',
];

export async function GET(req: Request) {
  const res = NextResponse.redirect(new URL('/', req.url));
  for (const name of [SESSION_COOKIE, ...LEGACY_SESSION_COOKIES, 'pointage_bio_proof']) {
    res.cookies.set(name, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    });
  }
  for (const name of NEXT_AUTH_COOKIES) {
    res.cookies.set(name, '', { path: '/', maxAge: 0 });
  }
  return res;
}
