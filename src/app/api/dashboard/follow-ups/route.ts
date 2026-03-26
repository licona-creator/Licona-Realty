import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rateCheck = checkRateLimit(ip, 'api');
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get all contacts with follow-up dates
    const { data, error } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, phone, email, next_follow_up_date, follow_up_notes, pipeline_stage, track_type')
      .eq('is_deleted', false)
      .not('next_follow_up_date', 'is', null)
      .order('next_follow_up_date', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const contacts = data || [];

    const overdue = contacts.filter(c => c.next_follow_up_date < today);
    const todayFollowUps = contacts.filter(c => c.next_follow_up_date === today);
    const upcoming = contacts.filter(c => c.next_follow_up_date > today && c.next_follow_up_date <= nextWeek);

    return NextResponse.json({
      overdue,
      today: todayFollowUps,
      upcoming,
      counts: {
        overdue: overdue.length,
        today: todayFollowUps.length,
        upcoming: upcoming.length,
      },
    });
  } catch (err) {
    console.error('[follow-ups:GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
