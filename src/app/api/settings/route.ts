/**
 * Agent Settings API
 *
 * GET  - Returns the current user's agent_settings row (or defaults).
 * PUT  - Upserts the current user's agent_settings row.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('agent_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[settings:GET]', error);
      return NextResponse.json(
        { error: error.message, details: error.details, hint: error.hint, code: error.code },
        { status: 500 }
      );
    }

    return NextResponse.json({ settings: data || {} });
  } catch (err) {
    console.error('[settings:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Unexpected server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Only allow known columns
    const allowed = [
      'profile_name', 'profile_phone', 'profile_email', 'profile_bio',
      'profile_tagline', 'profile_title', 'profile_brokerage', 'profile_license',
      'profile_website', 'profile_instagram',
      'brand_logo_url', 'brand_headshot_url',
      'notification_preferences', 'campaign_preferences', 'platform_preferences',
    ];

    const payload: Record<string, unknown> = { user_id: user.id, updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (key in body) {
        payload[key] = body[key];
      }
    }

    const { data, error } = await supabase
      .from('agent_settings')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('[settings:PUT]', error);
      return NextResponse.json(
        { error: error.message, details: error.details, hint: error.hint, code: error.code },
        { status: 500 }
      );
    }

    return NextResponse.json({ settings: data });
  } catch (err) {
    console.error('[settings:PUT] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Unexpected server error' },
      { status: 500 }
    );
  }
}
