/**
 * Sphere and Referral API
 *
 * Completely separate track from lead pipeline.
 * Manages relationship contacts, referral tracking,
 * milestone dates, and sphere-specific campaigns.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { writeAuditLog, getClientIP, getUserAgent } from '@/lib/security/audit';
import { validateUUID, sanitizeInput } from '@/lib/security/validation';
import { logger } from '@/lib/security/logger';

const VALID_RELATIONSHIP_TYPES = [
  'personal_friend', 'past_client', 'family',
  'professional_connection', 'referral_partner',
];
const VALID_TIERS = ['tier_1', 'tier_2', 'tier_3'];

/**
 * GET /api/sphere — List sphere contacts with relationship data
 */
export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const tier = url.searchParams.get('tier');

    let query = supabase
      .from('sphere_contacts')
      .select(`
        *,
        contact:contacts (
          id, first_name, last_name, email, phone, city, state,
          lead_score, last_contacted_at, language_preference
        )
      `)
      .order('relationship_tier', { ascending: true })
      .order('referral_potential_score', { ascending: false });

    if (tier && VALID_TIERS.includes(tier)) {
      query = query.eq('relationship_tier', tier);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to fetch sphere contacts', { error: error.message });
      return NextResponse.json({ error: 'Failed to fetch sphere contacts.' }, { status: 500 });
    }

    // Calculate referral stats
    const { data: referrals } = await supabase
      .from('referrals')
      .select('referrer_contact_id, deal_resulted, commission_generated');

    const referralStats: Record<string, { count: number; deals: number; commission: number }> = {};
    for (const ref of referrals || []) {
      const id = ref.referrer_contact_id;
      if (!referralStats[id]) {
        referralStats[id] = { count: 0, deals: 0, commission: 0 };
      }
      referralStats[id].count += 1;
      if (ref.deal_resulted) referralStats[id].deals += 1;
      referralStats[id].commission += ref.commission_generated || 0;
    }

    return NextResponse.json({
      sphereContacts: data || [],
      referralStats,
    });
  } catch (err) {
    logger.error('Sphere GET error', { error: String(err) });
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

/**
 * POST /api/sphere — Add a contact to the sphere track
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

    // Validate contact_id
    if (!body.contact_id || !validateUUID(body.contact_id)) {
      return NextResponse.json({ error: 'Valid contact ID required.' }, { status: 400 });
    }

    // Validate relationship type
    if (!body.relationship_type || !VALID_RELATIONSHIP_TYPES.includes(body.relationship_type)) {
      return NextResponse.json({ error: 'Valid relationship type required.' }, { status: 400 });
    }

    // Validate tier
    const tier = body.relationship_tier || 'tier_3';
    if (!VALID_TIERS.includes(tier)) {
      return NextResponse.json({ error: 'Invalid relationship tier.' }, { status: 400 });
    }

    const sphereData = {
      user_id: user.id,
      contact_id: body.contact_id,
      relationship_type: body.relationship_type,
      relationship_tier: tier,
      how_they_know_agent: body.how_they_know_agent
        ? sanitizeInput(body.how_they_know_agent, 500)
        : null,
      referral_potential_score: body.referral_potential_score || 50,
      birthday: body.birthday || null,
      home_purchase_anniversary: body.home_purchase_anniversary || null,
      business_anniversary: body.business_anniversary || null,
    };

    const { data, error } = await supabase
      .from('sphere_contacts')
      .insert(sphereData)
      .select()
      .single();

    if (error) {
      logger.error('Failed to create sphere contact', { error: error.message });
      return NextResponse.json({ error: 'Failed to add to sphere.' }, { status: 500 });
    }

    await writeAuditLog({
      userId: user.id,
      action: 'record_create',
      resourceType: 'sphere_contact',
      resourceId: data.id,
      details: `Added contact to sphere as ${body.relationship_type} (${tier})`,
      ipAddress: ip,
      userAgent: ua,
    });

    return NextResponse.json({ sphereContact: data }, { status: 201 });
  } catch (err) {
    logger.error('Sphere POST error', { error: String(err) });
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
