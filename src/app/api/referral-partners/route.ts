import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { sanitizePlainText } from '@/lib/security/validation';
import { writeAuditLog, getClientIP, getUserAgent } from '@/lib/security/audit';

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rateCheck = checkRateLimit(ip, 'api');
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
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
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ partners: data || [] });
  } catch (err) {
    console.error('[referral-partners:GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rateCheck = checkRateLimit(ip, 'api');
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.first_name?.trim()) {
      return NextResponse.json({ error: 'First name is required.' }, { status: 400 });
    }

    const partnerData = {
      user_id: user.id,
      first_name: sanitizePlainText(body.first_name.trim()),
      last_name: body.last_name ? sanitizePlainText(body.last_name.trim()) : null,
      company: body.company ? sanitizePlainText(body.company.trim()) : null,
      role: body.role ? sanitizePlainText(body.role.trim()) : null,
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || null,
      language_preference: (body.language_preference || 'spanish').toLowerCase(),
      referral_fee_structure: body.referral_fee_structure ? sanitizePlainText(body.referral_fee_structure.trim()) : null,
      notes: body.notes ? sanitizePlainText(body.notes.trim()) : null,
    };

    const { data, error } = await supabase
      .from('referral_partners')
      .insert(partnerData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await writeAuditLog({
      userId: user.id,
      action: 'record_create',
      resourceType: 'referral_partner',
      resourceId: data.id,
      details: 'Created referral partner',
      ipAddress: getClientIP(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ partner: data }, { status: 201 });
  } catch (err) {
    console.error('[referral-partners:POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
