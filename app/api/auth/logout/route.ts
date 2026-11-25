import { NextResponse } from 'next/server';
import { LEGACY_SESSION_COOKIES, SESSION_COOKIE } from '@/lib/auth/session';

const RETIRED_COOKIES = [SESSION_COOKIE, ...LEGACY_SESSION_COOKIES, 'pointage_bio_proof', 'csirt_bio_proof'];

export async function POST() {
  const res = NextResponse.json({ ok: true });
  for (const name of RETIRED_COOKIES) {
    res.cookies.set(name, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    });
  }
  return res;
}
