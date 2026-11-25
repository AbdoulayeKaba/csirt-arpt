import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import { clearPortalCookie, clearStaffSessionCookies } from '@/lib/auth/portal-session';

/** Déconnexion du déclarant uniquement. La session équipe n’est pas touchée. */
export async function POST(req: Request) {
  const response = NextResponse.json({ ok: true });
  clearPortalCookie(response);
  const token = await getToken({
    req: req as Parameters<typeof getToken>[0]['req'],
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  });
  if ((token as { role?: string; invalid?: boolean } | null)?.role === 'CORRESPONDANT') {
    clearStaffSessionCookies(response);
  }
  return response;
}
