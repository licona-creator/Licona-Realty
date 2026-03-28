/**
 * Dashboard Upcoming Events API
 *
 * GET /api/dashboard/upcoming-events
 * Returns upcoming meeting activities and follow-up events from the activities table.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date().toISOString();

    // Fetch upcoming meetings from activities
    const { data: events } = await supabase
      .from('activities')
      .select('id, description, activity_date, contact_id, contacts(first_name, last_name)')
      .eq('user_id', user.id)
      .in('activity_type', ['meeting', 'showing'])
      .gte('activity_date', now)
      .order('activity_date', { ascending: true })
      .limit(5);

    return NextResponse.json({ events: events || [] });
  } catch (err) {
    console.error('[dashboard:upcoming-events]', err);
    return NextResponse.json({ events: [] });
  }
}
