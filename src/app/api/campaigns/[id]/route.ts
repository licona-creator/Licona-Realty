/**
 * Campaign Template Detail API
 *
 * GET: Fetch single campaign_template with enrollments and contact names
 * PATCH: Update campaign_template fields
 * DELETE: Delete campaign_template
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { writeAuditLog, getClientIP, getUserAgent } from '@/lib/security/audit';
import { sanitizeInput, validateUUID } from '@/lib/security/validation';
import { logger } from '@/lib/security/logger';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { getDisplayName } from '@/lib/format';

const VALID_STATUSES = ['active', 'paused', 'archived'];
const VALID_TRACK_TYPES = ['buyer', 'seller', 'investor'];

interface CampaignMessage {
  day: number;
  type: 'text';
  content: string;
}

interface EnrollmentRow {
  id: string;
  contact_id: string;
  status: string;
  current_step: number;
  next_message_date: string | null;
  created_at: string;
  contacts: { first_name: string | null; last_name: string | null } | null;
}

/**
 * GET /api/campaigns/[id] - Fetch campaign template with enrollments
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ip = getClientIP(request);
    const rateCheck = checkRateLimit(ip, 'api');
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again shortly.' },
        { status: 429 }
      );
    }

    if (!validateUUID(id)) {
      return NextResponse.json({ error: 'Invalid campaign ID.' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: campaign, error } = await supabase
      .from('campaign_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !campaign) {
      return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
    }

    // Fetch enrollments with contact names
    const { data: enrollments } = await supabase
      .from('campaign_enrollments')
      .select(`
        id,
        contact_id,
        status,
        current_step,
        next_message_date,
        created_at,
        contacts (first_name, last_name)
      `)
      .eq('campaign_template_id', id)
      .order('created_at', { ascending: false });

    const formattedEnrollments = (enrollments as unknown as EnrollmentRow[] || []).map(e => ({
      id: e.id,
      contact_id: e.contact_id,
      status: e.status,
      current_step: e.current_step,
      next_message_date: e.next_message_date,
      created_at: e.created_at,
      contact_name: e.contacts
        ? getDisplayName(e.contacts)
        : 'Unknown',
    }));

    return NextResponse.json({
      campaign: {
        ...campaign,
        enrollments: formattedEnrollments,
      },
    });
  } catch (err) {
    logger.error('Campaign GET [id] error', { error: String(err) });
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

/**
 * PATCH /api/campaigns/[id] - Update campaign template
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIP(request);
  const ua = getUserAgent(request);

  try {
    const { id } = await params;
    const rateCheck = checkRateLimit(ip, 'api');
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again shortly.' },
        { status: 429 }
      );
    }

    if (!validateUUID(id)) {
      return NextResponse.json({ error: 'Invalid campaign ID.' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) {
      updates.name = sanitizeInput(body.name, 200);
    }
    if (body.description !== undefined) {
      updates.description = body.description ? sanitizeInput(body.description, 1000) : null;
    }
    if (body.status !== undefined && VALID_STATUSES.includes(body.status)) {
      updates.status = body.status;
    }
    if (body.track_type !== undefined && VALID_TRACK_TYPES.includes(body.track_type)) {
      updates.track_type = body.track_type;
    }
    if (body.messages !== undefined && Array.isArray(body.messages)) {
      const messages: CampaignMessage[] = [];
      for (const msg of body.messages) {
        if (typeof msg.day !== 'number' || msg.day < 0) continue;
        if (msg.type !== 'text') continue;
        if (!msg.content || typeof msg.content !== 'string') continue;
        messages.push({
          day: msg.day,
          type: 'text',
          content: sanitizeInput(msg.content, 2000),
        });
      }
      updates.messages = messages;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
    }

    const { data: campaign, error } = await supabase
      .from('campaign_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update campaign template', { error: error.message });
      return NextResponse.json({ error: 'Failed to update campaign.' }, { status: 500 });
    }

    await writeAuditLog({
      userId: user.id,
      action: 'record_update',
      resourceType: 'campaign_template',
      resourceId: id,
      details: `Updated campaign template fields: ${Object.keys(updates).join(', ')}`,
      ipAddress: ip,
      userAgent: ua,
    });

    return NextResponse.json({ campaign });
  } catch (err) {
    logger.error('Campaign PATCH [id] error', { error: String(err) });
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

/**
 * DELETE /api/campaigns/[id] - Delete campaign template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIP(request);
  const ua = getUserAgent(request);

  try {
    const { id } = await params;
    const rateCheck = checkRateLimit(ip, 'api');
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again shortly.' },
        { status: 429 }
      );
    }

    if (!validateUUID(id)) {
      return NextResponse.json({ error: 'Invalid campaign ID.' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('campaign_templates')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Failed to delete campaign template', { error: error.message });
      return NextResponse.json({ error: 'Failed to delete campaign.' }, { status: 500 });
    }

    await writeAuditLog({
      userId: user.id,
      action: 'record_delete',
      resourceType: 'campaign_template',
      resourceId: id,
      details: 'Deleted campaign template',
      ipAddress: ip,
      userAgent: ua,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('Campaign DELETE [id] error', { error: String(err) });
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
