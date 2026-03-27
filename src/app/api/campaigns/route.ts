/**
 * Campaigns API - Campaign Templates
 *
 * GET: Fetch campaign_templates with enrollment counts
 * POST: Create new campaign_template with messages jsonb
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { writeAuditLog, getClientIP, getUserAgent } from '@/lib/security/audit';
import { sanitizeInput } from '@/lib/security/validation';
import { logger } from '@/lib/security/logger';
import { checkRateLimit } from '@/lib/security/rate-limit';

const VALID_TRACK_TYPES = ['buyer', 'seller', 'investor'];
const VALID_STATUSES = ['active', 'paused', 'archived'];

interface CampaignMessage {
  day: number;
  type: 'text';
  content: string;
}

/**
 * GET /api/campaigns - List campaign templates with enrollment counts
 */
export async function GET(request: NextRequest) {
  try {
    const ip = getClientIP(request);
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

    const url = new URL(request.url);
    const trackType = url.searchParams.get('track_type');

    let query = supabase
      .from('campaign_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (trackType && VALID_TRACK_TYPES.includes(trackType)) {
      query = query.eq('track_type', trackType);
    }

    const { data: templates, error } = await query;

    if (error) {
      logger.error('Failed to fetch campaign templates', { error: error.message });
      return NextResponse.json({ error: 'Failed to fetch campaigns.' }, { status: 500 });
    }

    // Fetch enrollment counts grouped by campaign_template_id
    const templateIds = (templates || []).map(t => t.id);
    let enrollmentCounts: Record<string, number> = {};

    if (templateIds.length > 0) {
      const { data: enrollments } = await supabase
        .from('campaign_enrollments')
        .select('campaign_template_id')
        .in('campaign_template_id', templateIds);

      if (enrollments) {
        enrollmentCounts = enrollments.reduce((acc: Record<string, number>, row) => {
          const key = row.campaign_template_id as string;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
      }
    }

    const campaigns = (templates || []).map(t => ({
      ...t,
      enrolled_count: enrollmentCounts[t.id] || 0,
    }));

    return NextResponse.json({ campaigns });
  } catch (err) {
    logger.error('Campaigns GET error', { error: String(err) });
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

/**
 * POST /api/campaigns - Create a new campaign template
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

    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'Campaign name is required.' }, { status: 400 });
    }

    if (!body.track_type || !VALID_TRACK_TYPES.includes(body.track_type)) {
      return NextResponse.json({ error: 'Valid track type is required (buyer, seller, investor).' }, { status: 400 });
    }

    // Validate messages array
    const messages: CampaignMessage[] = [];
    if (body.messages && Array.isArray(body.messages)) {
      for (const msg of body.messages) {
        if (typeof msg.day !== 'number' || msg.day < 0) {
          return NextResponse.json({ error: 'Each message step must have a valid day number.' }, { status: 400 });
        }
        if (msg.type !== 'text') {
          return NextResponse.json({ error: 'Message type must be "text".' }, { status: 400 });
        }
        if (!msg.content || typeof msg.content !== 'string') {
          return NextResponse.json({ error: 'Each message step must have content.' }, { status: 400 });
        }
        messages.push({
          day: msg.day,
          type: 'text',
          content: sanitizeInput(msg.content, 2000),
        });
      }
    }

    const status = body.status && VALID_STATUSES.includes(body.status) ? body.status : 'active';

    const { data: campaign, error } = await supabase
      .from('campaign_templates')
      .insert({
        user_id: user.id,
        name: sanitizeInput(body.name, 200),
        track_type: body.track_type,
        description: body.description ? sanitizeInput(body.description, 1000) : null,
        status,
        messages,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create campaign template', { error: error.message });
      return NextResponse.json({ error: 'Failed to create campaign.' }, { status: 500 });
    }

    await writeAuditLog({
      userId: user.id,
      action: 'record_create',
      resourceType: 'campaign_template',
      resourceId: campaign.id,
      details: `Created ${body.track_type} campaign: ${sanitizeInput(body.name, 200)}`,
      ipAddress: ip,
      userAgent: ua,
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (err) {
    logger.error('Campaigns POST error', { error: String(err) });
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
