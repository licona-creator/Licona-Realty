/**
 * Supabase Server Client
 *
 * Used for server-side operations (API routes, Server Components, middleware).
 * Uses cookie-based session management for httpOnly secure JWT storage.
 * Service role client available for admin operations - NEVER exposed to frontend.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client for server-side operations with cookie-based auth.
 * This client respects RLS policies and uses the authenticated user's JWT.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method is called from a Server Component
          // where cookies cannot be set. This can be safely ignored
          // if middleware is refreshing user sessions.
        }
      },
    },
  });
}

/**
 * Create a Supabase admin client using the service role key.
 * ONLY for server-side admin operations (edge functions, API routes).
 * NEVER import or use this in client-side code.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Admin operations require the service role key.'
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
