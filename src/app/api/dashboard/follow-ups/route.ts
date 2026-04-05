import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { getDisplayName } from '@/lib/format';

interface EnrichedFollowUp {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  next_follow_up_date: string;
  follow_up_notes: string | null;
  pipeline_stage: string;
  track_type: string;
  engagement_temperature: string | null;
  disc_type: string | null;
  disc_secondary: string | null;
  disc_confidence: string | null;
  silence_meaning: string | null;
  last_activity_type: string | null;
  last_activity_date: string | null;
  last_activity_direction: string | null;
  last_activity_description: string | null;
  deal_value: number | null;
  deal_name: string | null;
}

const TEMP_ORDER: Record<string, number> = { hot: 1, warm: 2, cool: 3, cold: 4 };

function sectionSort(a: EnrichedFollowUp, b: EnrichedFollowUp): number {
  // 1. deal_value DESC (contacts with deals first, highest value first)
  const aVal = a.deal_value || 0;
  const bVal = b.deal_value || 0;
  if (aVal !== bVal) return bVal - aVal;

  // 2. engagement_temperature priority
  const aTemp = TEMP_ORDER[a.engagement_temperature || ''] ?? 5;
  const bTemp = TEMP_ORDER[b.engagement_temperature || ''] ?? 5;
  if (aTemp !== bTemp) return aTemp - bTemp;

  // 3. Most overdue first (earliest date first)
  if (a.next_follow_up_date !== b.next_follow_up_date) {
    return a.next_follow_up_date < b.next_follow_up_date ? -1 : 1;
  }

  return 0;
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

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Only return contacts due through end of tomorrow
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, phone, email, next_follow_up_date, follow_up_notes, pipeline_stage, track_type, engagement_temperature, disc_type, disc_secondary, disc_confidence, silence_meaning')
      .eq('is_deleted', false)
      .not('next_follow_up_date', 'is', null)
      .lte('next_follow_up_date', tomorrowStr)
      .order('next_follow_up_date', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!contacts || contacts.length === 0) {
      // Find next future follow-up
      const { data: futureData } = await supabase
        .from('contacts')
        .select('first_name, last_name, next_follow_up_date')
        .eq('is_deleted', false)
        .not('next_follow_up_date', 'is', null)
        .gt('next_follow_up_date', tomorrowStr)
        .order('next_follow_up_date', { ascending: true })
        .limit(1);

      const nextFuture = futureData && futureData.length > 0
        ? { name: getDisplayName(futureData[0]), date: futureData[0].next_follow_up_date }
        : null;

      return NextResponse.json({
        overdue: [], today: [], tomorrow: [],
        counts: { overdue: 0, today: 0, tomorrow: 0 },
        nextFuture,
      });
    }

    const contactIds = contacts.map(c => c.id);

    // Fetch last activity per contact (most recent)
    const { data: allActivities } = await supabase
      .from('activities')
      .select('contact_id, activity_type, activity_date, direction, description')
      .in('contact_id', contactIds)
      .order('activity_date', { ascending: false });

    // Build last-activity map (first occurrence per contact_id = most recent)
    const lastActivityMap: Record<string, { type: string; date: string; direction: string | null; description: string | null }> = {};
    if (allActivities) {
      for (const a of allActivities) {
        if (!lastActivityMap[a.contact_id]) {
          lastActivityMap[a.contact_id] = {
            type: a.activity_type,
            date: a.activity_date,
            direction: a.direction,
            description: a.description ? a.description.substring(0, 80) : null,
          };
        }
      }
    }

    // Fetch active deals per contact (highest price)
    const { data: allDeals } = await supabase
      .from('transactions')
      .select('contact_id, contract_price, property_address, status')
      .in('contact_id', contactIds)
      .not('status', 'in', '("closed","cancelled","lost")');

    const dealMap: Record<string, { value: number; name: string }> = {};
    if (allDeals) {
      for (const d of allDeals) {
        if (!d.contact_id) continue;
        const price = d.contract_price || 0;
        if (!dealMap[d.contact_id] || price > dealMap[d.contact_id].value) {
          dealMap[d.contact_id] = {
            value: price,
            name: (d.property_address || '').substring(0, 30),
          };
        }
      }
    }

    // Enrich contacts
    const enriched: EnrichedFollowUp[] = contacts.map(c => {
      const la = lastActivityMap[c.id];
      const deal = dealMap[c.id];
      return {
        ...c,
        last_activity_type: la?.type || null,
        last_activity_date: la?.date || null,
        last_activity_direction: la?.direction || null,
        last_activity_description: la?.description || null,
        deal_value: deal?.value || null,
        deal_name: deal?.name || null,
      };
    });

    // Group into sections
    const overdue = enriched.filter(c => c.next_follow_up_date < todayStr).sort(sectionSort);
    const todayFollowUps = enriched.filter(c => c.next_follow_up_date === todayStr).sort(sectionSort);
    const tomorrowFollowUps = enriched.filter(c => c.next_follow_up_date === tomorrowStr).sort(sectionSort);

    // Find next future follow-up beyond tomorrow
    const { data: futureData } = await supabase
      .from('contacts')
      .select('first_name, last_name, next_follow_up_date')
      .eq('is_deleted', false)
      .not('next_follow_up_date', 'is', null)
      .gt('next_follow_up_date', tomorrowStr)
      .order('next_follow_up_date', { ascending: true })
      .limit(1);

    const nextFuture = futureData && futureData.length > 0
      ? { name: getDisplayName(futureData[0]), date: futureData[0].next_follow_up_date }
      : null;

    return NextResponse.json({
      overdue,
      today: todayFollowUps,
      tomorrow: tomorrowFollowUps,
      counts: {
        overdue: overdue.length,
        today: todayFollowUps.length,
        tomorrow: tomorrowFollowUps.length,
      },
      nextFuture,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
