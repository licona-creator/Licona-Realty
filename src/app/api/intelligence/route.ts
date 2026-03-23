/**
 * Intelligence Layer API
 *
 * Aggregates alerts and suggestions from all subsystems.
 * Returns prioritized action items for the dashboard.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/rate-limit';
import {
  detectStaleContacts,
  checkTransactionTimelines,
  generateSmartSuggestions,
  type IntelligenceAlert,
} from '@/lib/intelligence/engine';

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (!checkRateLimit(ip, 'api')) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const alerts: IntelligenceAlert[] = [];

  // Fetch contacts for staleness check
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, track_type, pipeline_stage, last_contacted_at')
    .eq('is_deleted', false)
    .not('pipeline_stage', 'in', '("closed","lost")');

  if (contacts) {
    const staleAlerts = detectStaleContacts(
      contacts.map(c => ({
        id: c.id,
        firstName: c.first_name,
        lastName: c.last_name,
        trackType: c.track_type,
        pipelineStage: c.pipeline_stage,
        lastContactedAt: c.last_contacted_at,
      }))
    );
    alerts.push(...staleAlerts);
  }

  // Fetch transactions for timeline check
  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, property_address, closing_date, status, checklist')
    .not('status', 'in', '("closed","lost")');

  if (transactions) {
    const txAlerts = checkTransactionTimelines(
      transactions.map(t => ({
        id: t.id,
        propertyAddress: t.property_address,
        closingDate: t.closing_date,
        status: t.status,
        checklist: (t.checklist || []).map((c: Record<string, unknown>) => ({
          label: c.label as string,
          isCompleted: c.is_completed as boolean,
          dueDate: c.due_date as string | null,
        })),
      }))
    );
    alerts.push(...txAlerts);
  }

  // Fetch counts for smart suggestions
  const [
    { count: totalContacts },
    { count: pendingApprovals },
    { count: activeTransactions },
  ] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
    supabase.from('approval_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('transactions').select('*', { count: 'exact', head: true }).not('status', 'in', '("closed","lost")'),
  ]);

  const suggestions = generateSmartSuggestions({
    totalContacts: totalContacts || 0,
    pendingApprovals: pendingApprovals || 0,
    activeTransactions: activeTransactions || 0,
    recentLeads: 0,
    campaignEnrollments: 0,
  });
  alerts.push(...suggestions);

  // Sort by severity: urgent first, then warning, then info
  const severityOrder = { urgent: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Persist new alerts to intelligence_logs
  const { data: existingLogs } = await supabase
    .from('intelligence_logs')
    .select('message')
    .eq('is_resolved', false)
    .limit(100);

  const existingMessages = new Set((existingLogs || []).map(l => l.message));

  const newAlerts = alerts.filter(a => !existingMessages.has(a.message));
  if (newAlerts.length > 0) {
    await supabase.from('intelligence_logs').insert(
      newAlerts.map(a => ({
        user_id: user.id,
        category: a.category,
        message: a.message,
        severity: a.severity,
        action_path: a.actionPath,
        is_resolved: false,
        metadata: a.metadata || null,
      }))
    );
  }

  return NextResponse.json({
    alerts,
    counts: {
      urgent: alerts.filter(a => a.severity === 'urgent').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
      info: alerts.filter(a => a.severity === 'info').length,
      total: alerts.length,
    },
  });
}
