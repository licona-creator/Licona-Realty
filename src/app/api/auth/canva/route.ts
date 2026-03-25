/**
 * Canva Connect OAuth Initiation
 *
 * Redirects to Canva OAuth consent screen.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCanvaOAuthUrl } from '@/lib/canva/client';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://licona-realty-i1st.vercel.app';
  const redirectUri = `${appUrl}/api/auth/canva/callback`;

  try {
    const url = getCanvaOAuthUrl(redirectUri);
    // Append state for user identification
    return NextResponse.redirect(`${url}&state=${user.id}`);
  } catch {
    return NextResponse.json({ error: 'Canva not configured' }, { status: 500 });
  }
}
