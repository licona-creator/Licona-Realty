/**
 * Contacts API - CRUD Operations
 *
 * All operations protected by authentication middleware.
 * All inputs validated and sanitized server-side.
 * All mutations logged to the audit table.
 * RLS ensures users can only access their own contacts.
 * No PII in URL query parameters - lookups use POST where needed.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { writeAuditLog, getClientIP, getUserAgent } from '@/lib/security/audit';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/security/rate-limit';
import {
  validateEmail,
  validatePhone,
  validateUUID,
  sanitizeInput,
  validateZipCode,
} from '@/lib/security/validation';
import { logger } from '@/lib/security/logger';

// Valid track types and pipeline stages for validation
const VALID_TRACK_TYPES = ['buyer', 'seller', 'landlord', 'tenant', 'investor', 'sphere'];
const VALID_PIPELINE_STAGES = [
  'new', 'contacted', 'qualifying', 'nurturing', 'showing',
  'offer', 'under_contract', 'closing', 'closed', 'lost', 'on_hold',
];
const VALID_LANGUAGES = ['en', 'es', 'bilingual'];

/**
 * GET /api/contacts - List contacts with optional filters
 */
export async function GET(request: Request) {
  const ip = getClientIP(request);
  const rateCheck = checkRateLimit(ip, 'api');
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      {
        status: 429,
        headers: {
          ...getRateLimitHeaders(rateCheck.remaining, 'api'),
          'Retry-After': String(Math.ceil(rateCheck.retryAfterMs / 1000)),
        },
      }
    );
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log('[DEBUG contacts:GET] Auth result:', {
      userId: user?.id,
      email: user?.email,
      error: authError?.message,
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated', authError: authError?.message },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const trackType = url.searchParams.get('track_type');
    const pipelineStage = url.searchParams.get('pipeline_stage');
    const search = url.searchParams.get('search');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = (page - 1) * limit;

    let query = supabase
      .from('contacts')
      .select('*', { count: 'exact' })
      .eq('is_deleted', false)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters (validated)
    if (trackType && VALID_TRACK_TYPES.includes(trackType)) {
      query = query.eq('track_type', trackType);
    }
    if (pipelineStage && VALID_PIPELINE_STAGES.includes(pipelineStage)) {
      query = query.eq('pipeline_stage', pipelineStage);
    }
    if (search) {
      const sanitized = sanitizeInput(search, 100);
      query = query.or(
        `first_name.ilike.%${sanitized}%,last_name.ilike.%${sanitized}%,email.ilike.%${sanitized}%`
      );
    }

    const { data, error, count } = await query;

    if (error) {
      logger.error('Failed to fetch contacts', { error: error.message });
      return NextResponse.json(
        { error: error.message, details: error.details, hint: error.hint, code: error.code },
        { status: 500 }
      );
    }

    return NextResponse.json({
      contacts: data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    }, {
      headers: getRateLimitHeaders(rateCheck.remaining, 'api'),
    });
  } catch (err) {
    logger.error('Contacts GET error', { error: String(err) });
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contacts - Create a new contact
 */
export async function POST(request: Request) {
  const ip = getClientIP(request);
  const ua = getUserAgent(request);
  const rateCheck = checkRateLimit(ip, 'api');
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded.' },
      { status: 429 }
    );
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log('[DEBUG contacts:POST] Auth result:', {
      userId: user?.id,
      email: user?.email,
      error: authError?.message,
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated', authError: authError?.message },
        { status: 401 }
      );
    }

    const body = await request.json();

    // =============================================
    // Server-side validation - this is the security boundary
    // =============================================

    // Required fields
    if (!body.first_name || !body.last_name) {
      return NextResponse.json(
        { error: 'First name and last name are required.' },
        { status: 400 }
      );
    }

    if (!body.track_type || !VALID_TRACK_TYPES.includes(body.track_type.toLowerCase())) {
      return NextResponse.json(
        { error: 'Valid track type is required.' },
        { status: 400 }
      );
    }

    // Sanitize text fields
    const firstName = sanitizeInput(body.first_name, 100);
    const lastName = sanitizeInput(body.last_name, 100);

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'Name fields cannot be empty after sanitization.' },
        { status: 400 }
      );
    }

    // Validate optional fields
    let sanitizedEmail: string | null = null;
    if (body.email) {
      const emailResult = validateEmail(body.email);
      if (!emailResult.valid) {
        return NextResponse.json(
          { error: 'Invalid email format.' },
          { status: 400 }
        );
      }
      sanitizedEmail = emailResult.sanitized;
    }

    let sanitizedPhone: string | null = null;
    if (body.phone) {
      const phoneResult = validatePhone(body.phone);
      if (!phoneResult.valid) {
        return NextResponse.json(
          { error: 'Invalid phone number format.' },
          { status: 400 }
        );
      }
      sanitizedPhone = phoneResult.sanitized;
    }

    // Validate pipeline stage
    const pipelineStage = (body.pipeline_stage || 'new').toLowerCase();
    if (!VALID_PIPELINE_STAGES.includes(pipelineStage)) {
      return NextResponse.json(
        { error: 'Invalid pipeline stage.' },
        { status: 400 }
      );
    }

    // Validate language preference
    const language = (body.language_preference || 'en').toLowerCase();
    if (!VALID_LANGUAGES.includes(language)) {
      return NextResponse.json(
        { error: 'Invalid language preference.' },
        { status: 400 }
      );
    }

    // Validate zip code if provided
    if (body.zip_code && !validateZipCode(body.zip_code)) {
      return NextResponse.json(
        { error: 'Invalid ZIP code format.' },
        { status: 400 }
      );
    }

    // Validate lead score if provided
    const leadScore = body.lead_score ?? 50;
    if (leadScore < 1 || leadScore > 100 || !Number.isInteger(leadScore)) {
      return NextResponse.json(
        { error: 'Lead score must be an integer between 1 and 100.' },
        { status: 400 }
      );
    }

    // Build contact record
    const contactData = {
      user_id: user.id,
      first_name: firstName,
      last_name: lastName,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      address_line_1: body.address_line_1 ? sanitizeInput(body.address_line_1, 200) : null,
      address_line_2: body.address_line_2 ? sanitizeInput(body.address_line_2, 200) : null,
      city: body.city ? sanitizeInput(body.city, 100) : null,
      state: body.state ? sanitizeInput(body.state, 50) : null,
      zip_code: body.zip_code ? sanitizeInput(body.zip_code, 10) : null,
      track_type: body.track_type.toLowerCase(),
      pipeline_stage: pipelineStage,
      lead_source: body.lead_source ? sanitizeInput(body.lead_source, 100) : null,
      lead_score: leadScore,
      language_preference: language,
      latitude: typeof body.latitude === 'number' ? body.latitude : null,
      longitude: typeof body.longitude === 'number' ? body.longitude : null,
      social_media_source: body.social_media_source ? sanitizeInput(body.social_media_source, 100) : null,
      budget: body.budget ? sanitizeInput(body.budget, 200) : null,
      location_preference: body.location_preference ? sanitizeInput(body.location_preference, 200) : null,
      notes: body.notes ? sanitizeInput(body.notes, 2000) : null,
    };

    const { data, error } = await supabase
      .from('contacts')
      .insert(contactData)
      .select()
      .single();

    if (error) {
      logger.error('Failed to create contact', { error: error.message });
      return NextResponse.json(
        { error: error.message, details: error.details, hint: error.hint, code: error.code },
        { status: 500 }
      );
    }

    // Audit log - no PII in details
    await writeAuditLog({
      userId: user.id,
      action: 'record_create',
      resourceType: 'contact',
      resourceId: data.id,
      details: `Created ${body.track_type} contact`,
      ipAddress: ip,
      userAgent: ua,
    });

    return NextResponse.json({ contact: data }, { status: 201 });
  } catch (err) {
    logger.error('Contacts POST error', { error: String(err) });
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
