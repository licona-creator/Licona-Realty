-- Migration: Create referral_partners table and link to contacts
-- Tracks Ana and other referral partners who send leads to Anthony

CREATE TABLE IF NOT EXISTS referral_partners (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  first_name text NOT NULL,
  last_name text,
  company text,
  role text,
  phone text,
  email text,
  language_preference text DEFAULT 'Spanish',
  referral_fee_structure text,
  notes text,
  total_leads_sent integer DEFAULT 0,
  total_closings integer DEFAULT 0,
  total_revenue_generated numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE referral_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own partners" ON referral_partners FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Link contacts to referral partners
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS referral_partner_id uuid REFERENCES referral_partners(id);
CREATE INDEX IF NOT EXISTS idx_contacts_referral_partner ON contacts(referral_partner_id) WHERE referral_partner_id IS NOT NULL;
