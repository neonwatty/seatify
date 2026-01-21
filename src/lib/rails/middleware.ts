import { NextResponse, type NextRequest } from 'next/server'

const TOKEN_COOKIE_NAME = 'rails_jwt_token';

export async function updateSession(request: NextRequest) {
  // Check for demo event route FIRST - allow without any auth
  const pathname = request.nextUrl.pathname;
  if (pathname.includes('/events/00000000-0000-0000-0000-000000000001')) {
    // Forward demo mode via request header so layouts can access it
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-demo-mode', 'true');
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Check for JWT token in cookies
  const token = request.cookies.get(TOKEN_COOKIE_NAME)?.value;
  const isAuthenticated = !!token;

  // Protected routes - redirect to login if not authenticated
  if (
    !isAuthenticated &&
    request.nextUrl.pathname.startsWith('/dashboard')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect logged-in users away from auth pages
  if (
    isAuthenticated &&
    (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next({
    request,
  })
}
