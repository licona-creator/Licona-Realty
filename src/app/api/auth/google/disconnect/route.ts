/**
 * Google OAuth Disconnect
 *
 * Removes stored Google tokens for the authenticated user.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Delete from integration_tokens
  await supabase
    .from('integration_tokens')
    .delete()
    .eq('provider', 'google')
    .eq('user_id', user.id);

  // Also clean up user_integrations for backward compatibility
  await supabase
    .from('user_integrations')
    .delete()
    .eq('provider', 'google')
    .eq('user_id', user.id);

  return NextResponse.json({ success: true });
}
