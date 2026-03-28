/**
 * Email Sync API Route
 *
 * POST /api/sync/email - Trigger email sync for authenticated user.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { syncEmails } from '@/lib/sync/email-sync';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await syncEmails(supabase, user.id);

    return NextResponse.json({
      synced: result.synced,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[sync:email] Error:', err);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
