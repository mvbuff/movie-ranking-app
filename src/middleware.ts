export { default } from "next-auth/middleware";

export const config = {
  // Matcher to protect all routes except for the ones required for authentication
  // and user registration.
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js authentication routes)
     * - login (the login page)
     * - register (the registration page)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|login|register|_next/static|_next/image|favicon.ico).*)',
  ],
}; 