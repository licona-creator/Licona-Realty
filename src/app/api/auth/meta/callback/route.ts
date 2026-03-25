/**
 * Meta OAuth Callback
 *
 * Exchanges auth code for a long-lived access token and stores
 * the token + Instagram business account ID in user_integrations.
 * Env vars: META_APP_ID, META_APP_SECRET (set in Vercel)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/security/logger';

const GRAPH_BASE = 'https://graph.facebook.com/v25.0';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const error = request.nextUrl.searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    || process.env.NEXT_PUBLIC_SITE_URL
    || 'https://licona-realty-i1st.vercel.app';

  const failUrl = `${appUrl}/settings?tab=integrations&error=meta_auth_failed`;

  if (error || !code || !state) {
    logger.warn('Meta OAuth callback missing params', { error, hasCode: !!code, hasState: !!state });
    return NextResponse.redirect(failUrl);
  }

  const clientId = process.env.META_APP_ID;
  const clientSecret = process.env.META_APP_SECRET;

  if (!clientId || !clientSecret) {
    logger.error('Missing META_APP_ID or META_APP_SECRET');
    return NextResponse.redirect(failUrl);
  }

  const redirectUri = `${appUrl}/api/auth/meta/callback`;

  try {
    // Exchange code for short-lived access token
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    });

    const tokenRes = await fetch(`${GRAPH_BASE}/oauth/access_token?${tokenParams}`);
    if (!tokenRes.ok) {
      logger.error('Meta token exchange failed', { status: tokenRes.status });
      return NextResponse.redirect(failUrl);
    }

    const tokenData = await tokenRes.json();
    const shortLivedToken = tokenData.access_token;

    // Exchange short-lived token for long-lived token
    const longLivedParams = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: clientId,
      client_secret: clientSecret,
      fb_exchange_token: shortLivedToken,
    });

    const longLivedRes = await fetch(`${GRAPH_BASE}/oauth/access_token?${longLivedParams}`);
    const longLivedData = longLivedRes.ok ? await longLivedRes.json() : null;
    const accessToken = longLivedData?.access_token || shortLivedToken;
    const expiresIn = longLivedData?.expires_in || tokenData.expires_in;

    // Get user's Facebook pages (needed to find Instagram business account)
    const pagesRes = await fetch(
      `${GRAPH_BASE}/me/accounts?access_token=${accessToken}&fields=id,name,instagram_business_account,access_token`
    );
    const pagesData = pagesRes.ok ? await pagesRes.json() : { data: [] };

    // Find the first page with an Instagram business account
    let instagramAccountId: string | null = null;
    let pageId: string | null = null;
    let pageAccessToken: string | null = null;

    for (const page of pagesData.data || []) {
      if (page.instagram_business_account?.id) {
        instagramAccountId = page.instagram_business_account.id;
        pageId = page.id;
        pageAccessToken = page.access_token || null;
        break;
      }
      if (!pageId) {
        pageId = page.id;
        pageAccessToken = page.access_token || null;
      }
    }

    // Get user profile email
    const profileRes = await fetch(
      `${GRAPH_BASE}/me?access_token=${accessToken}&fields=email,name`
    );
    const profile = profileRes.ok ? await profileRes.json() : {};

    // Store in user_integrations
    const supabase = createAdminClient();
    const { error: upsertError } = await supabase
      .from('user_integrations')
      .upsert({
        user_id: state,
        provider: 'meta',
        access_token: accessToken,
        refresh_token: pageAccessToken,
        token_expires_at: expiresIn
          ? new Date(Date.now() + expiresIn * 1000).toISOString()
          : null,
        scopes: tokenData.scope
          ? tokenData.scope.split(',')
          : [],
        provider_email: profile.email || null,
        provider_account_id: instagramAccountId || pageId || profile.id || null,
        metadata: {
          facebook_page_id: pageId,
          instagram_business_account_id: instagramAccountId,
          profile_name: profile.name || null,
          connected_at: new Date().toISOString(),
        },
      }, { onConflict: 'user_id,provider' });

    if (upsertError) {
      logger.error('Failed to save Meta integration', { error: upsertError.message });
      return NextResponse.redirect(failUrl);
    }

    return NextResponse.redirect(`${appUrl}/settings?tab=integrations&success=meta`);
  } catch (err) {
    logger.error('Meta OAuth callback error', { error: String(err) });
    return NextResponse.redirect(failUrl);
  }
}
