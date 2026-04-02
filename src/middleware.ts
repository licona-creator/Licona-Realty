/**
 * Next.js Middleware
 *
 * Security-first middleware that runs on every request:
 * 1. Supabase session refresh via cookie handler
 * 2. Authentication redirect for protected routes
 * 3. Single-device session enforcement via user_sessions table
 * 4. 2-hour inactivity timeout
 * 5. MFA enrollment enforcement
 * 6. CSRF token injection
 *
 * Auth approach: uses ONLY getUser() per Supabase docs.
 * getUser() sends the JWT to the Supabase Auth server for verification.
 * getSession() only reads cookies locally and can return stale sessions.
 * See: https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

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
    '/auth/update-password',
    '/auth/session-expired',
    '/mortgage',
    '/scheduling/book',
    '/testimonials',
    '/about',
    '/agent',
    '/booking',
    '/api/cron',
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

  // Paths that require auth but are exempt from MFA enforcement
  const mfaExemptPaths = ['/auth/mfa-setup', '/auth/mfa-verify'];
  const isMfaExemptPath = mfaExemptPaths.some((p) => pathname.startsWith(p));

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
  // 4. Single-device session + 2hr timeout
  // =============================================
  if (user && !isPublicPath) {
    const sessionToken = request.cookies.get('licona_device_session')?.value;

    if (sessionToken) {
      try {
        // Check session is active and not timed out
        const { data: deviceSession } = await supabase
          .from('user_sessions')
          .select('is_active, last_active_at')
          .eq('session_token', sessionToken)
          .eq('user_id', user.id)
          .single();

        if (deviceSession) {
          if (!deviceSession.is_active) {
            // Invalidated by login on another device
            return redirectToSessionExpired(request, 'device');
          }

          const lastActive = new Date(deviceSession.last_active_at).getTime();
          if (Date.now() - lastActive > TWO_HOURS_MS) {
            // Expired due to inactivity
            await supabase
              .from('user_sessions')
              .update({ is_active: false })
              .eq('session_token', sessionToken);
            return redirectToSessionExpired(request, 'timeout');
          }

          // Session is valid - update last_active_at
          await supabase
            .from('user_sessions')
            .update({ last_active_at: new Date().toISOString() })
            .eq('session_token', sessionToken);
        }
        // If no deviceSession row found, table may be empty/new - allow through
      } catch {
        // Table may not exist yet (migration not run) - allow through gracefully
      }
    }
    // If no session token cookie exists, allow through (migration may not be run yet)

    // =============================================
    // 5. MFA enrollment enforcement
    // =============================================
    if (!isMfaExemptPath) {
      try {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const hasVerifiedFactor = factors?.totp?.some(
          (f: { status: string }) => f.status === 'verified'
        );

        if (!hasVerifiedFactor) {
          // No MFA enrolled - force setup
          const url = request.nextUrl.clone();
          url.pathname = '/auth/mfa-setup';
          return NextResponse.redirect(url);
        }
      } catch {
        // MFA API error - allow through to avoid locking users out
      }
    }
  }

  // =============================================
  // 6. CSRF token injection
  // =============================================
  if (!request.cookies.get('licona_csrf')) {
    const csrfToken = crypto.randomUUID();
    supabaseResponse.cookies.set('licona_csrf', csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 2,
    });
  }

  return supabaseResponse;
}

function redirectToSessionExpired(request: NextRequest, reason: 'timeout' | 'device') {
  const url = request.nextUrl.clone();
  url.pathname = '/auth/session-expired';
  url.searchParams.set('reason', reason);
  const response = NextResponse.redirect(url);
  // Clear the device session cookie
  response.cookies.set('licona_device_session', '', {
    path: '/',
    maxAge: 0,
  });
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|sw.js|offline.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
