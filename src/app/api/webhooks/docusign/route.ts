/**
 * DocuSign Webhook Endpoint
 *
 * Receives envelope status updates from DocuSign Connect.
 * HMAC signature validation REQUIRED before processing any data.
 * No sensitive data logged.
 */

import { NextResponse } from 'next/server';
import { logger } from '@/lib/security/logger';

export async function POST(request: Request) {
  try {
    // Validate HMAC signature from DocuSign
    const hmacKey = process.env.DOCUSIGN_HMAC_KEY;
    if (!hmacKey) {
      logger.error('DocuSign HMAC key not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const signature = request.headers.get('x-docusign-signature-1');
    if (!signature) {
      logger.warn('DocuSign webhook received without signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const body = await request.text();

    // HMAC-SHA256 signature validation
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(hmacKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const computedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));

    if (computedSignature !== signature) {
      logger.warn('DocuSign webhook signature mismatch');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Signature valid — process the webhook payload
    const payload = JSON.parse(body);
    logger.info('DocuSign webhook received', {
      event: payload.event,
      envelopeId: payload.data?.envelopeId,
    });

    // TODO: Process envelope status updates in Phase 16
    // Update transaction records, document status, and trigger approval queue items

    return NextResponse.json({ status: 'received' });
  } catch (error) {
    logger.error('DocuSign webhook processing error', { error: String(error) });
    return NextResponse.json({ error: 'Processing error' }, { status: 500 });
  }
}
