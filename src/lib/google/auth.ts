/**
 * Google OAuth Helper
 *
 * Provides getGoogleAccessToken() for all Google API calls (Gmail, Calendar).
 * Automatically refreshes expired tokens via /api/auth/google/refresh.
 * Reads from user_integrations table (populated by OAuth callback).
 */

import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function getGoogleAccessToken(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: integration } = await supabase
    .from('user_integrations')
    .select('access_token, refresh_token, token_expires_at')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .maybeSingle();

  if (!integration) return null;

  // Check if token is expired (with 5 min buffer)
  const expiresAt = integration.token_expires_at ? new Date(integration.token_expires_at) : null;
  const isExpired = expiresAt && expiresAt.getTime() - 5 * 60 * 1000 < Date.now();

  if (isExpired && integration.refresh_token) {
    // Refresh the token directly (server-side, no HTTP call needed)
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) return null;

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

    if (!tokenRes.ok) return null;

    const tokens = await tokenRes.json();

    // Update token in database
    await supabase
      .from('user_integrations')
      .update({
        access_token: tokens.access_token,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('provider', 'google');

    return tokens.access_token;
  }

  return integration.access_token;
}
