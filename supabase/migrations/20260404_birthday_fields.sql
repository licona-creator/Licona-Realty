-- Add birthday, company, job_title, and import_source fields to contacts
-- MANUAL STEP: Run this migration against your Supabase database

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS birthday_month INTEGER CHECK (birthday_month BETWEEN 1 AND 12);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS birthday_day INTEGER CHECK (birthday_day BETWEEN 1 AND 31);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS birthday_year INTEGER;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS import_source TEXT;
