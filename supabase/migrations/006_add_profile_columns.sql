-- Add commonly needed profile columns to agent_settings
-- These are referenced by the settings API PUT handler

ALTER TABLE agent_settings ADD COLUMN IF NOT EXISTS profile_email text;
ALTER TABLE agent_settings ADD COLUMN IF NOT EXISTS profile_website text;
ALTER TABLE agent_settings ADD COLUMN IF NOT EXISTS profile_license text;
ALTER TABLE agent_settings ADD COLUMN IF NOT EXISTS profile_brokerage text;
