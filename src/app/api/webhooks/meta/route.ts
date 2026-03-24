/**
 * Meta (Instagram & Facebook) Webhook Endpoint
 *
 * Handles webhook verification challenges and incoming events.
 * Signature validation with Meta app secret REQUIRED.
 */

import { NextResponse } from 'next/server';
import { logger } from '@/lib/security/logger';

// Webhook verification (GET) - Meta sends a challenge to verify the endpoint
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken) {
    logger.info('Meta webhook verified');
    return new Response(challenge, { status: 200 });
  }

  logger.warn('Meta webhook verification failed');
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

// Webhook events (POST) - Meta sends event notifications
export async function POST(request: Request) {
  try {
    const appSecret = process.env.META_APP_SECRET;
    if (!appSecret) {
      logger.error('Meta app secret not configured');
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
      ['sign']
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

    const payload = JSON.parse(body);
    logger.info('Meta webhook received', { object: payload.object });

    // TODO: Process Instagram DMs, Facebook messages, lead form submissions
    // Route to appropriate handlers in Phase 10

    return NextResponse.json({ status: 'received' });
  } catch (error) {
    logger.error('Meta webhook processing error', { error: String(error) });
    return NextResponse.json({ error: 'Processing error' }, { status: 500 });
  }
}
