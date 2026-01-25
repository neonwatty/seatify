import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that are always accessible (no auth or access gate)
const PUBLIC_ROUTES = [
  '/coming-soon',
  '/api/email/webhook',
  '/api/cron',
  '/api/health',
  '/rsvp', // Guest RSVP pages (accessed via email links)
];

// Check if a path matches any public route
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  );
}

// Parse allowed testers from environment variable
// Format: comma-separated emails, e.g., "user1@example.com,user2@example.com"
function getAllowedTesters(): string[] {
  const allowedTesters = process.env.ALLOWED_TESTERS || '';
  return allowedTesters
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(email => email.length > 0);
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const pathname = request.nextUrl.pathname;

  // Check if this is a demo event route
  const isDemoRoute = pathname.includes('/events/00000000-0000-0000-0000-000000000001');

  // Always allow public routes without any checks
  if (isPublicRoute(pathname)) {
    return supabaseResponse;
  }

  // Skip Supabase auth if environment variables are not configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // Allow requests to proceed without auth checks when Supabase is not configured
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ===== ACCESS GATE =====
  // When ALLOWED_TESTERS is set, only those users can access the app
  const allowedTesters = getAllowedTesters();
  const accessGateEnabled = allowedTesters.length > 0;

  if (accessGateEnabled) {
    const userEmail = user?.email?.toLowerCase();
    const isAllowedTester = userEmail && allowedTesters.includes(userEmail);

    // If not an allowed tester, redirect to coming-soon
    // Exception: allow login/signup pages so testers can authenticate
    if (!isAllowedTester && pathname !== '/login' && pathname !== '/signup') {
      const url = request.nextUrl.clone();
      url.pathname = '/coming-soon';
      return NextResponse.redirect(url);
    }

    // If user is logged in but not allowed, redirect to coming-soon
    if (user && !isAllowedTester) {
      const url = request.nextUrl.clone();
      url.pathname = '/coming-soon';
      return NextResponse.redirect(url);
    }
  }

  // ===== STANDARD AUTH CHECKS =====

  // Protected routes - redirect to login if not authenticated
  // Exception: demo event routes are allowed without auth
  if (
    !user &&
    pathname.startsWith('/dashboard') &&
    !isDemoRoute
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect logged-in users away from auth pages
  if (
    user &&
    (pathname === '/login' || pathname === '/signup')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
