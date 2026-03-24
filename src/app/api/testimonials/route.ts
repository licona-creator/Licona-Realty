/**
 * Testimonials API
 *
 * Manage client testimonials with approval workflow.
 * Public-facing published testimonials for SEO pages.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { validateUUID, sanitizePlainText } from '@/lib/security/validation';

// Public GET for testimonials page (no auth required)
export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (!checkRateLimit(ip, 'public')) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const isPublic = searchParams.get('public') === 'true';

  if (isPublic) {
    // Public endpoint - only published testimonials
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('testimonials')
      .select('id, star_rating, review_text, client_first_name, client_city, transaction_type, created_at')
      .eq('is_published', true)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch testimonials' }, { status: 500 });
    }

    return NextResponse.json({ testimonials: data || [] });
  }

  // Authenticated endpoint - all testimonials
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('testimonials')
    .select('*, contacts(first_name, last_name)')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch testimonials' }, { status: 500 });
  }

  return NextResponse.json({ testimonials: data || [] });
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (!checkRateLimit(ip, 'api')) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const {
    contact_id, transaction_id, star_rating, review_text,
    client_first_name, client_city, transaction_type,
  } = body;

  if (!contact_id || !validateUUID(contact_id)) {
    return NextResponse.json({ error: 'Valid contact ID required' }, { status: 400 });
  }
  if (!star_rating || star_rating < 1 || star_rating > 5) {
    return NextResponse.json({ error: 'Star rating 1-5 required' }, { status: 400 });
  }
  if (!review_text) {
    return NextResponse.json({ error: 'Review text required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('testimonials')
    .insert({
      user_id: user.id,
      contact_id,
      transaction_id: transaction_id || null,
      star_rating,
      review_text: sanitizePlainText(review_text),
      client_first_name: sanitizePlainText(client_first_name || ''),
      client_city: sanitizePlainText(client_city || ''),
      transaction_type: transaction_type || 'buyer',
      is_approved: false,
      is_published: false,
      google_review_synced: false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to create testimonial' }, { status: 500 });
  }

  return NextResponse.json({ testimonial: data }, { status: 201 });
}
