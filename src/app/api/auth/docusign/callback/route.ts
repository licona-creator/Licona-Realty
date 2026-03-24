/**
 * DocuSign OAuth Callback
 *
 * Exchanges auth code for tokens and stores in user_integrations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const error = request.nextUrl.searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://licona-realty-i1st.vercel.app';

  if (error || !code || !state) {
    return NextResponse.redirect(`${appUrl}/settings?tab=integrations&error=docusign_auth_failed`);
  }

  const oauthBase = process.env.DOCUSIGN_OAUTH_URL || 'https://account.docusign.com';
  const redirectUri = `${appUrl}/api/auth/docusign/callback`;

  try {
    const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY!;
    const secretKey = process.env.DOCUSIGN_SECRET_KEY!;

    // Exchange code for tokens
    const tokenRes = await fetch(`${oauthBase}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${integrationKey}:${secretKey}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(`${appUrl}/settings?tab=integrations&error=docusign_token_failed`);
    }

    const tokens = await tokenRes.json();

    // Get user info
    const userInfoRes = await fetch(`${oauthBase}/oauth/userinfo`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = userInfoRes.ok ? await userInfoRes.json() : {};
    const account = userInfo.accounts?.[0];

    // Store in user_integrations
    const supabase = createAdminClient();
    const { error: upsertError } = await supabase
      .from('user_integrations')
      .upsert({
        user_id: state,
        provider: 'docusign',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        token_expires_at: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
        scopes: tokens.scope ? tokens.scope.split(' ') : ['signature'],
        provider_email: userInfo.email || null,
        provider_account_id: account?.account_id || process.env.DOCUSIGN_ACCOUNT_ID || null,
        metadata: {
          account_name: account?.account_name,
          base_uri: account?.base_uri,
          is_default: account?.is_default,
        },
      }, { onConflict: 'user_id,provider' });

    if (upsertError) {
      return NextResponse.redirect(`${appUrl}/settings?tab=integrations&error=docusign_save_failed`);
    }

    return NextResponse.redirect(`${appUrl}/settings?tab=integrations&success=docusign`);
  } catch {
    return NextResponse.redirect(`${appUrl}/settings?tab=integrations&error=docusign_unknown`);
  }
}
