/**
 * Google OAuth Status
 *
 * Returns the current Google connection status for the authenticated user.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: token } = await supabase
    .from('integration_tokens')
    .select('expires_at, scopes, created_at')
    .eq('provider', 'google')
    .eq('user_id', user.id)
    .single();

  if (token) {
    return NextResponse.json({
      connected: true,
      expires_at: token.expires_at,
      scopes: token.scopes,
      created_at: token.created_at,
    });
  }

  return NextResponse.json({ connected: false });
}
