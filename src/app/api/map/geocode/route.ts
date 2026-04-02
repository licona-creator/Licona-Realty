/**
 * Geocode API
 *
 * Converts a full address string to structured geo components
 * using Google Geocoding API.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/security/logger';

interface GeocodeResult {
  latitude: number;
  longitude: number;
  zip_code: string | null;
  city: string | null;
  neighborhood: string | null;
  county: string | null;
  state: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { address } = body;

    if (!address || typeof address !== 'string' || address.trim().length === 0) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Geocoding service not configured' }, { status: 503 });
    }

    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address.trim())}&key=${apiKey}`;
    const response = await fetch(geocodeUrl);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    const result = data.results[0];
    const components = result.address_components || [];
    const location = result.geometry?.location;

    const getComponent = (type: string): string | null => {
      const comp = components.find((c: { types: string[]; long_name: string }) => c.types.includes(type));
      return comp ? comp.long_name : null;
    };

    const geocoded: GeocodeResult = {
      latitude: location?.lat ?? 0,
      longitude: location?.lng ?? 0,
      zip_code: getComponent('postal_code'),
      city: getComponent('locality'),
      neighborhood: getComponent('neighborhood') || getComponent('sublocality'),
      county: getComponent('administrative_area_level_2'),
      state: getComponent('administrative_area_level_1'),
    };

    return NextResponse.json({ result: geocoded });
  } catch (err) {
    logger.error('Geocode error', { error: String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
