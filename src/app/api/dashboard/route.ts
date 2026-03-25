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

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parallel data fetches
  const [
    approvalRes,
    contactsRes,
    transactionsRes,
    bookingsRes,
    alertsRes,
    recentActivityRes,
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

    // Recent activity
    supabase
      .from('audit_logs')
      .select('action, resource_type, details, timestamp')
      .order('timestamp', { ascending: false })
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
      (new Date(t.closing_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return days >= 0 && days <= 14;
  });

  return NextResponse.json({
    approvalQueue: {
      items: approvalRes.data || [],
      count: (approvalRes.data || []).length,
      hasOverdue: (approvalRes.data || []).some(a => a.is_overdue),
    },
    contacts: {
      total: contacts.length,
      byTrack: contactsByTrack,
      byStage: contactsByStage,
    },
    pipeline: {
      value: pipelineValue,
      activeCount: transactions.length,
      urgentClosings: urgentClosings.length,
      transactions: transactions.slice(0, 5),
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
    timestamp: new Date().toISOString(),
  });
}
