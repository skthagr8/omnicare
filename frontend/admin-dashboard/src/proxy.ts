import { NextResponse, type NextRequest } from 'next/server';

const PORTAL = process.env.NEXT_PUBLIC_PORTAL ?? 'admin';
const COOKIE = `omnicare_${PORTAL}_session`;

// Public pages for this portal. Remove '/register' for admin and caregiver portals.
const PUBLIC_PATHS = ['/login'];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const role = req.cookies.get(COOKIE)?.value;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const hasValidHint = role === PORTAL;

  if (!hasValidHint && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (hasValidHint && isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next internals and static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};