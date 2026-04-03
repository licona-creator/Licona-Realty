import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('licona_device_session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ valid: false, reason: 'timeout' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    // Verify Supabase auth session is still valid
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ valid: false, reason: 'timeout' }, { status: 401 });
    }

    const { data: session } = await supabase
      .from('user_sessions')
      .select('is_active, last_active_at')
      .eq('session_token', sessionToken)
      .single();

    if (!session) {
      return NextResponse.json({ valid: false, reason: 'timeout' }, { status: 401 });
    }

    if (!session.is_active) {
      return NextResponse.json({ valid: false, reason: 'device' }, { status: 401 });
    }

    const lastActive = new Date(session.last_active_at).getTime();
    if (Date.now() - lastActive > TWO_HOURS_MS) {
      // Mark session as expired
      await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('session_token', sessionToken);
      return NextResponse.json({ valid: false, reason: 'timeout' }, { status: 401 });
    }

    // Session is valid, update last_active_at
    await supabase
      .from('user_sessions')
      .update({ last_active_at: new Date().toISOString() })
      .eq('session_token', sessionToken);

    return NextResponse.json({ valid: true });
  } catch {
    // Auth verification failed - session is not verifiable, treat as invalid
    return NextResponse.json({ valid: false, reason: 'error' }, { status: 401 });
  }
}
