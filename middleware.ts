import { convexAuthNextjsMiddleware, createRouteMatcher, nextjsMiddlewareRedirect } from '@convex-dev/auth/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/events(.*)',
  '/reports(.*)',
  '/settings(.*)',
  '/checkin(.*)',
  '/scan(.*)',
  '/update-password(.*)',
])

const isAuthRoute = createRouteMatcher(['/login'])

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const isAuthenticated = await convexAuth.isAuthenticated()

  if (isProtectedRoute(request) && !isAuthenticated) {
    return nextjsMiddlewareRedirect(request, '/login')
  }

  if (isAuthRoute(request) && isAuthenticated) {
    return nextjsMiddlewareRedirect(request, '/dashboard')
  }

  if (request.nextUrl.pathname === '/') {
    return nextjsMiddlewareRedirect(request, isAuthenticated ? '/dashboard' : '/login')
  }
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
