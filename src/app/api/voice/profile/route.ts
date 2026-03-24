/**
 * Voice Profile API
 *
 * Tracks voice engine accuracy by recording how drafts are handled:
 * - Approved unchanged: voice engine nailed it
 * - Light edit: close, small adjustments
 * - Heavy edit: needs improvement for this tone mode
 * - Full rewrite: voice engine missed the mark
 *
 * After 30 approved messages: shows voice accuracy score and style summary.
 * Monthly voice report available.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/security/logger';
import type { VoiceToneMode } from '@/types/database';

/**
 * GET /api/voice/profile - Get voice profile stats
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profiles } = await supabase
      .from('voice_profiles')
      .select('*')
      .order('tone_mode');

    // Calculate overall accuracy
    let totalApproved = 0;
    let totalMessages = 0;

    for (const p of profiles || []) {
      const total =
        p.approved_unchanged_count +
        p.light_edit_count +
        p.heavy_edit_count +
        p.full_rewrite_count;
      totalApproved += p.approved_unchanged_count + p.light_edit_count;
      totalMessages += total;
    }

    const accuracyScore =
      totalMessages > 0
        ? Math.round((totalApproved / totalMessages) * 100)
        : null;

    return NextResponse.json({
      profiles: profiles || [],
      overallAccuracy: accuracyScore,
      totalMessages,
      showAccuracy: totalMessages >= 30,
    });
  } catch (err) {
    logger.error('Voice profile GET error', { error: String(err) });
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/voice/profile - Record a voice engine feedback event
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { toneMode, editSeverity } = body as {
      toneMode: VoiceToneMode;
      editSeverity: 'unchanged' | 'light_edit' | 'heavy_edit' | 'full_rewrite';
    };

    const validSeverities = ['unchanged', 'light_edit', 'heavy_edit', 'full_rewrite'];
    if (!editSeverity || !validSeverities.includes(editSeverity)) {
      return NextResponse.json(
        { error: 'Invalid edit severity.' },
        { status: 400 }
      );
    }

    // Upsert voice profile for this tone mode
    const { data: existing } = await supabase
      .from('voice_profiles')
      .select('*')
      .eq('tone_mode', toneMode)
      .single();

    const fieldMap: Record<string, string> = {
      unchanged: 'approved_unchanged_count',
      light_edit: 'light_edit_count',
      heavy_edit: 'heavy_edit_count',
      full_rewrite: 'full_rewrite_count',
    };

    if (existing) {
      const updates: Record<string, unknown> = {
        [fieldMap[editSeverity]]: (existing[fieldMap[editSeverity] as keyof typeof existing] as number) + 1,
      };

      // Recalculate accuracy
      const total =
        (existing.approved_unchanged_count || 0) +
        (existing.light_edit_count || 0) +
        (existing.heavy_edit_count || 0) +
        (existing.full_rewrite_count || 0) +
        1;
      const approved =
        (existing.approved_unchanged_count || 0) +
        (existing.light_edit_count || 0) +
        (editSeverity === 'unchanged' || editSeverity === 'light_edit' ? 1 : 0);

      updates.accuracy_score = Math.round((approved / total) * 100);

      await supabase
        .from('voice_profiles')
        .update(updates)
        .eq('id', existing.id);
    } else {
      const newProfile: Record<string, unknown> = {
        user_id: user.id,
        tone_mode: toneMode,
        approved_unchanged_count: editSeverity === 'unchanged' ? 1 : 0,
        light_edit_count: editSeverity === 'light_edit' ? 1 : 0,
        heavy_edit_count: editSeverity === 'heavy_edit' ? 1 : 0,
        full_rewrite_count: editSeverity === 'full_rewrite' ? 1 : 0,
        accuracy_score:
          editSeverity === 'unchanged' || editSeverity === 'light_edit' ? 100 : 0,
      };

      await supabase.from('voice_profiles').insert(newProfile);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('Voice profile POST error', { error: String(err) });
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
