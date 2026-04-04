-- Add AI enrichment columns to contacts table for DISC profiling
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS disc_secondary TEXT CHECK (disc_secondary IN ('D', 'I', 'S', 'C'));
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS disc_confidence TEXT CHECK (disc_confidence IN ('high', 'medium', 'low'));
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS engagement_temperature TEXT CHECK (engagement_temperature IN ('hot', 'warm', 'cool', 'cold'));
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS personality_brief TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS communication_tips TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS buying_motivation TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS silence_meaning TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_enriched_at TIMESTAMPTZ;
