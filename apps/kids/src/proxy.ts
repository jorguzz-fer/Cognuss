import { getSessionCookie } from 'better-auth/cookies';
import { NextResponse, type NextRequest } from 'next/server';
import { buildCsp } from './lib/csp';

const PROTECTED = [
  '/inicio',
  '/escolher',
  '/escola',
  '/professor',
  '/estudar',
  '/plataforma',
  '/seguranca',
];

// CSP por requisição e checagem otimista de sessão. A autorização de verdade é no servidor
// (requireTenant, requirePlatformAdmin) e no RLS por instituição.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const needsSession = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + '/'));
  let res: NextResponse;
  if (needsSession && !getSessionCookie(request, { cookiePrefix: 'kids' })) {
    const url = new URL('/entrar', request.url);
    url.searchParams.set('next', pathname + search);
    res = NextResponse.redirect(url);
  } else {
    res = NextResponse.next();
  }
  res.headers.set(
    'Content-Security-Policy',
    buildCsp({
      storageEndpoint: process.env.STORAGE_ENDPOINT,
      dev: process.env.NODE_ENV === 'development',
    }),
  );
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|woff2)$).*)'],
};
