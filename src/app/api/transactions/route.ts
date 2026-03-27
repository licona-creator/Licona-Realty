/**
 * Transactions API
 *
 * Full transaction pipeline with key dates, checklists,
 * parties, commission tracking, and DocuSign integration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { validateUUID, sanitizePlainText } from '@/lib/security/validation';

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rateCheck = checkRateLimit(ip, 'api');
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log('[DEBUG transactions:GET] Auth result:', {
      userId: user?.id,
      email: user?.email,
      error: authError?.message,
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated', authError: authError?.message },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const trackType = searchParams.get('track_type');

    let query = supabase
      .from('transactions')
      .select('*, contacts(first_name, last_name, email, phone)')
      .order('closing_date', { ascending: true });

    if (status) query = query.eq('status', status.toLowerCase());
    if (trackType) query = query.eq('track_type', trackType.toLowerCase());

    const { data, error } = await query;

    if (error) {
      console.error('[transactions:GET]', error);
      return NextResponse.json(
        { error: error.message, details: error.details, hint: error.hint, code: error.code },
        { status: 500 }
      );
    }

    // Calculate pipeline value
    const pipelineValue = (data || [])
      .filter(t => !['closed', 'lost'].includes(t.status))
      .reduce((sum, t) => sum + (t.contract_price || 0), 0);

    const closedValue = (data || [])
      .filter(t => t.status === 'closed')
      .reduce((sum, t) => sum + (t.commission_net || 0), 0);

    return NextResponse.json({
      transactions: data || [],
      pipelineValue,
      closedValue,
      count: (data || []).length,
    });
  } catch (err) {
    console.error('[transactions:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Unexpected server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rateCheckPost = checkRateLimit(ip, 'api');
  if (!rateCheckPost.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log('[DEBUG transactions:POST] Auth result:', {
      userId: user?.id,
      email: user?.email,
      error: authError?.message,
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated', authError: authError?.message },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      contact_id, track_type, property_address, property_city,
      property_state, property_zip, deal_type, contract_price,
      closing_date, parties, notes,
    } = body;

    if (!contact_id || !validateUUID(contact_id)) {
      return NextResponse.json({ error: 'Valid contact ID required' }, { status: 400 });
    }
    if (!property_address || !track_type) {
      return NextResponse.json({ error: 'Property address and track type required' }, { status: 400 });
    }

    // Default checklist based on track type
    const normalizedTrackType = track_type.toLowerCase();
    const defaultChecklist = getDefaultChecklist(normalizedTrackType);

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        contact_id,
        track_type: normalizedTrackType,
        property_address: sanitizePlainText(property_address),
        property_city: property_city ? sanitizePlainText(property_city) : null,
        property_state: property_state || null,
        property_zip: property_zip || null,
        deal_type: deal_type || null,
        status: 'active',
        contract_price: contract_price || null,
        closing_date: closing_date || null,
        checklist: defaultChecklist,
        parties: parties || [],
        notes: notes ? [{ id: crypto.randomUUID(), content: sanitizePlainText(notes), created_at: new Date().toISOString() }] : [],
      })
      .select()
      .single();

    if (error) {
      console.error('[transactions:POST]', error);
      return NextResponse.json(
        { error: error.message, details: error.details, hint: error.hint, code: error.code },
        { status: 500 }
      );
    }

    // Auto-update contact pipeline_stage to 'under_contract'
    if (contact_id) {
      await supabase
        .from('contacts')
        .update({ pipeline_stage: 'under_contract', updated_at: new Date().toISOString() })
        .eq('id', contact_id);
    }

    return NextResponse.json({ transaction: data, pipeline_updated: true }, { status: 201 });
  } catch (err) {
    console.error('[transactions:POST] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Unexpected server error' },
      { status: 500 }
    );
  }
}

function getDefaultChecklist(trackType: string) {
  const common = [
    { id: crypto.randomUUID(), label: 'Contract executed', is_completed: false, due_date: null, completed_at: null },
    { id: crypto.randomUUID(), label: 'Earnest money deposited', is_completed: false, due_date: null, completed_at: null },
    { id: crypto.randomUUID(), label: 'Title company engaged', is_completed: false, due_date: null, completed_at: null },
    { id: crypto.randomUUID(), label: 'Final walkthrough', is_completed: false, due_date: null, completed_at: null },
    { id: crypto.randomUUID(), label: 'Closing day', is_completed: false, due_date: null, completed_at: null },
  ];

  if (trackType === 'buyer') {
    return [
      { id: crypto.randomUUID(), label: 'Pre-approval letter received', is_completed: false, due_date: null, completed_at: null },
      { id: crypto.randomUUID(), label: 'Option period begins', is_completed: false, due_date: null, completed_at: null },
      { id: crypto.randomUUID(), label: 'Inspection completed', is_completed: false, due_date: null, completed_at: null },
      { id: crypto.randomUUID(), label: 'Appraisal ordered', is_completed: false, due_date: null, completed_at: null },
      { id: crypto.randomUUID(), label: 'Appraisal received', is_completed: false, due_date: null, completed_at: null },
      ...common,
    ];
  }

  if (trackType === 'seller') {
    return [
      { id: crypto.randomUUID(), label: 'Listing agreement signed', is_completed: false, due_date: null, completed_at: null },
      { id: crypto.randomUUID(), label: 'Professional photos taken', is_completed: false, due_date: null, completed_at: null },
      { id: crypto.randomUUID(), label: 'Listed on MLS', is_completed: false, due_date: null, completed_at: null },
      { id: crypto.randomUUID(), label: 'Seller disclosures completed', is_completed: false, due_date: null, completed_at: null },
      ...common,
    ];
  }

  return common;
}
