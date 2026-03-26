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

const VALID_PIPELINE_STAGES = [
  'new', 'contacted', 'qualifying', 'nurturing', 'showing',
  'offer', 'under_contract', 'closing', 'closed', 'lost', 'on_hold',
];
const VALID_LANGUAGES = ['en', 'es', 'bilingual'];

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
    if (body.track_type !== undefined) {
      const validTracks = ['buyer', 'seller', 'landlord', 'tenant', 'investor', 'sphere'];
      if (!validTracks.includes(body.track_type.toLowerCase())) {
        return NextResponse.json({ error: 'Invalid track type.' }, { status: 400 });
      }
      updates.track_type = body.track_type.toLowerCase();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
    }

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
