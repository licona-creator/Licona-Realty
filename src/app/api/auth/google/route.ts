/**
 * Google OAuth Initiation
 *
 * Redirects to Google OAuth consent screen for Gmail + Calendar access.
 * Supports both GOOGLE_OAUTH_CLIENT_ID and GOOGLE_CLIENT_ID env vars.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.error(
      '[google-oauth] Neither GOOGLE_OAUTH_CLIENT_ID nor GOOGLE_CLIENT_ID is set.',
      'Env keys containing GOOGLE:',
      Object.keys(process.env).filter(k => k.toUpperCase().includes('GOOGLE')),
    );
    return NextResponse.json({
      error: 'Google OAuth not configured. GOOGLE_OAUTH_CLIENT_ID must be set in Vercel environment variables.',
    }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    || process.env.NEXT_PUBLIC_SITE_URL
    || 'https://licona-realty-i1st.vercel.app';
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state: user.id,
  });

  return NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params}`);
}
