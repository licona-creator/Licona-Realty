/**
 * DocuSign OAuth Initiation
 *
 * Redirects to DocuSign OAuth consent screen.
 * Uses JWT Grant for server-to-server or Auth Code Grant for user consent.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
  if (!integrationKey) {
    return NextResponse.json({ error: 'DocuSign not configured' }, { status: 500 });
  }

  const oauthBase = process.env.DOCUSIGN_OAUTH_URL || 'https://account.docusign.com';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://licona-realty-i1st.vercel.app';
  const redirectUri = `${appUrl}/api/auth/docusign/callback`;

  const params = new URLSearchParams({
    response_type: 'code',
    scope: 'signature impersonation',
    client_id: integrationKey,
    redirect_uri: redirectUri,
    state: user.id,
  });

  return NextResponse.redirect(`${oauthBase}/oauth/auth?${params}`);
}
