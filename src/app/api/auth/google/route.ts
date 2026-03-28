/**
 * Google OAuth Initiation
 *
 * Redirects authenticated user to Google OAuth consent screen.
 * Requests Gmail (read) and Calendar (read/write) access.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getGoogleAuthUrl } from '@/lib/google/auth';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL('/auth/login', process.env.NEXT_PUBLIC_APP_URL || 'https://licona-realty-i1st.vercel.app')
    );
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.error(
      '[google-oauth] No Google OAuth client ID configured.',
      'Set GOOGLE_OAUTH_CLIENT_ID in Vercel environment variables.',
    );
    return NextResponse.json(
      { error: 'Google OAuth not configured. Set GOOGLE_OAUTH_CLIENT_ID in environment.' },
      { status: 500 }
    );
  }

  const url = getGoogleAuthUrl();
  return NextResponse.redirect(url);
}
