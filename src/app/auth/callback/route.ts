/**
 * Auth Callback Route
 *
 * Handles OAuth callbacks, email confirmations, and password reset tokens.
 * Exchanges auth code for session and redirects appropriately.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type');

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Password recovery flow
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/update-password`);
      }
      // Default: redirect to dashboard
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  // If something went wrong, redirect to login with error
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
