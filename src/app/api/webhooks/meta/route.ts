/**
 * Meta (Instagram & Facebook) Webhook Endpoint
 *
 * GET  - Webhook verification challenge (Meta sends on setup)
 * POST - Incoming events (DMs, comments, mentions, leads)
 *
 * Signature validation with META_APP_SECRET is REQUIRED on POST.
 * META_WEBHOOK_VERIFY_TOKEN must be set to: licona_realty_webhook_verify
 */

import { NextResponse } from 'next/server';
import { logger } from '@/lib/security/logger';

/**
 * Webhook verification (GET)
 *
 * Meta sends: hub.mode=subscribe, hub.verify_token=<your token>, hub.challenge=<random>
 * Must respond with 200 and the challenge value as plain text.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (!verifyToken) {
    logger.error('META_WEBHOOK_VERIFY_TOKEN is not set in environment variables');
    return new Response('Server configuration error', { status: 500 });
  }

  if (mode === 'subscribe' && token === verifyToken) {
    logger.info('Meta webhook verified successfully');
    // Meta requires the challenge echoed back as plain text, not JSON
    return new Response(challenge || '', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  logger.warn('Meta webhook verification failed', {
    modeMatch: mode === 'subscribe',
    tokenMatch: token === verifyToken,
  });
  return new Response('Forbidden', { status: 403 });
}

/**
 * Webhook events (POST)
 *
 * Meta sends event notifications with X-Hub-Signature-256 header.
 * Must return 200 immediately; Meta retries on non-2xx responses.
 */
export async function POST(request: Request) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    logger.error('META_APP_SECRET is not configured');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  // Validate X-Hub-Signature-256
  const signature = request.headers.get('x-hub-signature-256');
  if (!signature) {
    logger.warn('Meta webhook received without signature');
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
  }

  const body = await request.text();

  // HMAC-SHA256 validation
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const hex = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const expectedSignature = `sha256=${hex}`;

  if (expectedSignature !== signature) {
    logger.warn('Meta webhook signature mismatch');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Return 200 immediately as Meta requires fast response
  // Parse and log events; actual processing is async
  try {
    const payload = JSON.parse(body);
    const objectType = payload.object; // 'instagram' | 'page'

    if (payload.entry && Array.isArray(payload.entry)) {
      for (const entry of payload.entry) {
        if (objectType === 'instagram') {
          // Instagram events: DMs, comments, mentions, story replies
          if (entry.messaging) {
            logger.info('Meta webhook: Instagram DM received', { entryId: entry.id });
          }
          if (entry.changes) {
            for (const change of entry.changes) {
              logger.info('Meta webhook: Instagram change', {
                field: change.field,
                entryId: entry.id,
              });
            }
          }
        } else if (objectType === 'page') {
          // Facebook page events: messages, leads, comments
          if (entry.messaging) {
            logger.info('Meta webhook: Page message received', { entryId: entry.id });
          }
          if (entry.changes) {
            for (const change of entry.changes) {
              logger.info('Meta webhook: Page change', {
                field: change.field,
                entryId: entry.id,
              });
            }
          }
        } else {
          logger.info('Meta webhook: Unknown object type', { objectType, entryId: entry.id });
        }
      }
    }
  } catch (parseError) {
    logger.error('Meta webhook payload parse error', { error: String(parseError) });
  }

  return NextResponse.json({ status: 'received' });
}
