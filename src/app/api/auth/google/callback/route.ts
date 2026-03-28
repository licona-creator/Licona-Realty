/**
 * Google OAuth Callback
 *
 * Exchanges authorization code for tokens and stores in integration_tokens.
 * Uses cookie-based Supabase auth to identify the current user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { exchangeCodeForTokens, GOOGLE_SCOPES } from '@/lib/google/auth';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://licona-realty-i1st.vercel.app';

  if (error || !code) {
    console.error('[google-callback] OAuth error or missing code:', error);
    return NextResponse.redirect(`${appUrl}/settings?tab=integrations&error=google_auth_failed`);
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Get authenticated user from Supabase cookies
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user || authError) {
      console.error('[google-callback] User not authenticated:', authError?.message);
      return NextResponse.redirect(`${appUrl}/settings?tab=integrations&error=google_auth_failed`);
    }

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Upsert into integration_tokens
    const { error: upsertError } = await supabase
      .from('integration_tokens')
      .upsert(
        {
          user_id: user.id,
          provider: 'google',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          token_type: 'Bearer',
          expires_at: expiresAt,
          scopes: GOOGLE_SCOPES,
          metadata: {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,provider' }
      );

    if (upsertError) {
      console.error('[google-callback] Failed to save tokens:', upsertError.message);
      return NextResponse.redirect(`${appUrl}/settings?tab=integrations&error=google_connection_failed`);
    }

    // Also update user_integrations for backward compatibility
    try {
      await supabase
        .from('user_integrations')
        .upsert(
          {
            user_id: user.id,
            provider: 'google',
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || null,
            token_expires_at: expiresAt,
            scopes: GOOGLE_SCOPES,
            provider_email: null,
            metadata: {
              token_type: 'Bearer',
              gmail_connected: true,
              calendar_connected: true,
            },
          },
          { onConflict: 'user_id,provider' }
        );
    } catch {
      // Best-effort backward compat - ignore errors
    }

    return NextResponse.redirect(`${appUrl}/settings?tab=integrations&connected=google`);
  } catch (err) {
    console.error('[google-callback] Token exchange failed:', err);
    return NextResponse.redirect(`${appUrl}/settings?tab=integrations&error=google_connection_failed`);
  }
}
