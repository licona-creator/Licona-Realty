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

    // Calculate dynamic stats for each partner
    const partnerIds = (data || []).map(p => p.id);
    let contacts: Array<{ referral_partner_id: string; pipeline_stage: string; id: string }> = [];
    if (partnerIds.length > 0) {
      const { data: contactData } = await supabase
        .from('contacts')
        .select('id, referral_partner_id, pipeline_stage')
        .in('referral_partner_id', partnerIds)
        .eq('is_deleted', false);
      contacts = contactData || [];
    }

    // Fetch transactions for all referred contacts
    const contactIds = contacts.map(c => c.id);
    let transactions: Array<{ contact_id: string; contract_price: number | null }> = [];
    if (contactIds.length > 0) {
      const { data: txData } = await supabase
        .from('transactions')
        .select('contact_id, contract_price')
        .in('contact_id', contactIds);
      transactions = txData || [];
    }

    const partnersWithStats = (data || []).map(partner => {
      const partnerContacts = contacts.filter(c => c.referral_partner_id === partner.id);
      const closedContacts = partnerContacts.filter(c => c.pipeline_stage === 'closed' || c.pipeline_stage === 'closing');
      const closedContactIds = closedContacts.map(c => c.id);
      const revenue = transactions
        .filter(tx => closedContactIds.includes(tx.contact_id))
        .reduce((sum, tx) => sum + (tx.contract_price || 0), 0);

      return {
        ...partner,
        total_leads_sent: partnerContacts.length,
        total_closings: closedContacts.length,
        total_revenue_generated: revenue,
      };
    });

    return NextResponse.json({ partners: partnersWithStats });
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
