/**
 * Contact Geocoding API
 *
 * Returns contacts with lat/lng for map display.
 * Supports filtering by track type and zone boundaries.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rateCheck = checkRateLimit(ip, 'api');
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const trackType = searchParams.get('track_type');
  const minLat = searchParams.get('min_lat');
  const maxLat = searchParams.get('max_lat');
  const minLng = searchParams.get('min_lng');
  const maxLng = searchParams.get('max_lng');

  let query = supabase
    .from('contacts')
    .select('id, first_name, last_name, track_type, pipeline_stage, latitude, longitude, address_line_1, city, state, zip_code, last_contacted_at')
    .eq('is_deleted', false)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (trackType) {
    query = query.eq('track_type', trackType);
  }

  // Bounding box filter for viewport optimization
  if (minLat && maxLat && minLng && maxLng) {
    query = query
      .gte('latitude', parseFloat(minLat))
      .lte('latitude', parseFloat(maxLat))
      .gte('longitude', parseFloat(minLng))
      .lte('longitude', parseFloat(maxLng));
  }

  const { data, error } = await query.order('last_name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }

  const contacts = (data || []).map(c => ({
    id: c.id,
    firstName: c.first_name,
    lastName: c.last_name,
    trackType: c.track_type,
    pipelineStage: c.pipeline_stage,
    latitude: c.latitude,
    longitude: c.longitude,
    address: [c.address_line_1, c.city, c.state, c.zip_code].filter(Boolean).join(', '),
    lastContactedAt: c.last_contacted_at,
  }));

  return NextResponse.json({ contacts, count: contacts.length });
}
