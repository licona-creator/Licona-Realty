/**
 * Auth Callback Route
 *
 * Handles OAuth callbacks, email confirmations, and password reset tokens.
 * Supports both PKCE flow (code param) and implicit/magic-link flow
 * (token_hash + type params) used by older Supabase email templates.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type');
  const tokenHash = searchParams.get('token_hash');

  const supabase = await createServerSupabaseClient();

  // PKCE flow: exchange authorization code for session
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/update-password`);
      }
      return NextResponse.redirect(`${origin}/dashboard`);
    }

    console.error('[auth/callback] Code exchange failed:', error.message);
  }

  // Implicit / magic-link flow: verify OTP via token_hash
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as 'recovery' | 'email' | 'signup',
    });

    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/update-password`);
      }
      return NextResponse.redirect(`${origin}/dashboard`);
    }

    console.error('[auth/callback] Token hash verification failed:', error.message);
  }

  // If something went wrong, redirect to login with error
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
