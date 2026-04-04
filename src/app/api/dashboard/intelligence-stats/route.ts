import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Total contacts
    const { count: total } = await supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('is_deleted', false);

    // Profiled contacts (have last_enriched_at)
    const { count: profiled } = await supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('is_deleted', false)
      .not('last_enriched_at', 'is', null);

    // Ready to analyze: not enriched, with 2+ activities
    // Get unenriched contact IDs then count those with activities
    const { data: unenriched } = await supabase
      .from('contacts')
      .select('id')
      .eq('is_deleted', false)
      .is('last_enriched_at', null);

    let ready = 0;
    if (unenriched && unenriched.length > 0) {
      const ids = unenriched.map(c => c.id);
      const { data: actCounts } = await supabase
        .from('activities')
        .select('contact_id')
        .in('contact_id', ids);

      if (actCounts) {
        const countMap: Record<string, number> = {};
        for (const a of actCounts) {
          countMap[a.contact_id] = (countMap[a.contact_id] || 0) + 1;
        }
        ready = Object.values(countMap).filter(c => c >= 2).length;
      }
    }

    return NextResponse.json({
      total: total || 0,
      profiled: profiled || 0,
      ready,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
