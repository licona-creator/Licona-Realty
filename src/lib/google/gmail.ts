/**
 * Gmail API Helper
 *
 * Fetches email metadata from Gmail API for sync into activities table.
 * Uses raw fetch with Bearer token from getGoogleAccessToken().
 * Only fetches metadata (From, To, Subject, Date) + snippet - no message bodies.
 */

export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  fromEmail: string;
  to: string;
  toEmail: string;
  subject: string;
  snippet: string;
  date: string;
  labelIds: string[];
}

/**
 * Parse "Name <email>" or bare "email" into { name, email }.
 * Takes first address if multiple comma-separated addresses present.
 */
export function parseEmailAddress(raw: string): { name: string; email: string } {
  if (!raw || !raw.trim()) {
    return { name: '', email: '' };
  }

  // Take first address if multiple
  const first = raw.split(',')[0].trim();

  const match = first.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim().replace(/^["']|["']$/g, ''), email: match[2].trim().toLowerCase() };
  }

  // Bare email
  const emailOnly = first.replace(/[<>]/g, '').trim().toLowerCase();
  return { name: '', email: emailOnly };
}

/**
 * Find a header value by name (case-insensitive).
 */
export function getHeader(headers: Array<{ name: string; value: string }>, name: string): string {
  const lower = name.toLowerCase();
  const header = headers.find((h) => h.name.toLowerCase() === lower);
  return header?.value || '';
}

/**
 * Fetch recent emails from Gmail API with batched metadata fetches.
 * Processes message IDs in batches of 10 with 100ms delay between batches.
 */
export async function fetchRecentEmails(
  accessToken: string,
  maxResults: number = 50,
  query?: string
): Promise<GmailMessage[]> {
  const q = query || 'newer_than:7d';
  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(q)}`;

  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!listRes.ok) {
    const errText = await listRes.text().catch(() => '');
    throw new Error(`Gmail list failed (${listRes.status}): ${errText}`);
  }

  const listData = await listRes.json();
  const messageIds: Array<{ id: string; threadId: string }> = listData.messages || [];

  if (messageIds.length === 0) return [];

  const messages: GmailMessage[] = [];
  const BATCH_SIZE = 10;

  for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
    const batch = messageIds.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(async (msg) => {
        const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error(`Fetch message ${msg.id} failed: ${res.status}`);
        return res.json();
      })
    );

    for (const result of batchResults) {
      if (result.status !== 'fulfilled') {
        console.error('[gmail] Failed to fetch message:', result.reason);
        continue;
      }

      const data = result.value;
      const headers = data.payload?.headers || [];
      const fromRaw = getHeader(headers, 'From');
      const toRaw = getHeader(headers, 'To');
      const parsed = {
        from: parseEmailAddress(fromRaw),
        to: parseEmailAddress(toRaw),
      };

      messages.push({
        id: data.id,
        threadId: data.threadId,
        from: fromRaw,
        fromEmail: parsed.from.email,
        to: toRaw,
        toEmail: parsed.to.email,
        subject: getHeader(headers, 'Subject'),
        snippet: data.snippet || '',
        date: getHeader(headers, 'Date'),
        labelIds: data.labelIds || [],
      });
    }

    // Delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < messageIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Sort by date descending
  messages.sort((a, b) => {
    const da = new Date(a.date).getTime() || 0;
    const db = new Date(b.date).getTime() || 0;
    return db - da;
  });

  return messages;
}
