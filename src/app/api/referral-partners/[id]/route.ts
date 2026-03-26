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
  if (!validateUUID(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('referral_partners')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    // Also fetch contacts referred by this partner
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, track_type, pipeline_stage, phone, email, created_at')
      .eq('referral_partner_id', id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    // Fetch transactions for those contacts
    const contactIds = (contacts || []).map(c => c.id);
    let transactions: Array<Record<string, unknown>> = [];
    if (contactIds.length > 0) {
      const { data: txData } = await supabase
        .from('transactions')
        .select('id, property_address, status, contract_price, closing_date, contact_id')
        .in('contact_id', contactIds);
      transactions = txData || [];
    }

    // Calculate dynamic stats
    const partnerContacts = contacts || [];
    const closedContacts = partnerContacts.filter(c => c.pipeline_stage === 'closed' || c.pipeline_stage === 'closing');
    const closedContactIds = closedContacts.map(c => c.id);
    const revenue = transactions
      .filter(tx => closedContactIds.includes(tx.contact_id as string))
      .reduce((sum, tx) => sum + ((tx.contract_price as number) || 0), 0);

    const partnerWithStats = {
      ...data,
      total_leads_sent: partnerContacts.length,
      total_closings: closedContacts.length,
      total_revenue_generated: revenue,
    };

    return NextResponse.json({ partner: partnerWithStats, contacts: contacts || [], transactions });
  } catch (err) {
    console.error('[referral-partners:GET:id]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!validateUUID(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.first_name !== undefined) updates.first_name = sanitizePlainText(body.first_name.trim());
    if (body.last_name !== undefined) updates.last_name = body.last_name ? sanitizePlainText(body.last_name.trim()) : null;
    if (body.company !== undefined) updates.company = body.company ? sanitizePlainText(body.company.trim()) : null;
    if (body.role !== undefined) updates.role = body.role ? sanitizePlainText(body.role.trim()) : null;
    if (body.phone !== undefined) updates.phone = body.phone?.trim() || null;
    if (body.email !== undefined) updates.email = body.email?.trim() || null;
    if (body.language_preference !== undefined) updates.language_preference = (body.language_preference || 'spanish').toLowerCase();
    if (body.referral_fee_structure !== undefined) updates.referral_fee_structure = body.referral_fee_structure ? sanitizePlainText(body.referral_fee_structure.trim()) : null;
    if (body.notes !== undefined) updates.notes = body.notes ? sanitizePlainText(body.notes.trim()) : null;
    if (body.total_leads_sent !== undefined) updates.total_leads_sent = body.total_leads_sent;
    if (body.total_closings !== undefined) updates.total_closings = body.total_closings;
    if (body.total_revenue_generated !== undefined) updates.total_revenue_generated = body.total_revenue_generated;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('referral_partners')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update partner' }, { status: 500 });
    }

    await writeAuditLog({
      userId: user.id,
      action: 'record_update',
      resourceType: 'referral_partner',
      resourceId: id,
      details: `Updated fields: ${Object.keys(updates).filter(k => k !== 'updated_at').join(', ')}`,
      ipAddress: getClientIP(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ partner: data });
  } catch (err) {
    console.error('[referral-partners:PATCH]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!validateUUID(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Unlink contacts first
    await supabase
      .from('contacts')
      .update({ referral_partner_id: null })
      .eq('referral_partner_id', id);

    const { error } = await supabase
      .from('referral_partners')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete partner' }, { status: 500 });
    }

    await writeAuditLog({
      userId: user.id,
      action: 'record_delete',
      resourceType: 'referral_partner',
      resourceId: id,
      details: 'Partner deleted',
      ipAddress: getClientIP(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[referral-partners:DELETE]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
