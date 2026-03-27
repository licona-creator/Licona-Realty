/**
 * Mortgage Quick Lead Capture API
 *
 * Public endpoint for quick lead capture after mortgage calculation.
 * Creates contact with lead_source 'mortgage_calculator' and logs calculator inputs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { validatePhone, sanitizePlainText } from '@/lib/security/validation';
import { writeAuditLog, getClientIP, getUserAgent } from '@/lib/security/audit';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rateCheck = checkRateLimit(ip, 'public');
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const body = await request.json();

    if (!body.visitor_name || !body.visitor_phone) {
      return NextResponse.json({ error: 'Name and phone are required.' }, { status: 400 });
    }

    const phoneResult = validatePhone(body.visitor_phone);
    if (!phoneResult.valid) {
      return NextResponse.json({ error: 'Invalid phone number.' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 1 });
    const agentId = users?.users?.[0]?.id;
    if (!agentId) {
      return NextResponse.json({ error: 'System not configured' }, { status: 500 });
    }

    const visitorName = sanitizePlainText(body.visitor_name);
    const nameParts = visitorName.split(' ');
    const firstName = nameParts[0] || visitorName;
    const lastName = nameParts.slice(1).join(' ') || '';

    // Check for existing contact by phone
    const { data: existingContact } = await admin
      .from('contacts')
      .select('id')
      .eq('phone', phoneResult.sanitized)
      .eq('user_id', agentId)
      .eq('is_deleted', false)
      .limit(1)
      .single();

    let contactId: string;

    if (existingContact) {
      contactId = existingContact.id;
    } else {
      const { data: newContact, error: contactError } = await admin
        .from('contacts')
        .insert({
          user_id: agentId,
          first_name: firstName,
          last_name: lastName,
          phone: phoneResult.sanitized,
          email: body.visitor_email || null,
          track_type: 'buyer',
          pipeline_stage: 'new',
          lead_source: 'mortgage_calculator',
          lead_score: 60,
        })
        .select('id')
        .single();

      if (contactError || !newContact) {
        return NextResponse.json({ error: 'Failed to process lead.' }, { status: 500 });
      }
      contactId = newContact.id;
    }

    // Log calculator inputs as activity note
    const inputs = body.calculator_inputs || {};
    const noteLines = [
      'Mortgage calculator lead capture.',
      inputs.annual_income ? `Annual income: $${Number(inputs.annual_income).toLocaleString()}` : null,
      inputs.monthly_debts ? `Monthly debts: $${Number(inputs.monthly_debts).toLocaleString()}` : null,
      inputs.down_payment ? `Down payment: $${Number(inputs.down_payment).toLocaleString()}` : null,
      inputs.credit_score_range ? `Credit score: ${inputs.credit_score_range}` : null,
      inputs.desired_location ? `Location: ${sanitizePlainText(inputs.desired_location)}` : null,
    ].filter(Boolean).join(' | ');

    await admin.from('activities').insert({
      user_id: agentId,
      contact_id: contactId,
      activity_type: 'note',
      description: noteLines,
      activity_date: new Date().toISOString(),
    });

    await writeAuditLog({
      userId: agentId,
      action: 'record_create',
      resourceType: 'contact',
      resourceId: contactId,
      details: 'Mortgage calculator quick lead capture',
      ipAddress: getClientIP(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error('[mortgage/lead:POST]', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
