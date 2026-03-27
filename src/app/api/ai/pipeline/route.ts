import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date().toISOString().split('T')[0];

    const [contactsRes, transactionsRes, partnersRes, activitiesRes] = await Promise.all([
      supabase
        .from('contacts')
        .select('id, first_name, last_name, track_type, pipeline_stage, phone, email, lead_source, next_follow_up_date, last_contact_date, language_preference, budget, location_preference, follow_up_notes, notes')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('transactions')
        .select('id, property_address, status, contract_price, closing_date, contact_id, track_type, commission_net')
        .order('closing_date', { ascending: true }),
      supabase
        .from('referral_partners')
        .select('id, first_name, last_name, company')
        .order('created_at', { ascending: false }),
      supabase
        .from('activities')
        .select('contact_id, activity_type, direction, activity_date')
        .order('activity_date', { ascending: false })
        .limit(100),
    ]);

    const contacts = contactsRes.data || [];
    const transactions = transactionsRes.data || [];
    const partners = partnersRes.data || [];
    const activities = activitiesRes.data || [];

    // Pipeline stage counts
    const stageCounts: Record<string, number> = {};
    for (const c of contacts) {
      stageCounts[c.pipeline_stage] = (stageCounts[c.pipeline_stage] || 0) + 1;
    }

    // Overdue follow-ups
    const overdue = contacts
      .filter(c => c.next_follow_up_date && c.next_follow_up_date < today)
      .map(c => {
        const days = Math.floor((Date.now() - new Date(c.next_follow_up_date + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24));
        return `${c.first_name} ${c.last_name} (${days}d overdue, stage: ${c.pipeline_stage})`;
      });

    // Active leads with recent activity
    const contactActivity: Record<string, string> = {};
    for (const a of activities) {
      if (!contactActivity[a.contact_id]) {
        contactActivity[a.contact_id] = a.activity_date;
      }
    }

    const activeLeads = contacts
      .filter(c => !['closed', 'lost'].includes(c.pipeline_stage))
      .map(c => {
        const lastAct = contactActivity[c.id];
        const daysSince = c.last_contact_date
          ? Math.floor((Date.now() - new Date(c.last_contact_date + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24))
          : -1;
        return {
          name: `${c.first_name} ${c.last_name}`,
          stage: c.pipeline_stage,
          track: c.track_type,
          phone: c.phone,
          language: c.language_preference,
          budget: c.budget,
          location: c.location_preference,
          leadSource: c.lead_source,
          daysSinceContact: daysSince,
          lastActivityDate: lastAct || null,
          followUpNotes: c.follow_up_notes,
        };
      })
      .sort((a, b) => {
        if (a.lastActivityDate && b.lastActivityDate) return b.lastActivityDate.localeCompare(a.lastActivityDate);
        if (a.lastActivityDate) return -1;
        if (b.lastActivityDate) return 1;
        return 0;
      });

    // Partner stats
    const partnerStats = partners.map(p => {
      const referred = contacts.filter(c => {
        // We don't have referral_partner_id in this select, so skip detailed stats
        return false;
      });
      return `${p.first_name} ${p.last_name || ''}${p.company ? ` (${p.company})` : ''}`;
    });

    // Upcoming closings
    const upcoming = transactions
      .filter(t => t.closing_date && t.closing_date >= today && !['closed', 'lost', 'cancelled'].includes(t.status))
      .map(t => {
        const days = Math.floor((new Date(t.closing_date + 'T00:00:00').getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return `${t.property_address}: $${(t.contract_price || 0).toLocaleString()}, ${days}d to close, status: ${t.status}`;
      });

    // Closed deals
    const closedDeals = transactions.filter(t => t.status === 'closed');
    const totalRevenue = closedDeals.reduce((sum, t) => sum + (t.commission_net || 0), 0);

    const summary = `
PIPELINE SUMMARY:
- Total contacts: ${contacts.length}
- By stage: ${Object.entries(stageCounts).map(([s, c]) => `${s}: ${c}`).join(', ')}
- Closed deals: ${closedDeals.length} ($${totalRevenue.toLocaleString()} net commission)

OVERDUE FOLLOW-UPS (${overdue.length}):
${overdue.length > 0 ? overdue.map(o => `- ${o}`).join('\n') : '- None'}

ACTIVE LEADS (${activeLeads.length}, sorted by most recent activity):
${activeLeads.map(l => `- ${l.name}: ${l.stage} (${l.track}), ${l.daysSinceContact >= 0 ? l.daysSinceContact + 'd since contact' : 'never contacted'}, source: ${l.leadSource || 'unknown'}${l.budget ? ', budget: ' + l.budget : ''}${l.location ? ', area: ' + l.location : ''}`).join('\n')}

REFERRAL PARTNERS:
${partnerStats.length > 0 ? partnerStats.map(p => `- ${p}`).join('\n') : '- None'}

UPCOMING CLOSINGS:
${upcoming.length > 0 ? upcoming.map(u => `- ${u}`).join('\n') : '- None'}`;

    return NextResponse.json({ summary });
  } catch (err) {
    console.error('[ai:pipeline]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
