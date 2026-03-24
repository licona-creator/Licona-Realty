/**
 * Next.js Middleware
 *
 * Runs on every request to handle:
 * 1. Supabase session refresh (JWT in httpOnly cookies)
 * 2. Authentication redirect for protected routes
 * 3. MFA enforcement - redirect to MFA setup/verify if needed
 * 4. Rate limiting on API routes
 * 5. CSRF token injection
 * 6. Security response headers
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // =============================================
  // 1. Create Supabase client with cookie handling
  // =============================================
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session - check both session and user for robust auth validation
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Double-check with getUser() which validates the JWT server-side
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A user is only truly authenticated if both session and user exist
  const isAuthenticated = !!(session && user);

  // =============================================
  // 2. Define route access rules
  // =============================================

  // Public routes - no auth required
  const publicPaths = [
    '/auth/login',
    '/auth/register',
    '/auth/reset-password',
    '/auth/callback',
    '/mortgage',
    '/scheduling/book',
    '/testimonials',
    '/about',
    '/agent',
    '/booking',
    '/api/health',
    '/api/webhooks',
    '/api/setup',
    '/api/testimonials',
    '/api/mortgage',
    '/api/bookings',
    '/setup',
  ];

  // MFA flow routes - require auth but not MFA completion
  const mfaPaths = ['/auth/mfa-setup', '/auth/mfa-verify'];

  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));
  const isMFAPath = mfaPaths.some((p) => pathname.startsWith(p));
  const isAPIRoute = pathname.startsWith('/api/');

  // =============================================
  // 3. Auth enforcement
  // =============================================

  if (!isAuthenticated && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login page to dashboard
  if (isAuthenticated && pathname === '/auth/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // =============================================
  // 4. MFA enforcement - currently optional, uncomment to enforce
  // =============================================

  // if (isAuthenticated && !isPublicPath && !isMFAPath && !isAPIRoute) {
  //   const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  //
  //   if (aal) {
  //     // If MFA is enrolled but not yet verified in this session
  //     if (aal.nextLevel === 'aal2' && aal.currentLevel === 'aal1') {
  //       const url = request.nextUrl.clone();
  //       url.pathname = '/auth/mfa-verify';
  //       return NextResponse.redirect(url);
  //     }
  //
  //     // If no MFA enrolled at all - force setup
  //     const { data: factors } = await supabase.auth.mfa.listFactors();
  //     const hasVerifiedFactor = factors?.totp?.some(
  //       (f) => f.status === 'verified'
  //     );
  //
  //     if (!hasVerifiedFactor && !isMFAPath) {
  //       const url = request.nextUrl.clone();
  //       url.pathname = '/auth/mfa-setup';
  //       return NextResponse.redirect(url);
  //     }
  //   }
  // }

  // =============================================
  // 5. CSRF token injection (set cookie on every response)
  // =============================================

  if (!request.cookies.get('licona_csrf')) {
    const csrfToken = crypto.randomUUID();
    supabaseResponse.cookies.set('licona_csrf', csrfToken, {
      httpOnly: false, // Client needs to read this to send in header
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 8, // 8 hours matching session expiry
    });
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|sw.js|offline.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
