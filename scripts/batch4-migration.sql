-- Batch 4: Maps and Neighborhood Intelligence Migration
-- Run this in the Supabase SQL Editor

-- 1. Add neighborhood and county columns to contacts (if they don't exist)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS neighborhood text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS county text;

-- Verify lat/lng columns exist (they should)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS zip_code text;

-- 2. Create market_data_cache table
CREATE TABLE IF NOT EXISTS market_data_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  zip_code text NOT NULL UNIQUE,
  median_price numeric,
  avg_dom integer,
  homes_sold integer,
  new_listings integer,
  inventory_level integer,
  list_to_sale_ratio numeric,
  market_summary text,
  data_source text,
  fetched_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. RLS policies for market_data_cache
ALTER TABLE market_data_cache ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'market_data_cache' AND policyname = 'Users can read market data'
  ) THEN
    CREATE POLICY "Users can read market data" ON market_data_cache FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'market_data_cache' AND policyname = 'Users can insert market data'
  ) THEN
    CREATE POLICY "Users can insert market data" ON market_data_cache FOR INSERT TO authenticated WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'market_data_cache' AND policyname = 'Users can update market data'
  ) THEN
    CREATE POLICY "Users can update market data" ON market_data_cache FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;
