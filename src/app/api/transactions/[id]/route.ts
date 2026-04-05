/**
 * Transaction Detail API
 *
 * GET/PATCH/DELETE for individual transactions.
 * Checklist updates, party management, status transitions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { validateUUID, sanitizePlainText } from '@/lib/security/validation';
import { writeAuditLog, getClientIP, getUserAgent } from '@/lib/security/audit';
import { createClosingCalendarEvent, createWalkthroughCalendarEvent } from '@/lib/sync/calendar-actions';
import { getDisplayName } from '@/lib/format';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rateCheck = checkRateLimit(ip, 'api');
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  if (!validateUUID(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('transactions')
    .select('*, contacts(first_name, last_name, email, phone)')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  }

  return NextResponse.json({ transaction: data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rateCheckPatch = checkRateLimit(ip, 'api');
  if (!rateCheckPatch.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  if (!validateUUID(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  // Allowed fields
  if (body.status) updates.status = body.status.toLowerCase();
  if (body.contract_price !== undefined) updates.contract_price = body.contract_price;
  if (body.closing_date !== undefined) updates.closing_date = body.closing_date;
  if (body.property_address) updates.property_address = sanitizePlainText(body.property_address);
  if (body.property_city !== undefined) updates.property_city = body.property_city ? sanitizePlainText(body.property_city) : null;
  if (body.property_state !== undefined) updates.property_state = body.property_state || null;
  if (body.property_zip !== undefined) updates.property_zip = body.property_zip || null;
  if (body.track_type) updates.track_type = body.track_type.toLowerCase();
  if (body.transaction_type) updates.transaction_type = body.transaction_type;
  if (body.contact_id) updates.contact_id = body.contact_id;
  if (body.checklist) updates.checklist = body.checklist;
  if (body.parties) updates.parties = body.parties;
  if (body.key_dates) updates.key_dates = body.key_dates;
  if (body.commission_gross !== undefined) updates.commission_gross = body.commission_gross;
  if (body.commission_broker_split !== undefined) updates.commission_broker_split = body.commission_broker_split;
  if (body.commission_net !== undefined) updates.commission_net = body.commission_net;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.docusign_envelope_ids) updates.docusign_envelope_ids = body.docusign_envelope_ids;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  // Support commission_rate and referral_fee
  if (body.commission_rate !== undefined) updates.commission_rate = body.commission_rate;
  if (body.referral_fee !== undefined) updates.referral_fee = body.referral_fee;

  // Fetch existing transaction before update for closing_date comparison
  const { data: existingTx } = await supabase
    .from('transactions')
    .select('closing_date, calendar_event_ids, contact_id')
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .select('*, contacts(first_name, last_name, email, phone)')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
  }

  // Auto-update contact pipeline when transaction status changes to 'closed'
  if (body.status === 'closed' && data?.contact_id) {
    await supabase
      .from('contacts')
      .update({ pipeline_stage: 'closed', updated_at: new Date().toISOString() })
      .eq('id', data.contact_id);
  }

  // Calendar sync: create closing + walkthrough events when closing_date changes
  if (body.closing_date !== undefined && existingTx) {
    try {
      const oldDate = existingTx.closing_date;
      const newDate = body.closing_date || null;

      if (newDate && newDate !== oldDate && data?.contacts) {
        const contactName = getDisplayName(data.contacts);
        const txData = {
          property_address: data.property_address,
          contact_name: contactName,
          closing_date: newDate,
        };

        const [closingEventId, walkthroughEventId] = await Promise.all([
          createClosingCalendarEvent(supabase, txData),
          createWalkthroughCalendarEvent(supabase, txData),
        ]);

        const calendarEventIds: Record<string, string | null> = {
          closing: closingEventId,
          walkthrough: walkthroughEventId,
        };

        await supabase
          .from('transactions')
          .update({ calendar_event_ids: calendarEventIds })
          .eq('id', id);
      }
    } catch (calErr) {
      // Calendar operations must never crash the transaction save
      console.error('[transactions:PATCH] Calendar sync error (non-fatal):', calErr);
    }
  }

  await writeAuditLog({
    userId: user.id,
    action: 'record_update',
    resourceType: 'transaction',
    resourceId: id,
    details: `Updated fields: ${Object.keys(updates).filter(k => k !== 'updated_at').join(', ')}`,
    ipAddress: getClientIP(request),
    userAgent: getUserAgent(request),
  });

  return NextResponse.json({ transaction: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rateCheckDel = checkRateLimit(ip, 'api');
  if (!rateCheckDel.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  if (!validateUUID(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 });
    }

    await writeAuditLog({
      userId: user.id,
      action: 'record_delete',
      resourceType: 'transaction',
      resourceId: id,
      details: 'Transaction deleted',
      ipAddress: getClientIP(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[transactions:DELETE]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
