-- Commission tracking columns on transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 3.0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS referral_fee numeric DEFAULT 0;
