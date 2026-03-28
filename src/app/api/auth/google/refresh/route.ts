/**
 * Google Token Refresh
 *
 * Refreshes an expired Google OAuth access token using the stored refresh_token.
 * Called automatically when getGoogleAccessToken() detects expiry.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: integration } = await supabase
    .from('user_integrations')
    .select('refresh_token')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .maybeSingle();

  if (!integration?.refresh_token) {
    return NextResponse.json({ error: 'No refresh token available' }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 500 });
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: integration.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    return NextResponse.json({ error: 'Token refresh failed', detail: err }, { status: 502 });
  }

  const tokens = await tokenRes.json();

  await supabase
    .from('user_integrations')
    .update({
      access_token: tokens.access_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('provider', 'google');

  return NextResponse.json({
    access_token: tokens.access_token,
    expires_in: tokens.expires_in,
  });
}
