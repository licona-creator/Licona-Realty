import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function skipWeekends(date: Date): Date {
  const day = date.getDay();
  if (day === 6) date.setDate(date.getDate() + 2); // Saturday -> Monday
  if (day === 0) date.setDate(date.getDate() + 1); // Sunday -> Monday
  return date;
}

function addDaysSkipWeekends(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  skipWeekends(d);
  return d.toISOString().split('T')[0];
}

function getAutoFollowUpDays(pipelineStage: string | null): number {
  switch (pipelineStage) {
    case 'new':
    case 'nurturing':
      return 3;
    case 'contacted':
    case 'qualifying':
    case 'showing':
    case 'offer':
    case 'under_contract':
    case 'closing':
      return 7;
    case 'on_hold':
      return 14;
    case 'closed':
      return 90;
    default:
      return 7;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify contact exists and belongs to user
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, pipeline_stage, user_id')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (contactError || !contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const body = await request.json();
    const { action, snooze_days, skip_type, activity_type, note } = body;

    if (!['done', 'snooze', 'skip'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // ACTION: DONE
    if (action === 'done') {
      // Create activity record
      const { data: activity, error: actError } = await supabase
        .from('activities')
        .insert({
          contact_id: id,
          user_id: user.id,
          activity_type: activity_type || 'text',
          direction: 'outbound',
          description: note?.trim() || 'Follow-up completed',
          activity_date: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (actError) {
        return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 });
      }

      // Calculate next follow-up based on pipeline stage
      const days = getAutoFollowUpDays(contact.pipeline_stage);
      const nextDate = addDaysSkipWeekends(days);

      await supabase
        .from('contacts')
        .update({
          next_follow_up_date: nextDate,
          last_contact_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      return NextResponse.json({
        next_follow_up_date: nextDate,
        activity_id: activity?.id || null,
      });
    }

    // ACTION: SNOOZE
    if (action === 'snooze') {
      const days = typeof snooze_days === 'number' && snooze_days > 0 ? snooze_days : 3;
      const nextDate = addDaysSkipWeekends(days);

      await supabase
        .from('contacts')
        .update({
          next_follow_up_date: nextDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      return NextResponse.json({ next_follow_up_date: nextDate });
    }

    // ACTION: SKIP
    if (action === 'skip') {
      let nextDate: string | null = null;
      if (skip_type === '30days') {
        nextDate = addDaysSkipWeekends(30);
      }
      // skip_type === 'remove' leaves nextDate as null

      await supabase
        .from('contacts')
        .update({
          next_follow_up_date: nextDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      return NextResponse.json({ next_follow_up_date: nextDate });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
