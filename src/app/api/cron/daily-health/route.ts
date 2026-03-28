/**
 * Daily Health Cron Job
 *
 * Runs at 12:00 UTC (6:00 AM Central) via Vercel Cron.
 * Checks all system components and creates notifications for failures.
 * Protected by CRON_SECRET authorization.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    const issues: string[] = [];

    // Check 1 - Database connectivity
    const { error: dbError } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true });
    if (dbError) {
      issues.push('Database connection failed');
    }

    // Check 2 - AI key
    if (!process.env.ANTHROPIC_API_KEY) {
      issues.push('ANTHROPIC_API_KEY not configured');
    }

    // Check 3 - Google Maps key
    if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      issues.push('Google Maps API key not configured');
    }

    // Check 4 - Google OAuth connected
    const { data: googleTokens } = await supabase
      .from('integration_tokens')
      .select('user_id, expires_at')
      .eq('provider', 'google');

    if (!googleTokens || googleTokens.length === 0) {
      issues.push('Google account not connected');
    } else {
      // Check for expired tokens
      const now = new Date();
      for (const token of googleTokens) {
        if (token.expires_at && new Date(token.expires_at) < now) {
          issues.push('Google token expired - reconnection needed');
          break;
        }
      }
    }

    // If any critical issues, notify all users with tokens (or the owner)
    if (issues.length > 0) {
      // Get all users who have integration tokens (active users)
      const { data: users } = await supabase
        .from('integration_tokens')
        .select('user_id')
        .limit(10);

      const userIds = users
        ? [...new Set(users.map((u) => u.user_id))]
        : [];

      // Also try to get any user from contacts table as fallback
      if (userIds.length === 0) {
        const { data: anyUser } = await supabase
          .from('contacts')
          .select('user_id')
          .limit(1)
          .single();
        if (anyUser?.user_id) userIds.push(anyUser.user_id);
      }

      for (const userId of userIds) {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'system_alert',
          title: 'System Health Issue',
          message: issues.join('; '),
          is_read: false,
        });
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      issues,
      healthy: issues.length === 0,
    });
  } catch (err) {
    console.error('[daily-health] Cron job failed:', err);
    return NextResponse.json({ error: 'Health check failed' }, { status: 500 });
  }
}
