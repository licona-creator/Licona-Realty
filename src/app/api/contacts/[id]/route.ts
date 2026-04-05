/**
 * Contact Detail API - Get, Update, Delete single contact
 *
 * All operations validated, audited, and RLS-protected.
 * UUID format validation on ID parameter.
 * Deletion is soft-delete (is_deleted flag), then purged within 24 hours.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { writeAuditLog, getClientIP, getUserAgent } from '@/lib/security/audit';
import {
  validateUUID,
  sanitizeInput,
  validateEmail,
  validatePhone,
  validateZipCode,
} from '@/lib/security/validation';
import { logger } from '@/lib/security/logger';
import { createFollowUpCalendarEvent, removeCalendarEvent } from '@/lib/sync/calendar-actions';

const VALID_PIPELINE_STAGES = [
  'new', 'contacted', 'qualifying', 'nurturing', 'showing',
  'offer', 'under_contract', 'closing', 'closed', 'lost', 'on_hold',
];
const VALID_LANGUAGES = ['en', 'es', 'bilingual'];
const VALID_DISC_TYPES = ['D', 'I', 'S', 'C'];

/**
 * GET /api/contacts/[id] - Get single contact
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!validateUUID(id)) {
    return NextResponse.json({ error: 'Invalid contact ID.' }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Contact not found.' }, { status: 404 });
    }

    return NextResponse.json({ contact: data });
  } catch (err) {
    logger.error('Contact GET error', { error: String(err) });
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

/**
 * PATCH /api/contacts/[id] - Update contact
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ip = getClientIP(request);
  const ua = getUserAgent(request);

  if (!validateUUID(id)) {
    return NextResponse.json({ error: 'Invalid contact ID.' }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    // Validate and sanitize each field that might be updated
    if (body.first_name !== undefined) {
      const val = sanitizeInput(body.first_name, 100);
      if (!val) return NextResponse.json({ error: 'First name cannot be empty.' }, { status: 400 });
      updates.first_name = val;
    }
    if (body.last_name !== undefined) {
      const val = sanitizeInput(body.last_name, 100);
      if (!val) return NextResponse.json({ error: 'Last name cannot be empty.' }, { status: 400 });
      updates.last_name = val;
    }
    if (body.email !== undefined) {
      if (body.email === null || body.email === '') {
        updates.email = null;
      } else {
        const emailResult = validateEmail(body.email);
        if (!emailResult.valid) return NextResponse.json({ error: 'Invalid email.' }, { status: 400 });
        updates.email = emailResult.sanitized;
      }
    }
    if (body.phone !== undefined) {
      if (body.phone === null || body.phone === '') {
        updates.phone = null;
      } else {
        const phoneResult = validatePhone(body.phone);
        if (!phoneResult.valid) return NextResponse.json({ error: 'Invalid phone.' }, { status: 400 });
        updates.phone = phoneResult.sanitized;
      }
    }
    if (body.pipeline_stage !== undefined) {
      if (!VALID_PIPELINE_STAGES.includes(body.pipeline_stage)) {
        return NextResponse.json({ error: 'Invalid pipeline stage.' }, { status: 400 });
      }
      updates.pipeline_stage = body.pipeline_stage;
    }
    if (body.language_preference !== undefined) {
      if (!VALID_LANGUAGES.includes(body.language_preference)) {
        return NextResponse.json({ error: 'Invalid language.' }, { status: 400 });
      }
      updates.language_preference = body.language_preference;
    }
    if (body.lead_score !== undefined) {
      if (body.lead_score < 1 || body.lead_score > 100) {
        return NextResponse.json({ error: 'Lead score must be 1-100.' }, { status: 400 });
      }
      updates.lead_score = body.lead_score;
    }
    if (body.address_line_1 !== undefined) updates.address_line_1 = body.address_line_1 ? sanitizeInput(body.address_line_1, 200) : null;
    if (body.address_line_2 !== undefined) updates.address_line_2 = body.address_line_2 ? sanitizeInput(body.address_line_2, 200) : null;
    if (body.city !== undefined) updates.city = body.city ? sanitizeInput(body.city, 100) : null;
    if (body.state !== undefined) updates.state = body.state ? sanitizeInput(body.state, 50) : null;
    if (body.zip_code !== undefined) {
      if (body.zip_code && !validateZipCode(body.zip_code)) {
        return NextResponse.json({ error: 'Invalid ZIP code.' }, { status: 400 });
      }
      updates.zip_code = body.zip_code ? sanitizeInput(body.zip_code, 10) : null;
    }
    if (body.lead_source !== undefined) updates.lead_source = body.lead_source ? sanitizeInput(body.lead_source, 100) : null;
    if (body.latitude !== undefined) updates.latitude = typeof body.latitude === 'number' ? body.latitude : null;
    if (body.longitude !== undefined) updates.longitude = typeof body.longitude === 'number' ? body.longitude : null;
    if (body.last_contacted_at !== undefined) updates.last_contacted_at = body.last_contacted_at;
    if (body.budget !== undefined) updates.budget = body.budget ? sanitizeInput(body.budget, 200) : null;
    if (body.location_preference !== undefined) updates.location_preference = body.location_preference ? sanitizeInput(body.location_preference, 200) : null;
    if (body.notes !== undefined) updates.notes = body.notes ? sanitizeInput(body.notes, 2000) : null;
    if (body.next_follow_up_date !== undefined) updates.next_follow_up_date = body.next_follow_up_date || null;
    if (body.last_contact_date !== undefined) updates.last_contact_date = body.last_contact_date || null;
    if (body.follow_up_notes !== undefined) updates.follow_up_notes = body.follow_up_notes ? sanitizeInput(body.follow_up_notes, 500) : null;
    if (body.referral_partner_id !== undefined) updates.referral_partner_id = body.referral_partner_id || null;
    if (body.track_type !== undefined) {
      const validTracks = ['buyer', 'seller', 'landlord', 'tenant', 'investor', 'sphere'];
      if (!validTracks.includes(body.track_type.toLowerCase())) {
        return NextResponse.json({ error: 'Invalid track type.' }, { status: 400 });
      }
      updates.track_type = body.track_type.toLowerCase();
    }
    if (body.disc_type !== undefined) {
      if (body.disc_type === null || body.disc_type === '') {
        updates.disc_type = null;
      } else if (VALID_DISC_TYPES.includes(body.disc_type)) {
        updates.disc_type = body.disc_type;
      } else {
        return NextResponse.json({ error: 'Invalid DISC type. Must be D, I, S, or C.' }, { status: 400 });
      }
    }
    if (body.birthday_month !== undefined) {
      if (body.birthday_month === null) {
        updates.birthday_month = null;
      } else if (typeof body.birthday_month === 'number' && body.birthday_month >= 1 && body.birthday_month <= 12) {
        updates.birthday_month = body.birthday_month;
      } else {
        return NextResponse.json({ error: 'Invalid birthday month.' }, { status: 400 });
      }
    }
    if (body.birthday_day !== undefined) {
      if (body.birthday_day === null) {
        updates.birthday_day = null;
      } else if (typeof body.birthday_day === 'number' && body.birthday_day >= 1 && body.birthday_day <= 31) {
        updates.birthday_day = body.birthday_day;
      } else {
        return NextResponse.json({ error: 'Invalid birthday day.' }, { status: 400 });
      }
    }
    if (body.birthday_year !== undefined) {
      if (body.birthday_year === null) {
        updates.birthday_year = null;
      } else if (typeof body.birthday_year === 'number' && body.birthday_year >= 1900 && body.birthday_year <= 2100) {
        updates.birthday_year = body.birthday_year;
      } else {
        return NextResponse.json({ error: 'Invalid birthday year.' }, { status: 400 });
      }
    }
    if (body.company !== undefined) updates.company = body.company ? sanitizeInput(body.company, 200) : null;
    if (body.job_title !== undefined) updates.job_title = body.job_title ? sanitizeInput(body.job_title, 200) : null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
    }

    // Fetch existing contact before update (for calendar event comparison)
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('next_follow_up_date, google_calendar_event_id, first_name, last_name, phone, follow_up_notes')
      .eq('id', id)
      .single();

    const { data, error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update contact', { error: error.message });
      return NextResponse.json({ error: 'Failed to update contact.' }, { status: 500 });
    }

    await writeAuditLog({
      userId: user.id,
      action: 'record_update',
      resourceType: 'contact',
      resourceId: id,
      details: `Updated fields: ${Object.keys(updates).join(', ')}`,
      ipAddress: ip,
      userAgent: ua,
    });

    // Auto-geocode: fires when address changes OR when contact has address but no coordinates
    const addressChanged = body.address_line_1 !== undefined || body.city !== undefined || body.state !== undefined || body.zip_code !== undefined;
    const needsGeocode = addressChanged || (data?.address_line_1 && !data?.latitude);
    if (needsGeocode && data) {
      const fullAddress = [
        data.address_line_1, data.city, data.state, data.zip_code,
      ].filter(Boolean).join(', ');
      if (fullAddress) {
        const geoKey = process.env.GOOGLE_GEOCODING_KEY;
        if (geoKey) {
          fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${geoKey}`)
            .then(res => res.json())
            .then(geoData => {
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
                if (Object.keys(geoUpdate).length > 0) {
                  supabase.from('contacts').update(geoUpdate).eq('id', id).then(() => {});
                }
              }
            })
            .catch(() => {
              // Geocoding failure is non-blocking
            });
        }
      }
    }

    // Calendar sync: manage follow-up events when next_follow_up_date changes
    if (body.next_follow_up_date !== undefined && existingContact) {
      try {
        const oldDate = existingContact.next_follow_up_date;
        const newDate = body.next_follow_up_date || null;
        const oldEventId = existingContact.google_calendar_event_id;

        if (newDate && newDate !== oldDate) {
          // Date set or changed: remove old event, create new one
          if (oldEventId) {
            await removeCalendarEvent(supabase, oldEventId);
          }
          const eventId = await createFollowUpCalendarEvent(
            supabase,
            {
              id,
              first_name: data.first_name || existingContact.first_name,
              last_name: data.last_name || existingContact.last_name,
              phone: data.phone || existingContact.phone,
            },
            newDate,
            data.follow_up_notes || existingContact.follow_up_notes || undefined
          );
          if (eventId) {
            await supabase
              .from('contacts')
              .update({ google_calendar_event_id: eventId })
              .eq('id', id);
          }
        } else if (!newDate && oldEventId) {
          // Date cleared: remove calendar event
          await removeCalendarEvent(supabase, oldEventId);
          await supabase
            .from('contacts')
            .update({ google_calendar_event_id: null })
            .eq('id', id);
        }
      } catch (calErr) {
        // Calendar operations must never crash the contact save
        logger.error('Calendar sync error (non-fatal)', { error: String(calErr) });
      }
    }

    return NextResponse.json({ contact: data });
  } catch (err) {
    logger.error('Contact PATCH error', { error: String(err) });
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

/**
 * DELETE /api/contacts/[id] - Soft delete contact
 *
 * MFA re-prompt required for deletion (enforced on client side).
 * Marks as deleted. Purged by scheduled function within 24 hours.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ip = getClientIP(request);
  const ua = getUserAgent(request);

  if (!validateUUID(id)) {
    return NextResponse.json({ error: 'Invalid contact ID.' }, { status: 400 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Cascade: delete activities for this contact
    await supabase.from('activities').delete().eq('contact_id', id);

    // Cascade: remove campaign enrollments
    await supabase.from('campaign_enrollments').delete().eq('contact_id', id);

    // Cascade: unlink from transactions (set contact_id to null)
    await supabase
      .from('transactions')
      .update({ contact_id: null })
      .eq('contact_id', id);

    // Soft-delete the contact
    const { error } = await supabase
      .from('contacts')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      logger.error('Failed to delete contact', { error: error.message });
      return NextResponse.json({ error: 'Failed to delete contact.' }, { status: 500 });
    }

    await writeAuditLog({
      userId: user.id,
      action: 'record_delete',
      resourceType: 'contact',
      resourceId: id,
      details: 'Contact soft-deleted',
      ipAddress: ip,
      userAgent: ua,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('Contact DELETE error', { error: String(err) });
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
