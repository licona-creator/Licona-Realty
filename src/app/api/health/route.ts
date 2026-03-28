/**
 * System Health Diagnostics API
 *
 * Comprehensive health check for all system components.
 * Authenticated: returns full diagnostics with scores.
 * Unauthenticated: returns basic database connectivity (backward compat).
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export interface HealthCheckResult {
  timestamp: string;
  checks: {
    database: {
      ok: boolean;
      responseMs: number;
      contacts: number;
      transactions: number;
      activities: number;
      referralPartners: number;
    };
    ai: { configured: boolean };
    googleMaps: { configured: boolean };
    googleOAuth: { connected: boolean; expires_at?: string | null };
    syncs: { lastEmailSync: string | null; lastCalendarSync: string | null };
    dataQuality: {
      missingPhone: number;
      missingEmail: number;
      missingFollowUp: number;
      overdueFollowUp: number;
    };
  };
  score: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function runHealthChecks(supabase: any): Promise<HealthCheckResult> {
  // Check 1 - Database
  const dbStart = Date.now();
  const [contactsRes, transactionsRes, activitiesRes, partnersRes] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }),
    supabase.from('transactions').select('*', { count: 'exact', head: true }),
    supabase.from('activities').select('*', { count: 'exact', head: true }),
    supabase.from('referral_partners').select('*', { count: 'exact', head: true }),
  ]);
  const dbResponseMs = Date.now() - dbStart;
  const dbOk = !contactsRes.error;

  // Check 2 - AI Assistant
  const aiConfigured = !!(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.length > 0);

  // Check 3 - Google Maps
  const mapsConfigured = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Check 4 - Google OAuth
  let googleConnected = false;
  let googleExpiresAt: string | null = null;
  try {
    const { data: googleToken } = await supabase
      .from('integration_tokens')
      .select('expires_at')
      .eq('provider', 'google')
      .limit(1)
      .single();
    googleConnected = !!googleToken;
    googleExpiresAt = googleToken?.expires_at ?? null;
  } catch {
    // Table may not exist yet
  }

  // Check 5 - Last Syncs
  let lastEmailSync: string | null = null;
  let lastCalendarSync: string | null = null;
  try {
    const [emailSyncRes, calendarSyncRes] = await Promise.all([
      supabase
        .from('sync_log')
        .select('started_at')
        .eq('provider', 'google')
        .eq('sync_type', 'email')
        .order('started_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('sync_log')
        .select('started_at')
        .eq('provider', 'google')
        .eq('sync_type', 'calendar')
        .order('started_at', { ascending: false })
        .limit(1)
        .single(),
    ]);
    lastEmailSync = emailSyncRes.data?.started_at ?? null;
    lastCalendarSync = calendarSyncRes.data?.started_at ?? null;
  } catch {
    // Tables may not exist yet
  }

  // Check 6 - Data Quality
  const [missingPhoneRes, missingEmailRes, missingFollowUpRes, overdueRes] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }).is('phone', null),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).is('email', null),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).is('next_follow_up_date', null),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).lt('next_follow_up_date', new Date().toISOString().split('T')[0]),
  ]);

  // Calculate score (X out of 4 core checks)
  let passing = 0;
  if (dbOk) passing++;
  if (aiConfigured) passing++;
  if (mapsConfigured) passing++;
  if (googleConnected) passing++;
  const score = Math.round((passing / 4) * 100);

  return {
    timestamp: new Date().toISOString(),
    checks: {
      database: {
        ok: dbOk,
        responseMs: dbResponseMs,
        contacts: contactsRes.count ?? 0,
        transactions: transactionsRes.count ?? 0,
        activities: activitiesRes.count ?? 0,
        referralPartners: partnersRes.count ?? 0,
      },
      ai: { configured: aiConfigured },
      googleMaps: { configured: mapsConfigured },
      googleOAuth: {
        connected: googleConnected,
        expires_at: googleExpiresAt,
      },
      syncs: {
        lastEmailSync,
        lastCalendarSync,
      },
      dataQuality: {
        missingPhone: missingPhoneRes.count ?? 0,
        missingEmail: missingEmailRes.count ?? 0,
        missingFollowUp: missingFollowUpRes.count ?? 0,
        overdueFollowUp: overdueRes.count ?? 0,
      },
    },
    score,
  };
}

export async function GET() {
  // Try authenticated flow first for full diagnostics
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const result = await runHealthChecks(supabase);
      return NextResponse.json(result);
    }
  } catch {
    // Fall through to basic health check
  }

  // Unauthenticated basic health check (backward compat for integration cards)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {},
    }, { status: 503 });
  }

  const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { count, error } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      status: error ? 'degraded' : 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: { ok: !error, detail: `contacts: ${count ?? 0}` },
      },
    });
  } catch {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: { database: { ok: false } },
    }, { status: 503 });
  }
}
