/**
 * Google OAuth Helper
 *
 * Core auth helper for all Google integrations.
 * Handles OAuth URL generation, token exchange, refresh, and token retrieval.
 * Uses raw fetch calls to Google's token endpoint (no NextAuth).
 */

import { SupabaseClient } from '@supabase/supabase-js';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

const REDIRECT_URI =
  (process.env.NEXT_PUBLIC_APP_URL || 'https://licona-realty-i1st.vercel.app') +
  '/api/auth/google/callback';

/**
 * Build the full Google OAuth consent URL.
 */
export function getGoogleAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange an authorization code for access and refresh tokens.
 * Google requires application/x-www-form-urlencoded, NOT JSON.
 */
export async function exchangeCodeForTokens(
  code: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Google token exchange failed (${res.status}): ${error}`);
  }

  return res.json();
}

/**
 * Refresh an expired access token using the stored refresh token.
 * Google requires application/x-www-form-urlencoded.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
    grant_type: 'refresh_token',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Google token refresh failed (${res.status}): ${error}`);
  }

  return res.json();
}

/**
 * Get a valid Google access token for the current user.
 * Handles automatic refresh if the token is expired or about to expire.
 * Returns null if the user has not connected Google.
 */
export async function getGoogleAccessToken(
  supabase: SupabaseClient
): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: token, error } = await supabase
      .from('integration_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .single();

    if (error || !token) return null;

    // Check if token is expired or will expire within 5 minutes
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    const expiresAt = token.expires_at ? new Date(token.expires_at) : null;

    if (expiresAt && expiresAt < fiveMinutesFromNow) {
      if (!token.refresh_token) {
        // No refresh token available, delete stale row
        await supabase
          .from('integration_tokens')
          .delete()
          .eq('id', token.id);
        return null;
      }

      try {
        const refreshed = await refreshAccessToken(token.refresh_token);

        const newExpiresAt = new Date(
          Date.now() + refreshed.expires_in * 1000
        ).toISOString();

        await supabase
          .from('integration_tokens')
          .update({
            access_token: refreshed.access_token,
            expires_at: newExpiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', token.id);

        return refreshed.access_token;
      } catch (refreshError) {
        // Refresh failed (token revoked, etc.) - clean up
        console.error('Google token refresh failed:', refreshError);
        await supabase
          .from('integration_tokens')
          .delete()
          .eq('id', token.id);
        return null;
      }
    }

    return token.access_token;
  } catch (err) {
    console.error('Error getting Google access token:', err);
    return null;
  }
}
