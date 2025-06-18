import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const { pathname } = req.nextUrl;

    // Redirect user to change password if required,
    // but don't get them stuck in a loop.
    if (token?.passwordResetRequired && pathname !== "/account/change-password") {
      return NextResponse.redirect(new URL("/account/change-password", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token, // Protect all matched routes
    },
  }
);

export const config = {
  // Matcher to protect all routes except for the ones starting with /api,
  // login, register, etc.
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|login|register|_next/static|_next/image|favicon.ico).*)',
  ],
}; 