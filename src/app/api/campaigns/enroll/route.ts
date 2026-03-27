/**
 * Campaign Enrollment API
 *
 * POST: Enroll a contact in a campaign_template
 * PATCH: Update enrollment status (pause/resume/stop)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { writeAuditLog, getClientIP, getUserAgent } from '@/lib/security/audit';
import { validateUUID } from '@/lib/security/validation';
import { logger } from '@/lib/security/logger';
import { checkRateLimit } from '@/lib/security/rate-limit';

interface CampaignMessage {
  day: number;
  type: 'text';
  content: string;
}

const VALID_ENROLLMENT_STATUSES = ['active', 'paused', 'stopped'];

/**
 * POST /api/campaigns/enroll - Enroll a contact in a campaign template
 */
export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const ua = getUserAgent(request);

  try {
    const rateCheck = checkRateLimit(ip, 'api');
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again shortly.' },
        { status: 429 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!validateUUID(body.contact_id) || !validateUUID(body.campaign_template_id)) {
      return NextResponse.json(
        { error: 'Valid contact ID and campaign template ID are required.' },
        { status: 400 }
      );
    }

    // Verify campaign template exists
    const { data: campaign } = await supabase
      .from('campaign_templates')
      .select('*')
      .eq('id', body.campaign_template_id)
      .single();

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign template not found.' }, { status: 404 });
    }

    // Check if already enrolled
    const { data: existing } = await supabase
      .from('campaign_enrollments')
      .select('id')
      .eq('contact_id', body.contact_id)
      .eq('campaign_template_id', body.campaign_template_id)
      .in('status', ['active', 'paused'])
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'Contact is already enrolled in this campaign.' },
        { status: 400 }
      );
    }

    // Calculate next_message_date based on first step day number
    const messages = (campaign.messages || []) as CampaignMessage[];
    const sortedMessages = [...messages].sort((a, b) => a.day - b.day);
    const firstStep = sortedMessages[0];

    const nextMessageDate = firstStep
      ? new Date(Date.now() + firstStep.day * 86400000).toISOString()
      : null;

    const { data: enrollment, error } = await supabase
      .from('campaign_enrollments')
      .insert({
        user_id: user.id,
        contact_id: body.contact_id,
        campaign_template_id: body.campaign_template_id,
        status: 'active',
        current_step: 1,
        next_message_date: nextMessageDate,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to enroll contact', { error: error.message });
      return NextResponse.json({ error: 'Failed to enroll contact.' }, { status: 500 });
    }

    await writeAuditLog({
      userId: user.id,
      action: 'record_create',
      resourceType: 'campaign_enrollment',
      resourceId: enrollment.id,
      details: `Enrolled contact in campaign: ${campaign.name}`,
      ipAddress: ip,
      userAgent: ua,
    });

    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (err) {
    logger.error('Campaign enroll POST error', { error: String(err) });
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

/**
 * PATCH /api/campaigns/enroll - Update enrollment status (pause/resume/stop)
 */
export async function PATCH(request: NextRequest) {
  const ip = getClientIP(request);
  const ua = getUserAgent(request);

  try {
    const rateCheck = checkRateLimit(ip, 'api');
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again shortly.' },
        { status: 429 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!validateUUID(body.enrollment_id)) {
      return NextResponse.json({ error: 'Valid enrollment ID is required.' }, { status: 400 });
    }

    if (!body.status || !VALID_ENROLLMENT_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: 'Valid status is required (active, paused, stopped).' },
        { status: 400 }
      );
    }

    const { data: enrollment, error } = await supabase
      .from('campaign_enrollments')
      .update({ status: body.status })
      .eq('id', body.enrollment_id)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update enrollment', { error: error.message });
      return NextResponse.json({ error: 'Failed to update enrollment.' }, { status: 500 });
    }

    await writeAuditLog({
      userId: user.id,
      action: 'record_update',
      resourceType: 'campaign_enrollment',
      resourceId: body.enrollment_id,
      details: `Updated enrollment status to: ${body.status}`,
      ipAddress: ip,
      userAgent: ua,
    });

    return NextResponse.json({ enrollment });
  } catch (err) {
    logger.error('Campaign enroll PATCH error', { error: String(err) });
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
