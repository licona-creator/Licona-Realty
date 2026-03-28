/**
 * Comprehensive Health Check API
 *
 * Runs diagnostics on all platform subsystems:
 * Database, API routes, AI, Google Maps, Google OAuth, Gmail, Calendar, DocuSign.
 * Returns JSON with per-check status, response time, and overall health score.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface CheckResult {
  ok: boolean;
  detail: string;
  ms: number;
}

async function timedCheck(fn: () => Promise<{ ok: boolean; detail: string }>): Promise<CheckResult> {
  const start = Date.now();
  try {
    const result = await fn();
    return { ...result, ms: Date.now() - start };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : 'Unknown error', ms: Date.now() - start };
  }
}

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const checks: Record<string, CheckResult> = {};

  // Database checks in parallel
  const [dbContacts, dbTransactions, dbActivities, dbPartners] = await Promise.all([
    timedCheck(async () => {
      const { count, error } = await supabase.from('contacts').select('*', { count: 'exact', head: true });
      return { ok: !error, detail: error ? error.message : `Connected - ${count ?? 0} contacts` };
    }),
    timedCheck(async () => {
      const { count, error } = await supabase.from('transactions').select('*', { count: 'exact', head: true });
      return { ok: !error, detail: error ? error.message : `Connected - ${count ?? 0} transactions` };
    }),
    timedCheck(async () => {
      const { count, error } = await supabase.from('activities').select('*', { count: 'exact', head: true });
      return { ok: !error, detail: error ? error.message : `Connected - ${count ?? 0} activities` };
    }),
    timedCheck(async () => {
      const { count, error } = await supabase.from('referral_partners').select('*', { count: 'exact', head: true });
      return { ok: !error, detail: error ? error.message : `Connected - ${count ?? 0} partners` };
    }),
  ]);

  checks.database_contacts = dbContacts;
  checks.database_transactions = dbTransactions;
  checks.database_activities = dbActivities;
  checks.database_partners = dbPartners;

  // AI check
  checks.ai_assistant = await timedCheck(async () => {
    const hasKey = !!process.env.ANTHROPIC_API_KEY;
    return { ok: hasKey, detail: hasKey ? 'API key configured' : 'Not configured - add ANTHROPIC_API_KEY' };
  });

  // Google Maps check
  checks.google_maps = await timedCheck(async () => {
    const hasKey = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    return { ok: hasKey, detail: hasKey ? 'API key configured' : 'Not configured - add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY' };
  });

  // Google OAuth check
  checks.google_oauth = await timedCheck(async () => {
    const hasClientId = !!process.env.GOOGLE_OAUTH_CLIENT_ID || !!process.env.GOOGLE_CLIENT_ID;
    return { ok: hasClientId, detail: hasClientId ? 'OAuth client configured' : 'Not configured - add GOOGLE_OAUTH_CLIENT_ID' };
  });

  // Integration tokens check (Gmail/Calendar via user_integrations)
  checks.gmail = await timedCheck(async () => {
    const { data, error } = await supabase
      .from('user_integrations')
      .select('provider, token_expires_at, provider_email')
      .eq('provider', 'google')
      .maybeSingle();
    if (error) return { ok: false, detail: error.message };
    if (!data) return { ok: false, detail: 'Google not connected - connect in Settings' };
    const expired = data.token_expires_at && new Date(data.token_expires_at) < new Date();
    return {
      ok: !expired,
      detail: expired
        ? `Token expired for ${data.provider_email || 'unknown'} - will auto-refresh`
        : `Connected as ${data.provider_email || 'unknown'}`,
    };
  });

  checks.calendar = await timedCheck(async () => {
    const { data } = await supabase
      .from('user_integrations')
      .select('provider, metadata')
      .eq('provider', 'google')
      .maybeSingle();
    if (!data) return { ok: false, detail: 'Google not connected' };
    return { ok: true, detail: 'Available via Google OAuth' };
  });

  // DocuSign check
  checks.docusign = await timedCheck(async () => {
    const { data } = await supabase
      .from('user_integrations')
      .select('provider')
      .eq('provider', 'docusign')
      .maybeSingle();
    return {
      ok: !!data,
      detail: data ? 'Connected' : 'Not connected - connect in Settings',
    };
  });

  // Calculate health score
  const total = Object.keys(checks).length;
  const passing = Object.values(checks).filter(c => c.ok).length;
  const score = Math.round((passing / total) * 100);

  return NextResponse.json({
    status: score === 100 ? 'healthy' : score >= 60 ? 'degraded' : 'unhealthy',
    score,
    passing,
    total,
    timestamp: new Date().toISOString(),
    checks,
  });
}
