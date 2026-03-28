-- Phase 2: Calendar integration columns
-- Stores Google Calendar event IDs for follow-up and closing events

-- google_calendar_event_id on contacts: stores the event ID for the follow-up calendar event
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS google_calendar_event_id text;

-- calendar_event_ids on transactions: stores closing + walkthrough event IDs as JSONB
-- Format: { "closing": "event_id", "walkthrough": "event_id" }
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS calendar_event_ids jsonb DEFAULT '{}';
