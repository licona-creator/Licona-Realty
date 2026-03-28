/**
 * Email Sync Engine
 *
 * Pulls emails from Gmail via API, matches to contacts by email address,
 * and creates activity records. De-duplicates by gmail_message_id in metadata.
 * Updates contact last_contact_date if email is more recent.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getGoogleAccessToken } from '@/lib/google/auth';
import { fetchRecentEmails, type GmailMessage } from '@/lib/google/gmail';

const OWN_EMAILS = new Set([
  'licona@liconarealty.com',
  'anthony@liconarealty.com',
]);

export async function syncEmails(
  supabase: SupabaseClient,
  userId: string
): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  let syncLogId: string | null = null;

  try {
    // 1. Get Google access token
    const accessToken = await getGoogleAccessToken(supabase);
    if (!accessToken) {
      await supabase.from('sync_log').insert({
        user_id: userId,
        provider: 'google',
        sync_type: 'email',
        status: 'error',
        error_message: 'Google not connected',
        items_synced: 0,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });
      return { synced: 0, errors: ['Google not connected'] };
    }

    // 2. Create sync_log entry
    const { data: logRow } = await supabase
      .from('sync_log')
      .insert({
        user_id: userId,
        provider: 'google',
        sync_type: 'email',
        status: 'running',
        items_synced: 0,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    syncLogId = logRow?.id || null;

    // 3. Get last successful email sync timestamp
    const { data: lastSync } = await supabase
      .from('sync_log')
      .select('completed_at')
      .eq('provider', 'google')
      .eq('sync_type', 'email')
      .eq('status', 'success')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    // 4. Build Gmail query
    let query: string;
    if (lastSync?.completed_at) {
      const epochSeconds = Math.floor(new Date(lastSync.completed_at).getTime() / 1000);
      query = `after:${epochSeconds}`;
    } else {
      query = 'newer_than:7d';
    }

    // 5. Fetch emails
    const messages = await fetchRecentEmails(accessToken, 50, query);

    // 6. Fetch all contacts
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, email, first_name, last_name')
      .eq('is_deleted', false);

    if (!contacts || contacts.length === 0) {
      await finalizeSyncLog(supabase, syncLogId, 'success', 0);
      return { synced: 0, errors: [] };
    }

    // 7. Build email-to-contact lookup
    const contactMap = new Map<string, { id: string; name: string }>();
    for (const c of contacts) {
      if (c.email) {
        contactMap.set(c.email.toLowerCase(), {
          id: c.id,
          name: `${c.first_name} ${c.last_name}`,
        });
      }
    }

    // 9. Process each message
    let synced = 0;
    for (const msg of messages) {
      try {
        const fromLower = msg.fromEmail.toLowerCase();
        const toLower = msg.toEmail.toLowerCase();

        // Match to a contact
        let matchedContactId: string | null = null;
        let direction: 'inbound' | 'outbound' = 'inbound';

        if (contactMap.has(fromLower) && !OWN_EMAILS.has(fromLower)) {
          // Inbound from a known contact
          matchedContactId = contactMap.get(fromLower)!.id;
          direction = 'inbound';
        } else if (contactMap.has(toLower) && !OWN_EMAILS.has(toLower)) {
          // Outbound to a known contact
          matchedContactId = contactMap.get(toLower)!.id;
          direction = 'outbound';
        } else {
          // No matching contact - skip
          continue;
        }

        // Determine direction based on own email
        if (OWN_EMAILS.has(fromLower)) {
          direction = 'outbound';
        }

        // Check for duplicate
        const { data: existing } = await supabase
          .from('activities')
          .select('id')
          .eq('contact_id', matchedContactId)
          .eq('metadata->>gmail_message_id', msg.id)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Parse email date
        const emailDate = new Date(msg.date);
        const activityDate = isNaN(emailDate.getTime()) ? new Date() : emailDate;

        // Insert activity
        await supabase.from('activities').insert({
          contact_id: matchedContactId,
          user_id: userId,
          activity_type: 'email',
          direction,
          description: (msg.subject || '(no subject)').substring(0, 500),
          activity_date: activityDate.toISOString(),
          metadata: {
            gmail_message_id: msg.id,
            gmail_thread_id: msg.threadId,
            from: msg.from,
            to: msg.to,
            subject: msg.subject,
            snippet: msg.snippet,
          },
        });

        // Update last_contact_date if this email is more recent
        const dateStr = activityDate.toISOString().split('T')[0];
        const { data: contact } = await supabase
          .from('contacts')
          .select('last_contact_date')
          .eq('id', matchedContactId)
          .single();

        if (contact && (!contact.last_contact_date || contact.last_contact_date < dateStr)) {
          await supabase
            .from('contacts')
            .update({ last_contact_date: dateStr })
            .eq('id', matchedContactId);
        }

        synced++;
      } catch (msgErr) {
        const errMsg = msgErr instanceof Error ? msgErr.message : String(msgErr);
        console.error('[email-sync] Error processing message:', msg.id, errMsg);
        errors.push(`Message ${msg.id}: ${errMsg}`);
      }
    }

    // 10. Update sync_log
    await finalizeSyncLog(supabase, syncLogId, 'success', synced);

    return { synced, errors };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[email-sync] Sync failed:', errMsg);
    if (syncLogId) {
      await finalizeSyncLog(supabase, syncLogId, 'error', 0, errMsg);
    }
    return { synced: 0, errors: [errMsg] };
  }
}

async function finalizeSyncLog(
  supabase: SupabaseClient,
  logId: string | null,
  status: string,
  itemsSynced: number,
  errorMessage?: string
) {
  if (!logId) return;
  await supabase
    .from('sync_log')
    .update({
      status,
      items_synced: itemsSynced,
      completed_at: new Date().toISOString(),
      ...(errorMessage ? { error_message: errorMessage } : {}),
    })
    .eq('id', logId);
}
