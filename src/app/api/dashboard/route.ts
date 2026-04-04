/**
 * Dashboard Aggregation API
 *
 * Single endpoint for morning briefing data.
 * Aggregates: approvals, pipeline, contacts, transactions,
 * bookings, intelligence alerts, and platform health.
 */

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

    // Parallel data fetches
    const [
      approvalRes,
      contactsRes,
      transactionsRes,
      bookingsRes,
      alertsRes,
      recentActivityRes,
      followUpRes,
      activitiesRes,
      partnersRes,
    ] = await Promise.all([
      // Pending approvals
      supabase
        .from('approval_queue')
        .select('id, item_type, subject, urgency_level, is_overdue, created_at')
        .eq('status', 'pending')
        .order('urgency_level', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(10),

      // Contact counts by track
      supabase
        .from('contacts')
        .select('track_type, pipeline_stage')
        .eq('is_deleted', false),

      // Active transactions
      supabase
        .from('transactions')
        .select('id, property_address, status, contract_price, closing_date, commission_net, track_type')
        .not('status', 'in', '("closed","lost")')
        .order('closing_date', { ascending: true }),

      // Today's bookings
      supabase
        .from('bookings')
        .select('id, meeting_type, visitor_name, scheduled_date, scheduled_time, status')
        .eq('scheduled_date', new Date().toISOString().split('T')[0])
        .order('scheduled_time', { ascending: true }),

      // Intelligence alerts
      supabase
        .from('intelligence_logs')
        .select('category, message, severity, action_path')
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(5),

      // Recent audit activity
      supabase
        .from('audit_logs')
        .select('action, resource_type, details, timestamp')
        .order('timestamp', { ascending: false })
        .limit(10),

      // Follow-up contacts
      supabase
        .from('contacts')
        .select('id, first_name, last_name, phone, email, next_follow_up_date, follow_up_notes, pipeline_stage, track_type, engagement_temperature')
        .eq('is_deleted', false)
        .not('next_follow_up_date', 'is', null)
        .order('next_follow_up_date', { ascending: true }),

      // Recent logged activities
      supabase
        .from('activities')
        .select('id, activity_type, direction, description, activity_date, contacts(first_name, last_name)')
        .order('activity_date', { ascending: false })
        .limit(5),

      // Referral partners
      supabase
        .from('referral_partners')
        .select('id, first_name, last_name')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    // Process contact stats
    const contacts = contactsRes.data || [];
    const contactsByTrack: Record<string, number> = {};
    const contactsByStage: Record<string, number> = {};
    for (const c of contacts) {
      contactsByTrack[c.track_type] = (contactsByTrack[c.track_type] || 0) + 1;
      contactsByStage[c.pipeline_stage] = (contactsByStage[c.pipeline_stage] || 0) + 1;
    }

    // Process transaction pipeline
    const transactions = transactionsRes.data || [];
    const pipelineValue = transactions.reduce((sum, t) => sum + (t.contract_price || 0), 0);
    const urgentClosings = transactions.filter(t => {
      if (!t.closing_date) return false;
      const days = Math.floor(
        (new Date(t.closing_date + 'T00:00:00').getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return days >= 0 && days <= 14;
    });

    // Count active leads (not in nurturing/closed/lost/on_hold)
    const inactiveStages = ['closed', 'lost', 'on_hold', 'nurturing'];
    const activeLeads = contacts.filter(c => !inactiveStages.includes(c.pipeline_stage)).length;

    // Upcoming closings (within 30 days)
    const upcomingClosings = transactions.filter(t => {
      if (!t.closing_date) return false;
      const days = Math.floor(
        (new Date(t.closing_date + 'T00:00:00').getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return days >= 0 && days <= 30;
    });

    // Calculate dynamic partner stats
    const rawPartners = partnersRes.data || [];
    const partnerIds = rawPartners.map(p => p.id);
    let partnerContacts: Array<{ referral_partner_id: string; pipeline_stage: string; id: string }> = [];
    if (partnerIds.length > 0) {
      const { data: pcData } = await supabase
        .from('contacts')
        .select('id, referral_partner_id, pipeline_stage')
        .in('referral_partner_id', partnerIds)
        .eq('is_deleted', false);
      partnerContacts = pcData || [];
    }
    const partnerContactIds = partnerContacts.map(c => c.id);
    let partnerTransactions: Array<{ contact_id: string; contract_price: number | null }> = [];
    if (partnerContactIds.length > 0) {
      const { data: ptData } = await supabase
        .from('transactions')
        .select('contact_id, contract_price')
        .in('contact_id', partnerContactIds);
      partnerTransactions = ptData || [];
    }
    const partnersWithStats = rawPartners.map(partner => {
      const pContacts = partnerContacts.filter(c => c.referral_partner_id === partner.id);
      const pClosed = pContacts.filter(c => c.pipeline_stage === 'closed' || c.pipeline_stage === 'closing');
      const pClosedIds = pClosed.map(c => c.id);
      const pRevenue = partnerTransactions
        .filter(tx => pClosedIds.includes(tx.contact_id))
        .reduce((sum, tx) => sum + (tx.contract_price || 0), 0);
      return {
        ...partner,
        total_leads_sent: pContacts.length,
        total_closings: pClosed.length,
        total_revenue_generated: pRevenue,
      };
    }).sort((a, b) => b.total_revenue_generated - a.total_revenue_generated);

    // Commission calculations
    const { data: closedTransactions } = await supabase
      .from('transactions')
      .select('commission_net, commission_rate, contract_price, referral_fee')
      .eq('status', 'closed');

    const commissionYTD = (closedTransactions || []).reduce((sum, t) => {
      if (t.commission_net) return sum + t.commission_net;
      const rate = t.commission_rate || 3;
      const gross = (t.contract_price || 0) * rate / 100;
      const fee = t.referral_fee || 0;
      return sum + (gross - fee);
    }, 0);

    const commissionProjected = transactions.reduce((sum, t) => {
      const rate = 3; // default
      const gross = (t.contract_price || 0) * rate / 100;
      return sum + gross;
    }, 0);

    // Process follow-ups
    const followUpContacts = followUpRes.data || [];
    const overdueFollowUps = followUpContacts.filter(c => c.next_follow_up_date < today);
    const todayFollowUps = followUpContacts.filter(c => c.next_follow_up_date === today);
    const upcomingFollowUps = followUpContacts.filter(c => c.next_follow_up_date > today && c.next_follow_up_date <= nextWeek);

    return NextResponse.json({
      followUps: {
        overdue: overdueFollowUps,
        today: todayFollowUps,
        upcoming: upcomingFollowUps,
        counts: { overdue: overdueFollowUps.length, today: todayFollowUps.length, upcoming: upcomingFollowUps.length },
      },
      recentActivities: activitiesRes.data || [],
      partners: partnersWithStats,
      approvalQueue: {
        items: approvalRes.data || [],
        count: (approvalRes.data || []).length,
        hasOverdue: (approvalRes.data || []).some(a => a.is_overdue),
      },
      contacts: {
        total: contacts.length,
        activeLeads,
        byTrack: contactsByTrack,
        byStage: contactsByStage,
      },
      pipeline: {
        value: pipelineValue,
        activeCount: transactions.length,
        urgentClosings: urgentClosings.length,
        transactions: transactions.slice(0, 5),
        upcomingClosings: upcomingClosings.slice(0, 5),
      },
      schedule: {
        todayBookings: bookingsRes.data || [],
        count: (bookingsRes.data || []).length,
      },
      intelligence: {
        alerts: alertsRes.data || [],
        count: (alertsRes.data || []).length,
      },
      recentActivity: recentActivityRes.data || [],
      commissionYTD: Math.round(commissionYTD),
      commissionProjected: Math.round(commissionProjected),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[dashboard:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Unexpected server error' },
      { status: 500 }
    );
  }
}
