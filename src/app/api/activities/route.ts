import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { validateUUID, sanitizePlainText } from '@/lib/security/validation';
import { writeAuditLog, getClientIP, getUserAgent } from '@/lib/security/audit';

const VALID_TYPES = ['call', 'text', 'email', 'note', 'showing', 'meeting', 'status_change', 'document', 'other'];
const VALID_DIRECTIONS = ['outbound', 'inbound'];

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

    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contact_id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    let query = supabase
      .from('activities')
      .select('*, contacts(first_name, last_name)')
      .order('activity_date', { ascending: false })
      .limit(limit);

    if (contactId) {
      if (!validateUUID(contactId)) {
        return NextResponse.json({ error: 'Invalid contact ID' }, { status: 400 });
      }
      query = query.eq('contact_id', contactId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ activities: data || [] });
  } catch (err) {
    console.error('[activities:GET]', err);
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

    if (!body.contact_id || !validateUUID(body.contact_id)) {
      return NextResponse.json({ error: 'Valid contact_id is required' }, { status: 400 });
    }
    if (!body.activity_type || !VALID_TYPES.includes(body.activity_type.toLowerCase())) {
      return NextResponse.json({ error: 'Valid activity_type is required' }, { status: 400 });
    }
    if (!body.description?.trim()) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }
    if (body.direction && !VALID_DIRECTIONS.includes(body.direction.toLowerCase())) {
      return NextResponse.json({ error: 'Invalid direction' }, { status: 400 });
    }

    const activityData = {
      user_id: user.id,
      contact_id: body.contact_id,
      activity_type: body.activity_type.toLowerCase(),
      direction: body.direction ? body.direction.toLowerCase() : null,
      subject: body.subject ? sanitizePlainText(body.subject.trim()) : null,
      description: sanitizePlainText(body.description.trim()),
      activity_date: body.activity_date || new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('activities')
      .insert(activityData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Auto-update contact's last_contact_date and updated_at
    await supabase
      .from('contacts')
      .update({
        last_contact_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.contact_id);

    await writeAuditLog({
      userId: user.id,
      action: 'record_create',
      resourceType: 'activity',
      resourceId: data.id,
      details: `Logged ${activityData.activity_type} for contact`,
      ipAddress: getClientIP(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ activity: data }, { status: 201 });
  } catch (err) {
    console.error('[activities:POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
