/**
 * Daily Health Check Cron Job
 *
 * Runs at 6 AM CST (12:00 UTC) every day via Vercel Cron.
 * Performs the same checks as /api/health.
 * If any critical check fails, creates a notification.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const checks: Record<string, { ok: boolean; detail: string }> = {};

  // Database checks
  const tables = ['contacts', 'transactions', 'activities', 'referral_partners'] as const;
  for (const table of tables) {
    try {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      checks[`db_${table}`] = { ok: !error, detail: error ? error.message : `${count ?? 0} rows` };
    } catch (err) {
      checks[`db_${table}`] = { ok: false, detail: err instanceof Error ? err.message : 'query failed' };
    }
  }

  // Env var checks
  checks.anthropic_key = { ok: !!process.env.ANTHROPIC_API_KEY, detail: process.env.ANTHROPIC_API_KEY ? 'set' : 'missing' };
  checks.google_maps_key = { ok: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, detail: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 'set' : 'missing' };
  checks.google_oauth = {
    ok: !!(process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID),
    detail: (process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID) ? 'set' : 'missing',
  };

  // Check integration tokens
  const { data: integrations } = await supabase
    .from('user_integrations')
    .select('provider, token_expires_at');

  const googleToken = integrations?.find(i => i.provider === 'google');
  checks.google_token = {
    ok: !!googleToken,
    detail: googleToken ? 'Token present' : 'No Google token stored',
  };

  const failedChecks = Object.entries(checks).filter(([, v]) => !v.ok);
  const totalChecks = Object.keys(checks).length;
  const passingChecks = totalChecks - failedChecks.length;

  // Create notification if any critical checks failed
  if (failedChecks.length > 0) {
    const failedNames = failedChecks.map(([k]) => k.replace(/_/g, ' ')).join(', ');

    // Try to find first user to assign notification to
    const { data: users } = await supabase.auth.admin.listUsers({ perPage: 1 });
    const userId = users?.users?.[0]?.id;

    if (userId) {
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'system',
        title: `Daily Health Check: ${failedChecks.length} issue${failedChecks.length > 1 ? 's' : ''} detected`,
        message: `Failed checks: ${failedNames}. ${passingChecks}/${totalChecks} systems operational.`,
        metadata: { checks, timestamp: new Date().toISOString() },
      });
    }
  }

  return NextResponse.json({
    status: failedChecks.length === 0 ? 'healthy' : 'degraded',
    passing: passingChecks,
    total: totalChecks,
    checks,
    timestamp: new Date().toISOString(),
  });
}
