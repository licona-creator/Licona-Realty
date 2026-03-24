/**
 * Supabase Middleware Client
 *
 * Handles session refresh on every request via Next.js middleware.
 * Ensures JWT tokens in httpOnly cookies are refreshed before they expire.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh session - this is critical for keeping the JWT valid
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public routes that don't require authentication
  const publicPaths = [
    '/auth/login',
    '/auth/register',
    '/auth/reset-password',
    '/auth/callback',
    '/mortgage',        // Public mortgage calculator
    '/scheduling/book', // Public booking page
    '/testimonials',    // Public testimonials page
    '/about',           // Public agent profile page
    '/agent',           // Public agent alias
    '/booking',         // Public booking alias
    '/seo',            // Public SEO pages
    '/api/webhooks',   // Webhook endpoints (validated by signature)
    '/api/testimonials',
    '/api/mortgage',
    '/api/bookings',
  ];

  const isPublicPath = publicPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // If not authenticated and not on a public path, redirect to login
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
