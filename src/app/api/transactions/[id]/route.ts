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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (!checkRateLimit(ip, 'api')) {
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
  if (!checkRateLimit(ip, 'api')) {
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
  if (body.status) updates.status = body.status;
  if (body.contract_price !== undefined) updates.contract_price = body.contract_price;
  if (body.closing_date !== undefined) updates.closing_date = body.closing_date;
  if (body.property_address) updates.property_address = sanitizePlainText(body.property_address);
  if (body.checklist) updates.checklist = body.checklist;
  if (body.parties) updates.parties = body.parties;
  if (body.key_dates) updates.key_dates = body.key_dates;
  if (body.commission_gross !== undefined) updates.commission_gross = body.commission_gross;
  if (body.commission_broker_split !== undefined) updates.commission_broker_split = body.commission_broker_split;
  if (body.commission_net !== undefined) updates.commission_net = body.commission_net;
  if (body.notes) updates.notes = body.notes;
  if (body.docusign_envelope_ids) updates.docusign_envelope_ids = body.docusign_envelope_ids;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
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
