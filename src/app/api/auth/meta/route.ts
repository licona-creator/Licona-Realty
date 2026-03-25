/**
 * Meta OAuth Initiation
 *
 * Redirects to Facebook OAuth consent screen for Instagram + Facebook access.
 * Env vars: META_APP_ID, META_APP_SECRET (set in Vercel)
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const META_AUTH_URL = 'https://www.facebook.com/v25.0/dialog/oauth';

const SCOPES = [
  'instagram_basic',
  'instagram_content_publish',
  'instagram_manage_insights',
  'instagram_manage_comments',
  'pages_show_list',
  'pages_manage_posts',
  'pages_read_engagement',
  'business_management',
].join(',');

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clientId = process.env.META_APP_ID;
  if (!clientId) {
    return NextResponse.json({
      error: 'Meta OAuth not configured. META_APP_ID must be set in Vercel environment variables.',
    }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_SITE_URL
    || 'https://licona-realty-i1st.vercel.app';
  const redirectUri = `${appUrl}/api/auth/meta/callback`;

  // Use the user ID as state for CSRF protection and to identify the user in the callback
  const state = user.id;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPES,
    response_type: 'code',
    state,
  });

  return NextResponse.redirect(`${META_AUTH_URL}?${params}`);
}
