/**
 * Campaigns API
 *
 * Multi-option drip campaign system.
 * Every contact assignment surfaces 3-5 tailored options.
 * Agent always chooses. No auto-enrollment without agent awareness.
 *
 * All drafted messages go through voice engine then to approval queue.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { writeAuditLog, getClientIP, getUserAgent } from '@/lib/security/audit';
import { sanitizeInput } from '@/lib/security/validation';
import { logger } from '@/lib/security/logger';

const VALID_TRACK_TYPES = ['buyer', 'seller', 'landlord', 'tenant', 'investor'];
const VALID_TONES = [
  'warm_relationship', 'direct_action', 'educational', 'soft_touch',
  'high_frequency', 'bilingual_mixed', 'bilingual_professional',
  'investor_analytical', 'empathetic', 'celebratory',
];

/**
 * GET /api/campaigns — List campaigns with optional filtering
 */
export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const trackType = url.searchParams.get('track_type');
    const tone = url.searchParams.get('tone');

    let query = supabase
      .from('campaigns')
      .select(`
        *,
        steps:campaign_steps (*)
      `)
      .eq('is_active', true)
      .order('name');

    if (trackType && VALID_TRACK_TYPES.includes(trackType)) {
      query = query.eq('track_type', trackType);
    }
    if (tone && VALID_TONES.includes(tone)) {
      query = query.eq('tone', tone);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to fetch campaigns', { error: error.message });
      return NextResponse.json({ error: 'Failed to fetch campaigns.' }, { status: 500 });
    }

    return NextResponse.json({ campaigns: data || [] });
  } catch (err) {
    logger.error('Campaigns GET error', { error: String(err) });
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

/**
 * POST /api/campaigns — Create a new campaign
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

    if (!body.name) {
      return NextResponse.json({ error: 'Campaign name required.' }, { status: 400 });
    }
    if (!VALID_TRACK_TYPES.includes(body.track_type)) {
      return NextResponse.json({ error: 'Valid track type required.' }, { status: 400 });
    }
    if (!VALID_TONES.includes(body.tone)) {
      return NextResponse.json({ error: 'Valid tone required.' }, { status: 400 });
    }

    // Create campaign
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert({
        user_id: user.id,
        name: sanitizeInput(body.name, 200),
        track_type: body.track_type,
        tone: body.tone,
        description: body.description ? sanitizeInput(body.description, 1000) : null,
        is_system_template: false,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create campaign', { error: error.message });
      return NextResponse.json({ error: 'Failed to create campaign.' }, { status: 500 });
    }

    // Create campaign steps if provided
    if (body.steps && Array.isArray(body.steps)) {
      const stepsData = body.steps.map((step: Record<string, unknown>, i: number) => ({
        campaign_id: campaign.id,
        step_number: i + 1,
        delay_days: step.delay_days || 0,
        subject: step.subject ? sanitizeInput(step.subject as string, 200) : null,
        body_template: sanitizeInput(step.body_template as string, 5000),
        tone_mode: step.tone_mode || 'professional_personal',
        channel: 'email',
      }));

      await supabase.from('campaign_steps').insert(stepsData);
    }

    await writeAuditLog({
      userId: user.id,
      action: 'record_create',
      resourceType: 'campaign',
      resourceId: campaign.id,
      details: `Created ${body.track_type} campaign: ${body.name}`,
      ipAddress: ip,
      userAgent: ua,
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (err) {
    logger.error('Campaigns POST error', { error: String(err) });
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
