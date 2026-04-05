/**
 * Milestone Action API
 *
 * Handles "sent" and "skip" actions for birthday and post-close milestones.
 * Creates activity records for tracking.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateUUID, sanitizeInput } from '@/lib/security/validation';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { action, contact_id, milestone_type, milestone_label, message } = body;

    if (!action || !contact_id || !milestone_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['sent', 'skip'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!['birthday', 'post_close'].includes(milestone_type)) {
      return NextResponse.json({ error: 'Invalid milestone type' }, { status: 400 });
    }

    if (!validateUUID(contact_id)) {
      return NextResponse.json({ error: 'Invalid contact ID' }, { status: 400 });
    }

    const safeLabel = milestone_label ? sanitizeInput(milestone_label, 200) : milestone_type;
    const safeMessage = message ? sanitizeInput(message, 60) : '';

    if (action === 'sent') {
      const description = safeMessage
        ? `${safeLabel} - ${safeMessage}`
        : safeLabel;

      const { data: activity, error } = await supabase
        .from('activities')
        .insert({
          contact_id,
          user_id: user.id,
          activity_type: 'text',
          direction: 'outbound',
          description,
          activity_date: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 });
      }

      return NextResponse.json({ success: true, activity_id: activity.id });
    }

    if (action === 'skip') {
      if (milestone_type === 'post_close') {
        const { error } = await supabase
          .from('activities')
          .insert({
            contact_id,
            user_id: user.id,
            activity_type: 'note',
            direction: null,
            description: `Skipped ${safeLabel}`,
            activity_date: new Date().toISOString(),
          });

        if (error) {
          return NextResponse.json({ error: 'Failed to create skip activity' }, { status: 500 });
        }
      }
      // Birthday skip: no activity needed, will not reappear until next year

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unhandled action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
