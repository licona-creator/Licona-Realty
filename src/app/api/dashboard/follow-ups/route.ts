import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/rate-limit';

const TEMP_ORDER: Record<string, number> = { hot: 0, warm: 1, cool: 2, cold: 3 };
const CONF_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

function prioritySort(
  a: { engagement_temperature: string | null; next_follow_up_date: string; disc_confidence: string | null },
  b: { engagement_temperature: string | null; next_follow_up_date: string; disc_confidence: string | null }
): number {
  // 1. Temperature priority (hot first)
  const aTemp = TEMP_ORDER[a.engagement_temperature || ''] ?? 4;
  const bTemp = TEMP_ORDER[b.engagement_temperature || ''] ?? 4;
  if (aTemp !== bTemp) return aTemp - bTemp;

  // 2. Most overdue first
  if (a.next_follow_up_date !== b.next_follow_up_date) {
    return a.next_follow_up_date < b.next_follow_up_date ? -1 : 1;
  }

  // 3. Profiled contacts first (high confidence > medium > low > none)
  const aConf = CONF_ORDER[a.disc_confidence || ''] ?? 3;
  const bConf = CONF_ORDER[b.disc_confidence || ''] ?? 3;
  return aConf - bConf;
}

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

    // Get contacts with follow-up dates, including intelligence fields
    const { data, error } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, phone, email, next_follow_up_date, follow_up_notes, pipeline_stage, track_type, engagement_temperature, disc_type, disc_secondary, disc_confidence')
      .eq('is_deleted', false)
      .not('next_follow_up_date', 'is', null)
      .order('next_follow_up_date', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const contacts = data || [];

    const overdue = contacts.filter(c => c.next_follow_up_date < today).sort(prioritySort);
    const todayFollowUps = contacts.filter(c => c.next_follow_up_date === today).sort(prioritySort);
    const upcoming = contacts.filter(c => c.next_follow_up_date > today && c.next_follow_up_date <= nextWeek).sort(prioritySort);

    // Find next future follow-up (for "all caught up" state)
    const allFuture = contacts.filter(c => c.next_follow_up_date > today).sort((a, b) =>
      a.next_follow_up_date < b.next_follow_up_date ? -1 : 1
    );
    const nextFuture = allFuture.length > 0 ? { name: `${allFuture[0].first_name} ${allFuture[0].last_name}`, date: allFuture[0].next_follow_up_date } : null;

    return NextResponse.json({
      overdue,
      today: todayFollowUps,
      upcoming,
      counts: {
        overdue: overdue.length,
        today: todayFollowUps.length,
        upcoming: upcoming.length,
      },
      nextFuture,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
