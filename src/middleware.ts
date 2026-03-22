/**
 * Next.js Middleware
 *
 * Runs on every request to handle:
 * 1. Supabase session refresh (JWT in httpOnly cookies)
 * 2. Authentication redirect for protected routes
 * 3. Rate limiting headers
 */

import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Match all paths except static files, images, and favicon
    '/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|sw.js|offline.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
