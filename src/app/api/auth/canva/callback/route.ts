/**
 * Canva Connect OAuth Callback
 *
 * Exchanges auth code for tokens and stores in user_integrations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { exchangeCanvaCode } from '@/lib/canva/client';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const error = request.nextUrl.searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://licona-realty-i1st.vercel.app';

  if (error || !code || !state) {
    return NextResponse.redirect(`${appUrl}/settings?tab=integrations&error=canva_auth_failed`);
  }

  const redirectUri = `${appUrl}/api/auth/canva/callback`;

  try {
    const tokens = await exchangeCanvaCode(code, redirectUri);

    // Store in user_integrations
    const supabase = createAdminClient();
    const { error: upsertError } = await supabase
      .from('user_integrations')
      .upsert({
        user_id: state,
        provider: 'canva',
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken || null,
        token_expires_at: tokens.expiresAt
          ? new Date(tokens.expiresAt).toISOString()
          : null,
        scopes: [
          'design:content:read', 'design:content:write',
          'design:meta:read', 'asset:read', 'asset:write',
          'brandtemplate:content:read', 'brandtemplate:meta:read',
        ],
        metadata: { connected_via: 'oauth' },
      }, { onConflict: 'user_id,provider' });

    if (upsertError) {
      return NextResponse.redirect(`${appUrl}/settings?tab=integrations&error=canva_save_failed`);
    }

    return NextResponse.redirect(`${appUrl}/settings?tab=integrations&success=canva`);
  } catch {
    return NextResponse.redirect(`${appUrl}/settings?tab=integrations&error=canva_unknown`);
  }
}
