/**
 * Gmail Inbox API
 *
 * Fetches recent primary inbox emails via Gmail API.
 * Uses getGoogleAccessToken() for automatic token refresh.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getGoogleAccessToken } from '@/lib/google/auth';

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  labelIds?: string[];
  payload?: {
    headers: GmailHeader[];
  };
}

function getHeader(headers: GmailHeader[], name: string): string {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const accessToken = await getGoogleAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: 'Google not connected' }, { status: 401 });
  }

  const pageToken = request.nextUrl.searchParams.get('pageToken') || '';
  const maxResults = request.nextUrl.searchParams.get('maxResults') || '20';

  try {
    // List messages
    const listParams = new URLSearchParams({
      maxResults,
      q: 'category:primary',
    });
    if (pageToken) listParams.set('pageToken', pageToken);

    const listRes = await fetch(`${GMAIL_API}/messages?${listParams}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listRes.ok) {
      const err = await listRes.text();
      console.error('[gmail-inbox] List failed:', err);
      return NextResponse.json({ error: 'Failed to fetch inbox' }, { status: listRes.status });
    }

    const listData = await listRes.json();
    const messageIds: Array<{ id: string }> = listData.messages || [];

    // Fetch metadata for each message in parallel
    const messages = await Promise.all(
      messageIds.map(async ({ id }) => {
        const metaParams = new URLSearchParams({
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date'].join('&metadataHeaders='),
        });

        const msgRes = await fetch(
          `${GMAIL_API}/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );

        if (!msgRes.ok) return null;

        const msg: GmailMessage = await msgRes.json();
        const headers = msg.payload?.headers || [];

        return {
          id: msg.id,
          threadId: msg.threadId,
          from: getHeader(headers, 'From'),
          to: getHeader(headers, 'To'),
          subject: getHeader(headers, 'Subject'),
          date: getHeader(headers, 'Date'),
          snippet: msg.snippet,
          read: !(msg.labelIds || []).includes('UNREAD'),
        };
      }),
    );

    return NextResponse.json({
      messages: messages.filter(Boolean),
      nextPageToken: listData.nextPageToken || null,
    });
  } catch (err) {
    console.error('[gmail-inbox] Error:', err);
    return NextResponse.json({ error: 'Gmail API error' }, { status: 500 });
  }
}
