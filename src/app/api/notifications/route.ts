/**
 * Notifications API
 *
 * GET: Fetch unread notifications (limit 20, ordered by created_at desc)
 * PATCH: Mark notifications as read by IDs or mark all as read
 * Both endpoints require authentication.
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

    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, message, link, is_read, created_at')
      .eq('user_id', user.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch notifications.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ notifications: data || [] });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch notifications.' },
      { status: 500 }
    );
  }
}

interface PatchBody {
  ids?: string[];
  mark_all?: boolean;
}

export async function PATCH(request: NextRequest) {
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

    const body: PatchBody = await request.json();

    if (body.mark_all) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        return NextResponse.json(
          { error: 'Failed to mark notifications as read.' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, marked: 'all' });
    }

    if (body.ids && Array.isArray(body.ids) && body.ids.length > 0) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .in('id', body.ids);

      if (error) {
        return NextResponse.json(
          { error: 'Failed to mark notifications as read.' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, marked: body.ids.length });
    }

    return NextResponse.json(
      { error: 'Provide "ids" array or "mark_all: true".' },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Failed to update notifications.' },
      { status: 500 }
    );
  }
}
