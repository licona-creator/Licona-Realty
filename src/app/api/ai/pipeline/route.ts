import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getDocumentChecklist, calculateDocumentProgress } from '@/lib/documents/texas-checklist';
import type { TransactionDocument } from '@/lib/documents/texas-checklist';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date().toISOString().split('T')[0];

    const [contactsRes, transactionsRes, partnersRes, activitiesRes, emailSyncRes, calSyncRes, emailTotalRes, recentEmailContactsRes] = await Promise.all([
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
      supabase
        .from('sync_log')
        .select('completed_at')
        .eq('provider', 'google')
        .eq('sync_type', 'email')
        .eq('status', 'success')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('sync_log')
        .select('completed_at')
        .eq('provider', 'google')
        .eq('sync_type', 'calendar')
        .eq('status', 'success')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('sync_log')
        .select('items_synced')
        .eq('provider', 'google')
        .eq('sync_type', 'email')
        .eq('status', 'success'),
      supabase
        .from('activities')
        .select('contact_id')
        .eq('activity_type', 'email')
        .gte('activity_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    const contacts = contactsRes.data || [];
    const transactions = transactionsRes.data || [];
    const partners = partnersRes.data || [];
    const activities = activitiesRes.data || [];
    const lastEmailSync = emailSyncRes.data?.completed_at || null;
    const lastCalSync = calSyncRes.data?.completed_at || null;
    const totalEmailsSynced = (emailTotalRes.data || []).reduce((sum: number, r: { items_synced: number }) => sum + (r.items_synced || 0), 0);
    const recentEmailContacts = new Set((recentEmailContactsRes.data || []).map((r: { contact_id: string }) => r.contact_id)).size;

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

    // Upcoming closings with document progress
    const activeTransactions = transactions
      .filter(t => t.closing_date && t.closing_date >= today && !['closed', 'lost', 'cancelled'].includes(t.status));

    const upcoming: string[] = [];
    for (const t of activeTransactions) {
      const days = Math.floor((new Date(t.closing_date + 'T00:00:00').getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      let line = `${t.property_address}: $${(t.contract_price || 0).toLocaleString()}, ${days}d to close, status: ${t.status}`;

      try {
        const { data: txDocs } = await supabase
          .from('transaction_documents')
          .select('document_type, status')
          .eq('transaction_id', t.id);

        if (txDocs) {
          const cl = getDocumentChecklist(t.track_type);
          const prog = calculateDocumentProgress(txDocs as unknown as TransactionDocument[], cl);
          line += `, docs: ${prog.uploaded}/${prog.total} (${prog.percentComplete}%)`;
          if (prog.percentComplete < 80 && days <= 14) {
            line += ' [DOCUMENT ALERT]';
          }
        }
      } catch {
        // transaction_documents table may not exist
      }

      upcoming.push(line);
    }

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
${upcoming.length > 0 ? upcoming.map(u => `- ${u}`).join('\n') : '- None'}

SYNC STATUS:
- Last email sync: ${lastEmailSync ? new Date(lastEmailSync).toLocaleString() : 'Never'}
- Last calendar sync: ${lastCalSync ? new Date(lastCalSync).toLocaleString() : 'Never'}
- Total emails synced: ${totalEmailsSynced}
- Contacts with recent email activity (7d): ${recentEmailContacts}`;

    return NextResponse.json({ summary });
  } catch (err) {
    console.error('[ai:pipeline]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
