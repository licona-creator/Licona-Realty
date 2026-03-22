/**
 * Approval Queue Item Actions API
 *
 * PATCH /api/approval-queue/[id] — Approve, Edit+Approve, or Discard an item
 *
 * Hardcoded rules:
 * - Nothing external ever sends without approved status
 * - Items past scheduled send time never auto-send
 * - No auto-send fallback, no timeout override, no emergency bypass
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { writeAuditLog, getClientIP, getUserAgent } from '@/lib/security/audit';
import { validateUUID } from '@/lib/security/validation';
import { logger } from '@/lib/security/logger';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ip = getClientIP(request);
  const ua = getUserAgent(request);

  if (!validateUUID(id)) {
    return NextResponse.json({ error: 'Invalid item ID.' }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body; // 'approve' | 'edit_approve' | 'discard'

    if (!['approve', 'edit_approve', 'discard'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be approve, edit_approve, or discard.' },
        { status: 400 }
      );
    }

    // Fetch current item
    const { data: item, error: fetchError } = await supabase
      .from('approval_queue')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !item) {
      return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
    }

    if (item.status !== 'pending') {
      return NextResponse.json(
        { error: 'Item has already been processed.' },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};

    switch (action) {
      case 'approve':
        updates.status = 'approved';
        updates.approved_at = new Date().toISOString();
        break;

      case 'edit_approve':
        if (!body.content) {
          return NextResponse.json(
            { error: 'Edited content is required.' },
            { status: 400 }
          );
        }
        updates.status = 'edited_approved';
        updates.content = body.content;
        updates.content_html = body.content_html || null;
        updates.tone_mode = body.tone_mode || item.tone_mode;
        updates.approved_at = new Date().toISOString();
        // Save edit history for voice engine learning
        updates.edit_history = [
          ...(item.edit_history || []),
          {
            original: item.content,
            edited: body.content,
            tone_mode_change: body.tone_mode !== item.tone_mode ? body.tone_mode : null,
            edited_at: new Date().toISOString(),
          },
        ];
        break;

      case 'discard':
        updates.status = 'discarded';
        updates.discard_reason = body.reason || null;
        break;
    }

    // Update the item
    if (body.scheduled_time) {
      updates.scheduled_time = body.scheduled_time;
    }

    const { data: updated, error: updateError } = await supabase
      .from('approval_queue')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      logger.error('Failed to update approval item', { error: updateError.message });
      return NextResponse.json(
        { error: 'Failed to update item.' },
        { status: 500 }
      );
    }

    // Audit log
    await writeAuditLog({
      userId: user.id,
      action: 'approval_action',
      resourceType: 'approval_queue',
      resourceId: id,
      details: `${action}: ${item.item_type}`,
      ipAddress: ip,
      userAgent: ua,
    });

    return NextResponse.json({ item: updated });
  } catch (err) {
    logger.error('Approval queue PATCH error', { error: String(err) });
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
