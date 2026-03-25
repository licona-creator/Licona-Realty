/**
 * Debug Diagnostic Endpoint
 *
 * Public endpoint (no auth required) to diagnose auth + DB connectivity.
 * Returns session state, DB connection status, and env config info.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    // 1. Check cookies
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const cookieNames = allCookies.map(c => c.name);

    // 2. Check auth via normal (RLS-respecting) client
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // 3. Test DB query via normal client (subject to RLS)
    const { data: rlsData, error: rlsError } = await supabase
      .from('agent_settings')
      .select('id')
      .limit(1);

    // 4. Test DB query via admin client (bypasses RLS)
    let adminDbOk = false;
    let adminDbError: string | null = null;
    let adminRowCount: number | null = null;
    try {
      const admin = createAdminClient();
      const { data: adminData, error: adminErr } = await admin
        .from('agent_settings')
        .select('id')
        .limit(1);
      adminDbOk = !adminErr;
      adminDbError = adminErr?.message || null;
      adminRowCount = adminData?.length ?? null;
    } catch (e: unknown) {
      adminDbError = e instanceof Error ? e.message : String(e);
    }

    // 5. Test contacts table via admin
    let contactsOk = false;
    let contactsError: string | null = null;
    try {
      const admin = createAdminClient();
      const { error: cErr } = await admin
        .from('contacts')
        .select('id')
        .limit(1);
      contactsOk = !cErr;
      contactsError = cErr?.message || null;
    } catch (e: unknown) {
      contactsError = e instanceof Error ? e.message : String(e);
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      auth: {
        authenticated: !!user,
        userId: user?.id || null,
        email: user?.email || null,
        authError: authError?.message || null,
      },
      cookies: {
        count: allCookies.length,
        names: cookieNames,
        hasSupabaseAuth: cookieNames.some(n => n.startsWith('sb-')),
      },
      db: {
        rlsQuery: {
          ok: !rlsError,
          error: rlsError?.message || null,
          rowCount: rlsData?.length ?? null,
        },
        adminQuery: {
          ok: adminDbOk,
          error: adminDbError,
          rowCount: adminRowCount,
        },
        contactsTable: {
          ok: contactsOk,
          error: contactsError,
        },
      },
      env: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 40) || 'NOT SET',
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'NOT SET',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack?.substring(0, 300) : undefined;
    return NextResponse.json({
      error: message,
      stack,
    }, { status: 500 });
  }
}
