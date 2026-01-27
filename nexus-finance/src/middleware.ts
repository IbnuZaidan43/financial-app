import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isGuestMode = req.cookies.get('guest-mode')?.value === 'true';
  const isLoginPage = nextUrl.pathname === '/login';

  if (isLoginPage && (isLoggedIn || isGuestMode)) {
    return NextResponse.redirect(new URL('/', nextUrl));
  }

  if (!isLoginPage && !isLoggedIn && !isGuestMode) {
    return NextResponse.redirect(new URL('/login', nextUrl));
  }

  return NextResponse.next();
})

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|sw.js|favicon.ico|manifest.json|app-icons|screenshots).*)'],
};