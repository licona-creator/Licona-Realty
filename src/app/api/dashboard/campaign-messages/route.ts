/**
 * Dashboard Campaign Messages Due API
 *
 * Returns campaign enrollments where next_message_date is today or past,
 * with message content filled in from campaign template.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface CampaignMessage {
  day: number;
  type: string;
  content: string;
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date().toISOString().split('T')[0];

    // Fetch active enrollments with next_message_date <= today
    const { data: enrollments } = await supabase
      .from('campaign_enrollments')
      .select(`
        id,
        current_step,
        contact_id,
        campaign_id,
        contacts (first_name, last_name, location_preference, budget),
        campaign_templates (name, messages)
      `)
      .eq('status', 'active')
      .lte('next_message_date', today);

    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json({ messages: [] });
    }

    const messages = enrollments.map(enrollment => {
      const contact = enrollment.contacts as unknown as Record<string, string> | null;
      const campaign = enrollment.campaign_templates as unknown as { name: string; messages: CampaignMessage[] } | null;
      const contactName = contact ? `${contact.first_name} ${contact.last_name}` : 'Unknown';
      const campaignMessages = campaign?.messages || [];
      const currentMsg = campaignMessages[enrollment.current_step] || campaignMessages[0];

      // Fill in variables
      let content = currentMsg?.content || '';
      if (contact) {
        content = content
          .replace(/\{first_name\}/g, contact.first_name || '')
          .replace(/\{location_preference\}/g, contact.location_preference || 'your area')
          .replace(/\{budget\}/g, contact.budget || 'your budget');
      }

      return {
        enrollment_id: enrollment.id,
        campaign_name: campaign?.name || 'Campaign',
        contact_id: enrollment.contact_id,
        contact_name: contactName,
        message_content: content,
        current_step: enrollment.current_step + 1,
      };
    });

    return NextResponse.json({ messages });
  } catch (err) {
    console.error('[dashboard/campaign-messages:GET]', err);
    return NextResponse.json({ messages: [] });
  }
}
