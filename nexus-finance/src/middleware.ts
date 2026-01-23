import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const session = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });

  const { pathname } = request.nextUrl;
  const isGuestMode = request.cookies.get('guest-mode')?.value === 'true';
  const isLoginPage = pathname === '/login';

  if (isLoginPage && (session || isGuestMode)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (!isLoginPage && !session && !isGuestMode) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.json|icon-).*)',],
};