/**
 * Next.js Middleware
 *
 * Security-first middleware that runs on every request:
 * 1. Supabase session refresh via cookie handler
 * 2. Authentication redirect for protected routes
 * 3. Single-device session enforcement via user_sessions table
 * 4. 4-hour inactivity timeout
 * 5. MFA enforcement with 4-hour grace period (mfa_verified_at cookie)
 * 6. CSRF token injection
 *
 * Auth approach: uses ONLY getUser() per Supabase docs.
 * getUser() sends the JWT to the Supabase Auth server for verification.
 * getSession() only reads cookies locally and can return stale sessions.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const FOUR_HOURS_S = 4 * 60 * 60;

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
  // 4. Single-device session + 4hr inactivity timeout
  // =============================================
  if (user && !isPublicPath) {
    const sessionToken = request.cookies.get('licona_device_session')?.value;

    if (sessionToken) {
      try {
        const { data: deviceSession } = await supabase
          .from('user_sessions')
          .select('is_active, last_active_at')
          .eq('session_token', sessionToken)
          .eq('user_id', user.id)
          .single();

        if (deviceSession) {
          if (!deviceSession.is_active) {
            return redirectToLogin(request);
          }

          const lastActive = new Date(deviceSession.last_active_at).getTime();
          if (Date.now() - lastActive > FOUR_HOURS_MS) {
            await supabase
              .from('user_sessions')
              .update({ is_active: false })
              .eq('session_token', sessionToken);
            return redirectToLogin(request);
          }

          // Session valid - refresh the activity timestamp (resets the 4hr clock)
          await supabase
            .from('user_sessions')
            .update({ last_active_at: new Date().toISOString() })
            .eq('session_token', sessionToken);
        }
      } catch {
        // Table may not exist yet - allow through gracefully
      }
    }

    // =============================================
    // 5. MFA enforcement with 4-hour grace period
    // =============================================
    if (!isMfaExemptPath) {
      // Check if MFA was verified recently (4hr grace window via cookie)
      const mfaVerifiedAt = request.cookies.get('mfa_verified_at')?.value;
      const mfaStillValid = mfaVerifiedAt && (Date.now() - parseInt(mfaVerifiedAt, 10)) < FOUR_HOURS_MS;

      if (!mfaStillValid) {
        try {
          const { data: factors } = await supabase.auth.mfa.listFactors();
          const hasVerifiedFactor = factors?.totp?.some(
            (f: { status: string }) => f.status === 'verified'
          );

          if (!hasVerifiedFactor) {
            const url = request.nextUrl.clone();
            url.pathname = '/auth/mfa-setup';
            return NextResponse.redirect(url);
          }

          // MFA is enrolled but the grace period expired - require re-verification
          // Only redirect to verify if user is NOT already on the mfa-verify page
          if (!pathname.startsWith('/auth/mfa-verify')) {
            const url = request.nextUrl.clone();
            url.pathname = '/auth/mfa-verify';
            return NextResponse.redirect(url);
          }
        } catch {
          // MFA API error - allow through to avoid locking users out
        }
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
      maxAge: FOUR_HOURS_S,
    });
  }

  return supabaseResponse;
}

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = '/auth/login';
  url.search = '';
  const response = NextResponse.redirect(url);
  // Clear session and MFA cookies
  response.cookies.set('licona_device_session', '', { path: '/', maxAge: 0 });
  response.cookies.set('mfa_verified_at', '', { path: '/', maxAge: 0 });
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|sw.js|offline.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
