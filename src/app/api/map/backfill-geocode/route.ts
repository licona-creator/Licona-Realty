/**
 * Backfill Geocode API - Geocode all contacts missing coordinates
 *
 * POST /api/map/backfill-geocode
 * Fetches contacts with address but no lat/lng, geocodes each via Google Maps API.
 * Rate-limited to 200ms between requests to avoid API limits.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/security/logger';

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const geoKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!geoKey) {
      return NextResponse.json({ error: 'Google Maps API key not configured.' }, { status: 500 });
    }

    // Fetch contacts with address but no coordinates
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('id, address_line_1, city, state, zip_code')
      .eq('is_deleted', false)
      .not('address_line_1', 'is', null)
      .is('latitude', null);

    if (error) {
      logger.error('Backfill geocode: failed to fetch contacts', { error: error.message });
      return NextResponse.json({ error: 'Failed to fetch contacts.' }, { status: 500 });
    }

    if (!contacts || contacts.length === 0) {
      return NextResponse.json({ geocoded: 0, failed: 0, total: 0 });
    }

    let geocoded = 0;
    let failed = 0;

    for (const contact of contacts) {
      const fullAddress = [
        contact.address_line_1, contact.city, contact.state, contact.zip_code,
      ].filter(Boolean).join(', ');

      if (!fullAddress) {
        failed++;
        continue;
      }

      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${geoKey}`
        );
        const geoData = await res.json();

        if (geoData.status === 'OK' && geoData.results?.[0]) {
          const result = geoData.results[0];
          const loc = result.geometry?.location;
          const comps = result.address_components || [];
          const getComp = (type: string): string | null => {
            const c = comps.find((comp: { types: string[]; long_name: string }) => comp.types.includes(type));
            return c ? c.long_name : null;
          };

          const geoUpdate: Record<string, unknown> = {};
          if (loc?.lat) geoUpdate.latitude = loc.lat;
          if (loc?.lng) geoUpdate.longitude = loc.lng;
          const neighborhood = getComp('neighborhood') || getComp('sublocality');
          if (neighborhood) geoUpdate.neighborhood = neighborhood;
          const county = getComp('administrative_area_level_2');
          if (county) geoUpdate.county = county;
          // Backfill zip_code if contact is missing it
          if (!contact.zip_code) {
            const zip = getComp('postal_code');
            if (zip) geoUpdate.zip_code = zip;
          }

          if (Object.keys(geoUpdate).length > 0) {
            await supabase.from('contacts').update(geoUpdate).eq('id', contact.id);
            geocoded++;
          } else {
            failed++;
          }
        } else {
          failed++;
        }
      } catch {
        failed++;
      }

      // Rate limit: 200ms between requests
      await delay(200);
    }

    return NextResponse.json({
      geocoded,
      failed,
      total: contacts.length,
    });
  } catch (err) {
    logger.error('Backfill geocode error', { error: String(err) });
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
