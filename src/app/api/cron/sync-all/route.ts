/**
 * Sync All Cron Job
 *
 * Runs every 6 hours via Vercel Cron.
 * Syncs emails and calendar events for all users with Google connected.
 * Uses admin client (service role) since there is no user session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { syncEmails } from '@/lib/sync/email-sync';
import { syncCalendarEvents } from '@/lib/sync/calendar-sync';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    // Get user(s) with Google connected (single-user app, but handle multiple)
    const { data: tokens } = await supabase
      .from('integration_tokens')
      .select('user_id')
      .eq('provider', 'google');

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({
        message: 'No Google connection found',
        timestamp: new Date().toISOString(),
      });
    }

    const userIds = [...new Set(tokens.map((t) => t.user_id))];
    const results: Record<string, { email: { synced: number; errors: string[] }; calendar: { synced: number; errors: string[] } }> = {};

    for (const userId of userIds) {
      const emailResult = await syncEmails(supabase, userId);
      const calendarResult = await syncCalendarEvents(supabase, userId);
      results[userId] = { email: emailResult, calendar: calendarResult };
    }

    // Step 3: Auto-enrich contacts with new data
    let enrichmentResults: Record<string, unknown> | null = null;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://licona-realty-i1st.vercel.app';
      const enrichResponse = await fetch(`${baseUrl}/api/ai/enrich-all`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
          'Content-Type': 'application/json',
        },
      });
      if (enrichResponse.ok) {
        enrichmentResults = await enrichResponse.json();
      }
    } catch {
      // Enrichment is best-effort. Never block the sync.
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      results,
      ...(enrichmentResults ? { enrichment: enrichmentResults } : {}),
    });
  } catch (err) {
    console.error('[cron:sync-all] Failed:', err);
    return NextResponse.json({ error: 'Sync cron failed' }, { status: 500 });
  }
}
