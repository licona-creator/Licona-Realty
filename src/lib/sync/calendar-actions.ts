/**
 * Calendar Smart Write Actions
 *
 * Creates Google Calendar events from platform actions (follow-ups, closings).
 * Every function is wrapped in try/catch - calendar failures must NEVER
 * crash the parent operation (contact save, transaction save).
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getGoogleAccessToken } from '@/lib/google/auth';
import { createCalendarEvent, deleteCalendarEvent } from '@/lib/google/calendar';
import { getDisplayName } from '@/lib/format';

/**
 * Create a follow-up calendar event for a contact.
 * Returns event ID or null on error/not connected.
 */
export async function createFollowUpCalendarEvent(
  supabase: SupabaseClient,
  contact: { id: string; first_name: string; last_name: string; phone?: string | null },
  followUpDate: string,
  notes?: string
): Promise<string | null> {
  try {
    const accessToken = await getGoogleAccessToken(supabase);
    if (!accessToken) return null;

    const description =
      (notes || 'Follow-up reminder') +
      (contact.phone ? `\nPhone: ${contact.phone}` : '');

    const eventId = await createCalendarEvent(accessToken, {
      summary: `Follow up: ${getDisplayName(contact)}`,
      description,
      startDateTime: `${followUpDate}T09:00:00`,
      endDateTime: `${followUpDate}T09:30:00`,
      reminders: [
        { method: 'popup', minutes: 1440 }, // 1 day before
        { method: 'popup', minutes: 60 },   // 1 hour before
      ],
    });

    return eventId;
  } catch (err) {
    console.error('[calendar-actions] Failed to create follow-up event:', err);
    return null;
  }
}

/**
 * Create an all-day closing event.
 * Returns event ID or null on error.
 */
export async function createClosingCalendarEvent(
  supabase: SupabaseClient,
  transaction: { property_address: string; contact_name: string; closing_date: string }
): Promise<string | null> {
  try {
    const accessToken = await getGoogleAccessToken(supabase);
    if (!accessToken) return null;

    const eventId = await createCalendarEvent(accessToken, {
      summary: `CLOSING: ${transaction.property_address}`,
      description: `Closing day for ${transaction.contact_name}\n${transaction.property_address}`,
      allDay: true,
      date: transaction.closing_date,
      reminders: [
        { method: 'popup', minutes: 10080 }, // 7 days
        { method: 'popup', minutes: 4320 },  // 3 days
        { method: 'popup', minutes: 1440 },  // 1 day
        { method: 'popup', minutes: 60 },    // 1 hour
      ],
    });

    return eventId;
  } catch (err) {
    console.error('[calendar-actions] Failed to create closing event:', err);
    return null;
  }
}

/**
 * Create a final walkthrough event (1 day before closing, 4-5 PM CT).
 * Returns event ID or null on error.
 */
export async function createWalkthroughCalendarEvent(
  supabase: SupabaseClient,
  transaction: { property_address: string; contact_name: string; closing_date: string }
): Promise<string | null> {
  try {
    const accessToken = await getGoogleAccessToken(supabase);
    if (!accessToken) return null;

    // Calculate walkthrough date: 1 day before closing
    const closingDate = new Date(transaction.closing_date + 'T00:00:00');
    closingDate.setDate(closingDate.getDate() - 1);
    const walkthroughDate = closingDate.toISOString().split('T')[0];

    const eventId = await createCalendarEvent(accessToken, {
      summary: `Final Walkthrough: ${transaction.property_address}`,
      description: `Walkthrough with ${transaction.contact_name} before closing`,
      startDateTime: `${walkthroughDate}T16:00:00`,
      endDateTime: `${walkthroughDate}T17:00:00`,
      reminders: [
        { method: 'popup', minutes: 1440 }, // 1 day
        { method: 'popup', minutes: 120 },  // 2 hours
      ],
    });

    return eventId;
  } catch (err) {
    console.error('[calendar-actions] Failed to create walkthrough event:', err);
    return null;
  }
}

/**
 * Remove a calendar event. Fails silently on all errors.
 */
export async function removeCalendarEvent(
  supabase: SupabaseClient,
  eventId: string
): Promise<void> {
  try {
    const accessToken = await getGoogleAccessToken(supabase);
    if (!accessToken) return;
    await deleteCalendarEvent(accessToken, eventId);
  } catch (err) {
    console.error('[calendar-actions] Failed to remove calendar event:', err);
  }
}
