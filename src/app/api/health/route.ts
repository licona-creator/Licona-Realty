/**
 * Health Check API Route
 *
 * Tests real Supabase connectivity by running a lightweight query.
 * Returns database status, table availability, and storage health.
 * Does not expose credentials or PII.
 */

import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // Check env vars
  checks.env_url = { ok: !!supabaseUrl, detail: supabaseUrl ? 'set' : 'missing' };
  checks.env_anon_key = { ok: !!supabaseAnonKey, detail: supabaseAnonKey ? 'set' : 'missing' };

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      checks,
      message: 'Supabase environment variables not configured',
    }, { status: 503 });
  }

  const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Test database connectivity with a simple count query
  try {
    const { count, error } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true });
    checks.database = { ok: !error, detail: error ? error.message : `reachable (contacts: ${count ?? 0})` };
  } catch (err) {
    checks.database = { ok: false, detail: err instanceof Error ? err.message : 'connection failed' };
  }

  // Test a second table to verify schema
  try {
    const { error } = await supabase
      .from('agent_settings')
      .select('*', { count: 'exact', head: true });
    checks.agent_settings_table = { ok: !error, detail: error ? error.message : 'exists' };
  } catch {
    checks.agent_settings_table = { ok: false, detail: 'query failed' };
  }

  // Test storage bucket
  try {
    const { data, error } = await supabase.storage.listBuckets();
    const hasBucket = data?.some(b => b.name === 'profile-assets');
    checks.storage = { ok: !error, detail: error ? error.message : `${data?.length ?? 0} buckets` };
    checks.profile_assets_bucket = { ok: !!hasBucket, detail: hasBucket ? 'exists' : 'missing' };
  } catch {
    checks.storage = { ok: false, detail: 'unreachable' };
  }

  const allOk = Object.values(checks).every(c => c.ok);

  return NextResponse.json({
    status: allOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    checks,
  }, { status: allOk ? 200 : 503 });
}
