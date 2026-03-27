/**
 * Global Search API
 *
 * Searches across contacts, transactions, and referral partners.
 * Returns grouped results limited to 5 per category.
 * Authenticated and rate-limited.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const rateCheck = checkRateLimit(ip, 'api');
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(rateCheck.retryAfterMs / 1000)),
        },
      }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q')?.trim() || '';

  if (!q || q.length < 1) {
    return NextResponse.json(
      { contacts: [], transactions: [], partners: [] },
      { status: 200 }
    );
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 }
      );
    }

    const pattern = `%${q}%`;

    // Search contacts (first_name, last_name, email, phone) where not deleted
    const contactsPromise = supabase
      .from('contacts')
      .select('id, first_name, last_name, email, phone')
      .eq('is_deleted', false)
      .or(
        `first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`
      )
      .limit(5);

    // Search transactions (property_address)
    const transactionsPromise = supabase
      .from('transactions')
      .select('id, property_address, status')
      .ilike('property_address', pattern)
      .limit(5);

    // Search referral partners (first_name, last_name)
    const partnersPromise = supabase
      .from('referral_partners')
      .select('id, first_name, last_name, company')
      .or(
        `first_name.ilike.${pattern},last_name.ilike.${pattern}`
      )
      .limit(5);

    const [contactsResult, transactionsResult, partnersResult] =
      await Promise.all([contactsPromise, transactionsPromise, partnersPromise]);

    return NextResponse.json({
      contacts: contactsResult.data || [],
      transactions: transactionsResult.data || [],
      partners: partnersResult.data || [],
    });
  } catch {
    return NextResponse.json(
      { error: 'Search failed. Please try again.' },
      { status: 500 }
    );
  }
}
