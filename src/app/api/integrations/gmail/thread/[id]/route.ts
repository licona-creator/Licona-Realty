/**
 * Gmail Thread API
 *
 * Fetches a full email thread with all messages, decoding base64url bodies.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getGoogleAccessToken } from '@/lib/google/auth';

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

function decodeBase64Url(str: string): string {
  // Replace base64url chars with standard base64
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return Buffer.from(base64, 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailPart {
  mimeType: string;
  body?: { data?: string; size?: number };
  parts?: GmailPart[];
  headers?: GmailHeader[];
}

function extractBody(payload: GmailPart): { text: string; html: string } {
  let text = '';
  let html = '';

  if (payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data);
    if (payload.mimeType === 'text/html') {
      html = decoded;
    } else {
      text = decoded;
    }
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      const sub = extractBody(part);
      if (sub.text && !text) text = sub.text;
      if (sub.html && !html) html = sub.html;
    }
  }

  return { text, html };
}

function getHeader(headers: GmailHeader[], name: string): string {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const accessToken = await getGoogleAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: 'Google not connected' }, { status: 401 });
  }

  try {
    const res = await fetch(`${GMAIL_API}/threads/${id}?format=full`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch thread' }, { status: res.status });
    }

    const thread = await res.json();
    const messages = (thread.messages || []).map((msg: { id: string; snippet: string; labelIds?: string[]; payload: GmailPart & { headers: GmailHeader[] } }) => {
      const headers = msg.payload?.headers || [];
      const body = extractBody(msg.payload);
      return {
        id: msg.id,
        from: getHeader(headers, 'From'),
        to: getHeader(headers, 'To'),
        subject: getHeader(headers, 'Subject'),
        date: getHeader(headers, 'Date'),
        snippet: msg.snippet,
        body: body.html || body.text,
        isHtml: !!body.html,
        read: !(msg.labelIds || []).includes('UNREAD'),
      };
    });

    return NextResponse.json({ threadId: thread.id, messages });
  } catch (err) {
    console.error('[gmail-thread] Error:', err);
    return NextResponse.json({ error: 'Gmail API error' }, { status: 500 });
  }
}
