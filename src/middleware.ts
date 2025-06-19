import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const { pathname } = req.nextUrl;

    // Allow read-only access to the main page for everyone
    if (pathname === '/') {
      return NextResponse.next();
    }

    // Redirect user to change password if required,
    // but don't get them stuck in a loop.
    if (token?.passwordResetRequired && pathname !== "/account/change-password") {
      return NextResponse.redirect(new URL("/account/change-password", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Allow read-only access to main page
        if (pathname === '/') {
          return true;
        }
        
        // Protect all other routes - require authentication
        return !!token;
      },
    },
  }
);

export const config = {
  // Matcher to protect routes except for API, login, register, static files, and main page
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes - we'll handle auth there individually)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login, register (auth pages)
     */
    '/((?!api|login|register|_next/static|_next/image|favicon.ico).*)',
  ],
}; 