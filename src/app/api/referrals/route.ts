/**
 * Referrals API
 *
 * Track every referral: who sent it, who was referred,
 * deal outcome, commission generated.
 * Referral leaderboard and gap alerts.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { writeAuditLog, getClientIP, getUserAgent } from '@/lib/security/audit';
import { validateUUID } from '@/lib/security/validation';
import { logger } from '@/lib/security/logger';
import { getDisplayName } from '@/lib/format';

/**
 * GET /api/referrals - List all referrals with stats
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: referrals, error } = await supabase
      .from('referrals')
      .select(`
        *,
        referrer:contacts!referrer_contact_id (id, first_name, last_name),
        referred:contacts!referred_contact_id (id, first_name, last_name, track_type, pipeline_stage)
      `)
      .order('referral_date', { ascending: false });

    if (error) {
      logger.error('Failed to fetch referrals', { error: error.message });
      return NextResponse.json({ error: 'Failed to fetch referrals.' }, { status: 500 });
    }

    // Build leaderboard
    const leaderboard: Record<string, {
      contactId: string;
      name: string;
      totalReferrals: number;
      dealsResulted: number;
      totalCommission: number;
    }> = {};

    for (const ref of referrals || []) {
      const id = ref.referrer_contact_id;
      if (!leaderboard[id]) {
        const referrer = ref.referrer as { first_name: string; last_name: string } | null;
        leaderboard[id] = {
          contactId: id,
          name: referrer ? getDisplayName(referrer) : 'Unknown',
          totalReferrals: 0,
          dealsResulted: 0,
          totalCommission: 0,
        };
      }
      leaderboard[id].totalReferrals += 1;
      if (ref.deal_resulted) leaderboard[id].dealsResulted += 1;
      leaderboard[id].totalCommission += ref.commission_generated || 0;
    }

    const sortedLeaderboard = Object.values(leaderboard).sort(
      (a, b) => b.totalCommission - a.totalCommission
    );

    return NextResponse.json({
      referrals: referrals || [],
      leaderboard: sortedLeaderboard,
      totalReferrals: referrals?.length || 0,
      totalDeals: referrals?.filter((r) => r.deal_resulted).length || 0,
      totalCommission: referrals?.reduce(
        (sum, r) => sum + (r.commission_generated || 0), 0
      ) || 0,
    });
  } catch (err) {
    logger.error('Referrals GET error', { error: String(err) });
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

/**
 * POST /api/referrals - Record a new referral
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

    if (!validateUUID(body.referrer_contact_id) || !validateUUID(body.referred_contact_id)) {
      return NextResponse.json({ error: 'Valid contact IDs required.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('referrals')
      .insert({
        user_id: user.id,
        referrer_contact_id: body.referrer_contact_id,
        referred_contact_id: body.referred_contact_id,
        referral_date: body.referral_date || new Date().toISOString().split('T')[0],
        deal_resulted: body.deal_resulted || false,
        outcome: body.outcome || null,
        commission_generated: body.commission_generated || null,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create referral', { error: error.message });
      return NextResponse.json({ error: 'Failed to record referral.' }, { status: 500 });
    }

    await writeAuditLog({
      userId: user.id,
      action: 'record_create',
      resourceType: 'referral',
      resourceId: data.id,
      details: 'Referral recorded',
      ipAddress: ip,
      userAgent: ua,
    });

    return NextResponse.json({ referral: data }, { status: 201 });
  } catch (err) {
    logger.error('Referrals POST error', { error: String(err) });
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
