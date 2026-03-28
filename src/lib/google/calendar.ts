/**
 * Google Calendar API Helper
 *
 * Read and write functions for Google Calendar integration.
 * Uses raw fetch with Bearer token from getGoogleAccessToken().
 * All timed events use America/Chicago timezone.
 */

export interface CalendarEvent {
  eventId: string;
  summary: string;
  description: string;
  start: string;
  end: string;
  attendees: string[];
  location: string;
  htmlLink: string;
}

export interface CreateEventInput {
  summary: string;
  description?: string;
  startDateTime?: string;
  endDateTime?: string;
  allDay?: boolean;
  date?: string;
  reminders?: Array<{ method: string; minutes: number }>;
}

const CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

function parseEventDateTime(ev: { dateTime?: string; date?: string }): string {
  return ev.dateTime || ev.date || '';
}

function parseEvent(item: Record<string, unknown>): CalendarEvent {
  const start = item.start as { dateTime?: string; date?: string } | undefined;
  const end = item.end as { dateTime?: string; date?: string } | undefined;
  const attendees = (item.attendees as Array<{ email?: string }>) || [];

  return {
    eventId: item.id as string,
    summary: (item.summary as string) || '',
    description: (item.description as string) || '',
    start: start ? parseEventDateTime(start) : '',
    end: end ? parseEventDateTime(end) : '',
    attendees: attendees.map((a) => a.email || '').filter(Boolean),
    location: (item.location as string) || '',
    htmlLink: (item.htmlLink as string) || '',
  };
}

/**
 * Fetch upcoming calendar events (next N days).
 */
export async function fetchUpcomingEvents(
  accessToken: string,
  days: number = 30
): Promise<CalendarEvent[]> {
  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '100',
  });

  const res = await fetch(`${CALENDAR_BASE}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Calendar upcoming fetch failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return (data.items || []).map(parseEvent);
}

/**
 * Fetch recent calendar events (past N days).
 */
export async function fetchRecentEvents(
  accessToken: string,
  days: number = 7
): Promise<CalendarEvent[]> {
  const timeMin = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date().toISOString();

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '100',
  });

  const res = await fetch(`${CALENDAR_BASE}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Calendar recent fetch failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return (data.items || []).map(parseEvent);
}

/**
 * Create a new calendar event. Returns the created event ID.
 */
export async function createCalendarEvent(
  accessToken: string,
  event: CreateEventInput
): Promise<string> {
  const body: Record<string, unknown> = {
    summary: event.summary,
    description: event.description || '',
  };

  if (event.allDay && event.date) {
    body.start = { date: event.date };
    body.end = { date: event.date };
  } else {
    body.start = { dateTime: event.startDateTime, timeZone: 'America/Chicago' };
    body.end = { dateTime: event.endDateTime, timeZone: 'America/Chicago' };
  }

  body.reminders = {
    useDefault: false,
    overrides: event.reminders || [{ method: 'popup', minutes: 60 }],
  };

  const res = await fetch(CALENDAR_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Calendar create failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.id;
}

/**
 * Delete a calendar event. Silently handles 404/410 (already gone).
 */
export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  const res = await fetch(`${CALENDAR_BASE}/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // 204 = success, 404/410 = already gone - all fine
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Calendar delete failed (${res.status}): ${errText}`);
  }
}
