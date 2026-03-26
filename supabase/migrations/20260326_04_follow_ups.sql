-- Migration: Add follow-up tracking columns to contacts

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS next_follow_up_date date;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_contact_date date;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS follow_up_notes text;

CREATE INDEX IF NOT EXISTS idx_contacts_follow_up ON contacts(next_follow_up_date) WHERE is_deleted = false AND next_follow_up_date IS NOT NULL;
