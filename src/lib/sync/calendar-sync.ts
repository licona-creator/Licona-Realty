/**
 * Calendar Sync Engine
 *
 * Reads Google Calendar events, matches attendees to contacts,
 * and creates activity records. De-duplicates by google_event_id in metadata.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getGoogleAccessToken } from '@/lib/google/auth';
import { fetchUpcomingEvents, fetchRecentEvents, type CalendarEvent } from '@/lib/google/calendar';
import { getDisplayName } from '@/lib/format';

export async function syncCalendarEvents(
  supabase: SupabaseClient,
  userId: string
): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  let syncLogId: string | null = null;

  try {
    // 1. Get access token
    const accessToken = await getGoogleAccessToken(supabase);
    if (!accessToken) {
      await supabase.from('sync_log').insert({
        user_id: userId,
        provider: 'google',
        sync_type: 'calendar',
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
        sync_type: 'calendar',
        status: 'running',
        items_synced: 0,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    syncLogId = logRow?.id || null;

    // 3. Fetch upcoming (30d) and recent (7d) events
    const [upcoming, recent] = await Promise.all([
      fetchUpcomingEvents(accessToken, 30),
      fetchRecentEvents(accessToken, 7),
    ]);

    // 4. Combine and deduplicate by eventId
    const eventMap = new Map<string, CalendarEvent>();
    for (const ev of [...recent, ...upcoming]) {
      eventMap.set(ev.eventId, ev);
    }
    const allEvents = Array.from(eventMap.values());

    // 5. Fetch all contacts with email
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, email, first_name, last_name')
      .eq('is_deleted', false);

    if (!contacts || contacts.length === 0) {
      await finalizeSyncLog(supabase, syncLogId, 'success', 0);
      return { synced: 0, errors: [] };
    }

    // 6. Build email-to-contact map
    const contactMap = new Map<string, { id: string; name: string }>();
    for (const c of contacts) {
      if (c.email) {
        contactMap.set(c.email.toLowerCase(), {
          id: c.id,
          name: getDisplayName(c),
        });
      }
    }

    // 7. Process events
    let synced = 0;
    for (const ev of allEvents) {
      try {
        // Check attendee emails against contact map
        let matchedContactId: string | null = null;
        for (const email of ev.attendees) {
          const match = contactMap.get(email.toLowerCase());
          if (match) {
            matchedContactId = match.id;
            break;
          }
        }

        if (!matchedContactId) continue;

        // Check for duplicate
        const { data: existing } = await supabase
          .from('activities')
          .select('id')
          .eq('contact_id', matchedContactId)
          .eq('metadata->>google_event_id', ev.eventId)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Insert activity
        const description = ev.summary + (ev.location ? ` at ${ev.location}` : '');
        await supabase.from('activities').insert({
          contact_id: matchedContactId,
          user_id: userId,
          activity_type: 'meeting',
          direction: 'outbound',
          description: description.substring(0, 500),
          activity_date: ev.start || new Date().toISOString(),
          metadata: {
            google_event_id: ev.eventId,
            location: ev.location,
            attendees: ev.attendees,
          },
        });

        synced++;
      } catch (evErr) {
        const errMsg = evErr instanceof Error ? evErr.message : String(evErr);
        console.error('[calendar-sync] Error processing event:', ev.eventId, errMsg);
        errors.push(`Event ${ev.eventId}: ${errMsg}`);
      }
    }

    // 8. Update sync_log
    await finalizeSyncLog(supabase, syncLogId, 'success', synced);

    return { synced, errors };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[calendar-sync] Sync failed:', errMsg);
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
