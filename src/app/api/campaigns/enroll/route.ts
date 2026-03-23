/**
 * Campaign Enrollment API
 *
 * Enrolls a contact in a selected campaign.
 * First step always goes to the approval queue.
 * System surfaces 3-5 campaign options per contact.
 *
 * If contact replies, system pauses all remaining steps
 * and moves contact to top of queue with response alert.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { writeAuditLog, getClientIP, getUserAgent } from '@/lib/security/audit';
import { validateUUID } from '@/lib/security/validation';
import { logger } from '@/lib/security/logger';

/**
 * POST /api/campaigns/enroll — Enroll a contact in a campaign
 */
export async function POST(request: Request) {
  const ip = getClientIP(request);
  const ua = getUserAgent(request);

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!validateUUID(body.contact_id) || !validateUUID(body.campaign_id)) {
      return NextResponse.json({ error: 'Valid contact and campaign IDs required.' }, { status: 400 });
    }

    // Verify campaign exists and get its first step
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*, steps:campaign_steps(*)')
      .eq('id', body.campaign_id)
      .single();

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
    }

    // Check if already enrolled in this campaign
    const { data: existing } = await supabase
      .from('campaign_enrollments')
      .select('id')
      .eq('contact_id', body.contact_id)
      .eq('campaign_id', body.campaign_id)
      .eq('is_completed', false)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Contact is already enrolled in this campaign.' },
        { status: 400 }
      );
    }

    // Create enrollment
    const steps = (campaign.steps || []).sort(
      (a: { step_number: number }, b: { step_number: number }) => a.step_number - b.step_number
    );
    const firstStep = steps[0];
    const nextDue = firstStep
      ? new Date(Date.now() + firstStep.delay_days * 86400000).toISOString()
      : null;

    const { data: enrollment, error } = await supabase
      .from('campaign_enrollments')
      .insert({
        user_id: user.id,
        contact_id: body.contact_id,
        campaign_id: body.campaign_id,
        current_step: 1,
        next_step_due_at: nextDue,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to enroll contact', { error: error.message });
      return NextResponse.json({ error: 'Failed to enroll contact.' }, { status: 500 });
    }

    // Queue the first step in the approval queue
    if (firstStep) {
      // Get contact info for the message
      const { data: contact } = await supabase
        .from('contacts')
        .select('first_name, language_preference')
        .eq('id', body.contact_id)
        .single();

      await supabase.from('approval_queue').insert({
        user_id: user.id,
        item_type: 'campaign_email',
        recipient_contact_id: body.contact_id,
        subject: firstStep.subject,
        content: firstStep.body_template.replace(
          /\{\{first_name\}\}/g,
          contact?.first_name || 'there'
        ),
        scheduled_time: nextDue,
        trigger_source: `Campaign: ${campaign.name} (Step 1)`,
        tone_mode: firstStep.tone_mode,
      });
    }

    // Update contact with selected campaign
    await supabase
      .from('contacts')
      .update({
        selected_drip_campaign: body.campaign_id,
        campaign_enrollment_status: 'enrolled',
      })
      .eq('id', body.contact_id);

    await writeAuditLog({
      userId: user.id,
      action: 'record_create',
      resourceType: 'campaign_enrollment',
      resourceId: enrollment.id,
      details: `Enrolled in campaign: ${campaign.name}`,
      ipAddress: ip,
      userAgent: ua,
    });

    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (err) {
    logger.error('Campaign enroll error', { error: String(err) });
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
