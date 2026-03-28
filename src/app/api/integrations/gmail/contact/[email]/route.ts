/**
 * Gmail Contact Email History
 *
 * Fetches recent email threads with a specific contact by email address.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getGoogleAccessToken } from '@/lib/google/auth';

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

interface GmailHeader {
  name: string;
  value: string;
}

function getHeader(headers: GmailHeader[], name: string): string {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ email: string }> },
) {
  const { email } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const accessToken = await getGoogleAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: 'Google not connected' }, { status: 401 });
  }

  try {
    const decodedEmail = decodeURIComponent(email);
    const query = `from:${decodedEmail} OR to:${decodedEmail}`;
    const listRes = await fetch(
      `${GMAIL_API}/messages?${new URLSearchParams({ q: query, maxResults: '10' })}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!listRes.ok) {
      return NextResponse.json({ error: 'Failed to search emails' }, { status: listRes.status });
    }

    const listData = await listRes.json();
    const messageIds: Array<{ id: string }> = listData.messages || [];

    const messages = await Promise.all(
      messageIds.map(async ({ id }) => {
        const msgRes = await fetch(
          `${GMAIL_API}/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        if (!msgRes.ok) return null;

        const msg = await msgRes.json();
        const headers: GmailHeader[] = msg.payload?.headers || [];
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

    return NextResponse.json({ messages: messages.filter(Boolean) });
  } catch (err) {
    console.error('[gmail-contact] Error:', err);
    return NextResponse.json({ error: 'Gmail API error' }, { status: 500 });
  }
}
