/**
 * Next.js Middleware
 *
 * Runs on every request to handle:
 * 1. Supabase session refresh via cookie handler
 * 2. Authentication redirect for protected routes
 * 3. CSRF token injection
 *
 * Auth approach: uses ONLY getUser() per Supabase docs.
 * getUser() sends the JWT to the Supabase Auth server for verification.
 * getSession() only reads cookies locally and can return stale sessions.
 * See: https://supabase.com/docs/guides/auth/server-side/nextjs
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

  // IMPORTANT: Use ONLY getUser() - never getSession() in middleware.
  // getUser() verifies the JWT with the Supabase Auth server.
  // getSession() only reads cookies locally and can return stale/invalid sessions.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // =============================================
  // 2. Define public routes (no auth required)
  // =============================================
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
    '/api/debug',
    '/api/webhooks',
    '/api/setup',
    '/api/testimonials',
    '/api/mortgage',
    '/api/bookings',
    '/api/auth/google',
    '/api/auth/docusign',
    '/api/auth/canva',
    '/api/auth/meta',
    '/setup',
  ];

  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));

  // =============================================
  // 3. Auth enforcement
  // =============================================

  // No user and not a public route: redirect to login
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  // Authenticated user on login page: redirect to dashboard
  if (user && pathname === '/auth/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // =============================================
  // 4. CSRF token injection
  // =============================================
  if (!request.cookies.get('licona_csrf')) {
    const csrfToken = crypto.randomUUID();
    supabaseResponse.cookies.set('licona_csrf', csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 8,
    });
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|sw.js|offline.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
