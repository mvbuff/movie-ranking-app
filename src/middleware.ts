export { default } from "next-auth/middleware";

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