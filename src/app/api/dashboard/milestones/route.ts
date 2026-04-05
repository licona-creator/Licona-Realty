/**
 * Dashboard Milestones API
 *
 * Returns upcoming birthdays, holidays, post-close check-ins,
 * and gone-quiet contacts with DISC-adapted messages.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  getAllMilestones,
  getUpcomingBirthdays,
  getPostCloseCheckIns,
  type BirthdayMilestone,
  type PostCloseMilestone,
} from '@/lib/nurture/milestone-engine';
import {
  generateBirthdayMessage,
  generatePostCloseMessage,
} from '@/lib/nurture/message-generator';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Fetch contacts with birthday and nurture-relevant fields
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, birthday_month, birthday_day, birthday_year, disc_type, language_preference, track_type, created_at, phone, email')
      .eq('user_id', user.id);

    if (contactsError) {
      return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
    }

    // Fetch transactions with closing info
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('id, contact_id, property_address, status, closing_date, track_type')
      .eq('user_id', user.id);

    if (txError) {
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    // Fetch activities from last year for completion detection and silence detection
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const { data: activities, error: actError } = await supabase
      .from('activities')
      .select('id, contact_id, activity_type, direction, description, activity_date')
      .eq('user_id', user.id)
      .gte('activity_date', oneYearAgo.toISOString());

    if (actError) {
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
    }

    const safeContacts = contacts || [];
    const safeTx = transactions || [];
    const safeActs = activities || [];
    const now = new Date();

    // Get all milestones
    const milestones = getAllMilestones(safeContacts, safeTx, safeActs, now);

    // Generate messages for birthday and post-close milestones
    const milestonesWithMessages = milestones.map(m => {
      if (m.type === 'birthday') {
        const bm = m as BirthdayMilestone;
        const msg = generateBirthdayMessage(bm.contact, bm.turning_age);
        return { ...m, message: msg.message, recommended_channel: msg.recommended_channel };
      }
      if (m.type === 'post_close') {
        const pc = m as PostCloseMilestone;
        const msg = generatePostCloseMessage(
          pc.contact,
          pc.milestone_type,
          pc.milestone_label,
          pc.property_address
        );
        return { ...m, message: msg.message, recommended_channel: msg.recommended_channel };
      }
      return m;
    });

    // Count birthdays this week
    const birthdaysThisWeek = getUpcomingBirthdays(safeContacts, 7, now);
    const postCloseAll = getPostCloseCheckIns(safeContacts, safeTx, safeActs, now);
    const postCloseOverdue = postCloseAll.filter(m => m.days_until < 0).length;

    // Also count post-close due within 7 days for stat pill
    const postCloseDueSoon = postCloseAll.filter(m => m.days_until >= 0 && m.days_until <= 7).length;

    return NextResponse.json({
      milestones: milestonesWithMessages,
      birthday_count_this_week: birthdaysThisWeek.length,
      post_close_overdue: postCloseOverdue,
      post_close_due_soon: postCloseDueSoon,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
