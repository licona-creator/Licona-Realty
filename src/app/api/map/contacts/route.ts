/**
 * Map Contacts API
 *
 * Returns all contacts with geocoded data for map pin display.
 * Categorizes contacts by pin type based on track type and deal status.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/security/logger';

export type PinType = 'homeowner' | 'active_buyer' | 'active_deal' | 'closed_deal' | 'other';

interface MapContactResult {
  id: string;
  firstName: string;
  lastName: string;
  latitude: number;
  longitude: number;
  zipCode: string | null;
  city: string | null;
  neighborhood: string | null;
  county: string | null;
  trackType: string;
  pinType: PinType;
  address: string;
  lastContactedAt: string | null;
  deal: {
    status: string;
    dealType: string | null;
    closingDate: string | null;
  } | null;
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch contacts with address data
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, latitude, longitude, zip_code, city, state, neighborhood, county, track_type, pipeline_stage, address_line_1, last_contacted_at, budget, location_preference')
      .eq('is_deleted', false)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (contactsError) {
      logger.error('Failed to fetch map contacts', { error: contactsError.message });
      return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
    }

    // Fetch active transactions to determine deal-based pin types
    const { data: transactions } = await supabase
      .from('transactions')
      .select('contact_id, status, deal_type, closing_date')
      .not('contact_id', 'is', null);

    // Build a map of contact_id -> transaction info
    const txMap = new Map<string, { status: string; deal_type: string | null; closing_date: string | null }>();
    if (transactions) {
      for (const tx of transactions) {
        if (!tx.contact_id) continue;
        const existing = txMap.get(tx.contact_id);
        // Prefer active deals over closed ones
        if (!existing || (tx.status !== 'closed' && existing.status === 'closed')) {
          txMap.set(tx.contact_id, {
            status: tx.status,
            deal_type: tx.deal_type,
            closing_date: tx.closing_date,
          });
        }
      }
    }

    const results: MapContactResult[] = (contacts || []).map(c => {
      const tx = txMap.get(c.id);
      let pinType: PinType = 'other';

      if (tx) {
        if (tx.status === 'closed') {
          // Check if this is a past client (homeowner) - seller or buyer with closed deal
          if (c.track_type === 'buyer' || c.track_type === 'seller') {
            pinType = 'homeowner';
          } else {
            pinType = 'closed_deal';
          }
        } else if (tx.status === 'under_contract' || tx.status === 'closing') {
          pinType = 'active_deal';
        } else if (c.track_type === 'buyer') {
          pinType = 'active_buyer';
        } else {
          pinType = 'other';
        }
      } else if (c.track_type === 'buyer' && (c.pipeline_stage === 'showing' || c.pipeline_stage === 'offer' || c.pipeline_stage === 'qualifying' || c.pipeline_stage === 'nurturing')) {
        pinType = 'active_buyer';
      }

      return {
        id: c.id,
        firstName: c.first_name,
        lastName: c.last_name,
        latitude: c.latitude!,
        longitude: c.longitude!,
        zipCode: c.zip_code,
        city: c.city,
        neighborhood: c.neighborhood,
        county: c.county,
        trackType: c.track_type,
        pinType,
        address: [c.address_line_1, c.city, c.state, c.zip_code].filter(Boolean).join(', '),
        lastContactedAt: c.last_contacted_at,
        deal: tx ? { status: tx.status, dealType: tx.deal_type, closingDate: tx.closing_date } : null,
      };
    });

    return NextResponse.json({ contacts: results, count: results.length });
  } catch (err) {
    logger.error('Map contacts error', { error: String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
