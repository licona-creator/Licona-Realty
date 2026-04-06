/**
 * Push Notification Send API
 *
 * Sends a push notification to all subscribed devices for a user.
 * Uses the web-push library with VAPID credentials.
 *
 * MANUAL SETUP REQUIRED:
 * 1. Generate VAPID keys: npx web-push generate-vapid-keys
 * 2. Add to Vercel env vars: NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { title, body, url } = await request.json();
    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('endpoint, keys')
      .eq('user_id', user.id);

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ error: 'No subscriptions found' }, { status: 404 });
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 });
    }

    // Dynamic import to avoid build issues if web-push types differ
    const webpush = await import('web-push');
    webpush.setVapidDetails(
      'mailto:licona@liconarealty.com',
      vapidPublicKey,
      vapidPrivateKey
    );

    const payload = JSON.stringify({ title, body, url: url || '/' });
    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys as { p256dh: string; auth: string } },
          payload
        )
      )
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    return NextResponse.json({ sent, total: subscriptions.length });
  } catch (err) {
    console.error('Push send error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
