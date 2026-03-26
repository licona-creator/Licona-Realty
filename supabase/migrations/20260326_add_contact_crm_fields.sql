-- Migration: Add extended CRM fields to contacts table
-- These fields support the full contact management workflow

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS budget text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS location_preference text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS notes text;

-- Ensure existing columns have sensible defaults
ALTER TABLE contacts ALTER COLUMN language_preference SET DEFAULT 'en';
ALTER TABLE contacts ALTER COLUMN pipeline_stage SET DEFAULT 'new';
ALTER TABLE contacts ALTER COLUMN lead_score SET DEFAULT 50;

-- Add index on pipeline_stage for dashboard queries
CREATE INDEX IF NOT EXISTS idx_contacts_pipeline_stage ON contacts(pipeline_stage) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_contacts_lead_source ON contacts(lead_source) WHERE is_deleted = false;
