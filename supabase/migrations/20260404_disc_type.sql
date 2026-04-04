-- Add DISC personality type column to contacts table
-- Valid values: 'D' (Driver), 'I' (Influencer), 'S' (Stabilizer), 'C' (Analyst), or NULL (not assessed)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS disc_type TEXT CHECK (disc_type IN ('D', 'I', 'S', 'C'));
