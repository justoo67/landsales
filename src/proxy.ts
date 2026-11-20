import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { getTokenSecret, SESSION_COOKIE_NAME } from '@/lib/jwt-secret';

/**
 * Gate the agent dashboard before a page renders. Route handlers still verify
 * the session themselves (defence in depth), this only avoids rendering shells
 * for signed-out visitors and preserves the intended destination.
 *
 * Next 16 calls this convention `proxy` (formerly `middleware`).
 */
export async function proxy(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return redirectToLogin(req);
  }

  try {
    await jwtVerify(token, getTokenSecret());
  } catch {
    return redirectToLogin(req);
  }

  return NextResponse.next();
}

function redirectToLogin(req: NextRequest) {
  const url = new URL('/login', req.url);
  url.searchParams.set('next', req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
