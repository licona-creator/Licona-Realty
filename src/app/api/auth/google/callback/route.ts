/**
 * Google OAuth Callback
 *
 * Exchanges auth code for tokens and stores in user_integrations.
 * Handles Gmail + Calendar in a single Google OAuth flow.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const error = request.nextUrl.searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://licona-realty-i1st.vercel.app';

  if (error || !code || !state) {
    return NextResponse.redirect(`${appUrl}/settings?tab=integrations&error=google_auth_failed`);
  }

  const redirectUri = `${appUrl}/api/auth/google/callback`;

  try {
    // Exchange code for tokens
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(`${appUrl}/settings?tab=integrations&error=google_token_exchange_failed`);
    }

    const tokens = await tokenRes.json();

    // Get user email from Google
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = profileRes.ok ? await profileRes.json() : {};

    // Store in user_integrations
    const supabase = createAdminClient();
    const { error: upsertError } = await supabase
      .from('user_integrations')
      .upsert({
        user_id: state,
        provider: 'google',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        token_expires_at: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
        scopes: tokens.scope ? tokens.scope.split(' ') : [],
        provider_email: profile.email || null,
        provider_account_id: profile.id || null,
        metadata: {
          token_type: tokens.token_type,
          gmail_connected: true,
          calendar_connected: true,
        },
      }, { onConflict: 'user_id,provider' });

    if (upsertError) {
      return NextResponse.redirect(`${appUrl}/settings?tab=integrations&error=google_save_failed`);
    }

    return NextResponse.redirect(`${appUrl}/settings?tab=integrations&success=google`);
  } catch {
    return NextResponse.redirect(`${appUrl}/settings?tab=integrations&error=google_unknown`);
  }
}
