/**
 * Approval Queue API
 *
 * HIGHEST PRIORITY non-negotiable feature.
 * Nothing external ever sends without approved status.
 *
 * GET: List pending items sorted by urgency
 * POST: Create a new approval queue item (internal only)
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { writeAuditLog, getClientIP, getUserAgent } from '@/lib/security/audit';
import { logger } from '@/lib/security/logger';

/**
 * GET /api/approval-queue - List pending approval items
 * Sorted by urgency: DocuSign first (1), campaigns (2), social (3), relationship (4)
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch pending items sorted by urgency level, then scheduled time
    const { data, error, count } = await supabase
      .from('approval_queue')
      .select('*', { count: 'exact' })
      .eq('status', 'pending')
      .order('urgency_level', { ascending: true })
      .order('scheduled_time', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Failed to fetch approval queue', { error: error.message });
      return NextResponse.json(
        { error: error.message, details: error.details, hint: error.hint, code: error.code },
        { status: 500 }
      );
    }

    // Flag overdue items
    const now = new Date();
    const items = (data || []).map((item) => ({
      ...item,
      is_overdue: item.scheduled_time
        ? new Date(item.scheduled_time) < now
        : false,
    }));

    return NextResponse.json({
      items,
      pendingCount: count || 0,
    });
  } catch (err) {
    logger.error('Approval queue GET error', { error: String(err) });
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/approval-queue - Create an approval queue item
 * Only called internally by campaign engine, voice engine, scheduling, etc.
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

    // Urgency levels: 1 = DocuSign, 2 = time-sensitive campaigns, 3 = social, 4 = relationship
    const urgencyMap: Record<string, number> = {
      docusign: 1,
      campaign_email: 2,
      scheduling_confirmation: 2,
      social_post: 3,
      gbp_post: 3,
      testimonial_request: 4,
      holiday_message: 4,
      birthday_message: 4,
      anniversary_message: 4,
      referral_ask: 4,
      mortgage_results_email: 2,
      auto_response: 2,
      review_response: 4,
    };

    const { data, error } = await supabase
      .from('approval_queue')
      .insert({
        user_id: user.id,
        item_type: body.item_type,
        recipient_contact_id: body.recipient_contact_id || null,
        subject: body.subject || null,
        content: body.content,
        content_html: body.content_html || null,
        scheduled_time: body.scheduled_time || null,
        trigger_source: body.trigger_source || null,
        tone_mode: body.tone_mode || 'professional_personal',
        urgency_level: urgencyMap[body.item_type] || 4,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create approval item', { error: error.message });
      return NextResponse.json(
        { error: error.message, details: error.details, hint: error.hint, code: error.code },
        { status: 500 }
      );
    }

    await writeAuditLog({
      userId: user.id,
      action: 'record_create',
      resourceType: 'approval_queue',
      resourceId: data.id,
      details: `Queued ${body.item_type} for approval`,
      ipAddress: ip,
      userAgent: ua,
    });

    return NextResponse.json({ item: data }, { status: 201 });
  } catch (err) {
    logger.error('Approval queue POST error', { error: String(err) });
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
