/**
 * Bookings API
 *
 * Native scheduling system. No third-party tool.
 * All booking confirmations go to approval queue.
 *
 * Public booking page submits PII over HTTPS,
 * validated server-side, stored with RLS protection.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { writeAuditLog, getClientIP, getUserAgent } from '@/lib/security/audit';
import {
  validateEmail,
  validatePhone,
  sanitizeInput,
} from '@/lib/security/validation';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { logger } from '@/lib/security/logger';

const VALID_MEETING_TYPES = [
  'buyer_consultation', 'seller_consultation', 'investor_strategy',
  'general_inquiry', 'showing_request',
];

const MEETING_DURATIONS: Record<string, number> = {
  buyer_consultation: 30,
  seller_consultation: 45,
  investor_strategy: 30,
  general_inquiry: 15,
  showing_request: 60,
};

/**
 * GET /api/bookings - List upcoming bookings (authenticated)
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        contact:contacts (id, first_name, last_name, email, phone)
      `)
      .gte('scheduled_date', new Date().toISOString().split('T')[0])
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true });

    if (error) {
      logger.error('Failed to fetch bookings', { error: error.message });
      return NextResponse.json({ error: 'Failed to fetch bookings.' }, { status: 500 });
    }

    return NextResponse.json({ bookings: data || [] });
  } catch (err) {
    logger.error('Bookings GET error', { error: String(err) });
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

/**
 * POST /api/bookings - Create a new booking (public endpoint)
 *
 * Rate limited. Input validated. PII stored securely.
 * Creates a contact in CRM, queues confirmation for approval,
 * and surfaces campaign options.
 */
export async function POST(request: Request) {
  const ip = getClientIP(request);
  const ua = getUserAgent(request);

  // Rate limit public endpoint
  const rateCheck = checkRateLimit(ip, 'public');
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.visitor_name || !body.visitor_email || !body.visitor_phone) {
      return NextResponse.json(
        { error: 'Name, email, and phone are required.' },
        { status: 400 }
      );
    }

    if (!body.meeting_type || !VALID_MEETING_TYPES.includes(body.meeting_type)) {
      return NextResponse.json(
        { error: 'Valid meeting type is required.' },
        { status: 400 }
      );
    }

    if (!body.scheduled_date || !body.scheduled_time) {
      return NextResponse.json(
        { error: 'Scheduled date and time are required.' },
        { status: 400 }
      );
    }

    // Validate PII
    const emailResult = validateEmail(body.visitor_email);
    if (!emailResult.valid) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    const phoneResult = validatePhone(body.visitor_phone);
    if (!phoneResult.valid) {
      return NextResponse.json({ error: 'Invalid phone number.' }, { status: 400 });
    }

    const visitorName = sanitizeInput(body.visitor_name, 200);
    const visitorNote = body.visitor_note ? sanitizeInput(body.visitor_note, 1000) : null;

    // Use admin client since this is a public endpoint (no auth)
    const supabase = createAdminClient();

    // Find the agent user (solo agent platform)
    const { data: users } = await supabase.auth.admin.listUsers();
    const agentUser = users?.users?.[0];

    if (!agentUser) {
      return NextResponse.json({ error: 'System configuration error.' }, { status: 500 });
    }

    // Split name into first/last
    const nameParts = visitorName.split(' ');
    const firstName = nameParts[0] || visitorName;
    const lastName = nameParts.slice(1).join(' ') || '';

    // Map consultation type to track type
    const trackTypeMap: Record<string, string> = {
      buyer_consultation: 'buyer',
      seller_consultation: 'seller',
      investor_strategy: 'investor',
      general_inquiry: 'buyer',
      showing_request: 'buyer',
    };
    const contactTrackType = trackTypeMap[body.meeting_type] || 'buyer';

    // Create or find contact in CRM
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .or(`email.eq.${emailResult.sanitized},phone.eq.${phoneResult.sanitized}`)
      .eq('user_id', agentUser.id)
      .eq('is_deleted', false)
      .limit(1)
      .single();

    let contactId: string;

    if (existingContact) {
      contactId = existingContact.id;
    } else {
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          user_id: agentUser.id,
          first_name: firstName,
          last_name: lastName,
          email: emailResult.sanitized,
          phone: phoneResult.sanitized,
          track_type: contactTrackType,
          pipeline_stage: 'new',
          lead_source: 'website',
          lead_score: 65,
        })
        .select('id')
        .single();

      if (contactError || !newContact) {
        logger.error('Failed to create contact from booking', { error: contactError?.message });
        return NextResponse.json({ error: 'Failed to process booking.' }, { status: 500 });
      }
      contactId = newContact.id;
    }

    // Log activity note for the booking
    const consultationLabel = body.meeting_type.replace(/_/g, ' ');
    await supabase.from('activities').insert({
      user_id: agentUser.id,
      contact_id: contactId,
      activity_type: 'note',
      description: `Booking request via website. Type: ${consultationLabel}. Preferred date: ${body.scheduled_date} at ${body.scheduled_time}.${visitorNote ? ' Note: ' + visitorNote : ''}`,
      activity_date: new Date().toISOString(),
    });

    // Create booking record
    const duration = MEETING_DURATIONS[body.meeting_type] || 30;

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        user_id: agentUser.id,
        contact_id: contactId,
        meeting_type: body.meeting_type,
        visitor_name: visitorName,
        visitor_email: emailResult.sanitized,
        visitor_phone: phoneResult.sanitized,
        visitor_note: visitorNote,
        scheduled_date: body.scheduled_date,
        scheduled_time: body.scheduled_time,
        duration_minutes: duration,
      })
      .select()
      .single();

    if (bookingError) {
      logger.error('Failed to create booking', { error: bookingError.message });
      return NextResponse.json({ error: 'Failed to create booking.' }, { status: 500 });
    }

    // Queue confirmation email for approval
    await supabase.from('approval_queue').insert({
      user_id: agentUser.id,
      item_type: 'scheduling_confirmation',
      recipient_contact_id: contactId,
      subject: `Booking Confirmation: ${body.meeting_type.replace(/_/g, ' ')}`,
      content: `Hi ${firstName}, thanks for booking a ${body.meeting_type.replace(/_/g, ' ')} on ${body.scheduled_date} at ${body.scheduled_time}. Looking forward to connecting with you!`,
      scheduled_time: new Date().toISOString(),
      trigger_source: 'Booking Page',
      tone_mode: 'professional_personal',
      urgency_level: 2,
    });

    // Audit log
    await writeAuditLog({
      userId: agentUser.id,
      action: 'record_create',
      resourceType: 'booking',
      resourceId: booking.id,
      details: `New booking from public page: ${body.meeting_type}`,
      ipAddress: ip,
      userAgent: ua,
    });

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        meeting_type: booking.meeting_type,
        scheduled_date: booking.scheduled_date,
        scheduled_time: booking.scheduled_time,
        duration_minutes: booking.duration_minutes,
      },
    }, { status: 201 });
  } catch (err) {
    logger.error('Bookings POST error', { error: String(err) });
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
