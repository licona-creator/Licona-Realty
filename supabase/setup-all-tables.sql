-- ============================================
-- Licona Realty Platform - Complete Database Setup
-- ============================================
-- Run this in the Supabase SQL Editor to set up all tables.
-- Safe to re-run: uses IF NOT EXISTS and CREATE OR REPLACE.
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUM TYPES (safe: will error if already exists, wrap in DO block)
-- ============================================

DO $$ BEGIN
  CREATE TYPE track_type AS ENUM ('buyer', 'seller', 'landlord', 'tenant', 'investor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sphere_relationship_type AS ENUM ('personal_friend', 'past_client', 'family', 'professional_connection', 'referral_partner');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE relationship_tier AS ENUM ('tier_1', 'tier_2', 'tier_3');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE language_preference AS ENUM ('en', 'es', 'bilingual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'edited_approved', 'discarded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE approval_item_type AS ENUM (
    'campaign_email', 'social_post', 'docusign', 'scheduling_confirmation',
    'testimonial_request', 'holiday_message', 'birthday_message', 'anniversary_message',
    'referral_ask', 'gbp_post', 'mortgage_results_email', 'auto_response', 'review_response'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pipeline_stage AS ENUM (
    'new', 'contacted', 'qualifying', 'nurturing', 'showing',
    'offer', 'under_contract', 'closing', 'closed', 'lost', 'on_hold'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE voice_tone_mode AS ENUM (
    'casual_friend', 'professional_personal', 'bilingual_casual',
    'bilingual_professional', 'celebratory', 'empathetic', 'investor_analytical'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE campaign_tone AS ENUM (
    'warm_relationship', 'direct_action', 'educational', 'soft_touch',
    'high_frequency', 'bilingual_mixed', 'bilingual_professional',
    'investor_analytical', 'empathetic', 'celebratory'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE content_pillar AS ENUM (
    'market_intelligence', 'client_wins', 'local_dfw',
    'education', 'behind_scenes', 'personal_brand'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE social_platform AS ENUM ('instagram', 'facebook');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE docusign_status AS ENUM ('draft', 'sent', 'viewed', 'signed', 'declined', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM (
    'login', 'login_failed', 'logout', 'data_access', 'data_export',
    'document_send', 'approval_action', 'record_create', 'record_update',
    'record_delete', 'mfa_setup', 'mfa_verify', 'mfa_failed', 'settings_change', 'bulk_action'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE booking_meeting_type AS ENUM (
    'buyer_consultation', 'seller_consultation', 'investor_strategy',
    'general_inquiry', 'showing_request'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM ('confirmed', 'cancelled', 'no_show', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE document_category AS ENUM (
    'contract', 'disclosure', 'inspection', 'identification',
    'correspondence', 'photo', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- HELPER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CONTACTS
-- ============================================

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  track_type track_type NOT NULL,
  pipeline_stage pipeline_stage NOT NULL DEFAULT 'new',
  lead_source TEXT,
  lead_score INTEGER NOT NULL DEFAULT 50 CHECK (lead_score >= 1 AND lead_score <= 100),
  language_preference language_preference NOT NULL DEFAULT 'en',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  campaign_enrollment_status TEXT,
  assigned_drip_campaign_options TEXT[],
  selected_drip_campaign UUID,
  optimization_flag_status TEXT,
  system_health_notes TEXT,
  last_contacted_at TIMESTAMPTZ,
  social_media_source TEXT,
  social_media_engagement_history JSONB,
  seo_interaction_tracking JSONB,
  voice_profile_interaction_history JSONB,
  scheduling_link_interactions JSONB,
  approval_queue_interaction_history JSONB,
  canva_asset_links TEXT[],
  document_references TEXT[],
  mls_agent_id TEXT,
  mls_listing_ids TEXT[],
  sms_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  sms_consent_date TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_track_type ON contacts(user_id, track_type);
CREATE INDEX IF NOT EXISTS idx_contacts_pipeline_stage ON contacts(user_id, pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_contacts_not_deleted ON contacts(user_id) WHERE is_deleted = FALSE;

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own contacts" ON contacts FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own contacts" ON contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own contacts" ON contacts FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own contacts" ON contacts FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS contacts_updated_at ON contacts;
CREATE TRIGGER contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SPHERE CONTACTS
-- ============================================

CREATE TABLE IF NOT EXISTS sphere_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_type sphere_relationship_type NOT NULL,
  relationship_tier relationship_tier NOT NULL DEFAULT 'tier_3',
  how_they_know_agent TEXT,
  referral_potential_score INTEGER NOT NULL DEFAULT 50 CHECK (referral_potential_score >= 1 AND referral_potential_score <= 100),
  last_personal_touchpoint TIMESTAMPTZ,
  birthday DATE,
  home_purchase_anniversary DATE,
  business_anniversary DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sphere_contacts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can view own sphere contacts" ON sphere_contacts FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own sphere contacts" ON sphere_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own sphere contacts" ON sphere_contacts FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own sphere contacts" ON sphere_contacts FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- REFERRALS
-- ============================================

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  referred_contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  referral_date DATE NOT NULL DEFAULT CURRENT_DATE,
  deal_resulted BOOLEAN NOT NULL DEFAULT FALSE,
  outcome TEXT,
  commission_generated DECIMAL(12, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can manage own referrals" ON referrals FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- ACTIVITY ENTRIES
-- ============================================

CREATE TABLE IF NOT EXISTS activity_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE activity_entries ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can manage own activity entries" ON activity_entries FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- CAMPAIGNS
-- ============================================

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  track_type track_type NOT NULL,
  tone campaign_tone NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_system_template BOOLEAN NOT NULL DEFAULT FALSE,
  performance_metrics JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can manage own campaigns" ON campaigns FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- CAMPAIGN STEPS
-- ============================================

CREATE TABLE IF NOT EXISTS campaign_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  delay_days INTEGER NOT NULL DEFAULT 0,
  subject TEXT,
  body_template TEXT NOT NULL,
  tone_mode voice_tone_mode NOT NULL DEFAULT 'professional_personal',
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms_placeholder')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE campaign_steps ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can manage own campaign steps" ON campaign_steps FOR ALL
    USING (EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = campaign_steps.campaign_id AND campaigns.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- CAMPAIGN ENROLLMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS campaign_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 1,
  is_paused BOOLEAN NOT NULL DEFAULT FALSE,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_step_sent_at TIMESTAMPTZ,
  next_step_due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE campaign_enrollments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can manage own enrollments" ON campaign_enrollments FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- APPROVAL QUEUE
-- ============================================

CREATE TABLE IF NOT EXISTS approval_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type approval_item_type NOT NULL,
  recipient_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  subject TEXT,
  content TEXT NOT NULL,
  content_html TEXT,
  scheduled_time TIMESTAMPTZ,
  trigger_source TEXT,
  tone_mode voice_tone_mode NOT NULL DEFAULT 'professional_personal',
  status approval_status NOT NULL DEFAULT 'pending',
  is_overdue BOOLEAN NOT NULL DEFAULT FALSE,
  urgency_level INTEGER NOT NULL DEFAULT 4 CHECK (urgency_level >= 1 AND urgency_level <= 4),
  edit_history JSONB[],
  discard_reason TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE approval_queue ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can manage own approval items" ON approval_queue FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- TRANSACTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  track_type track_type NOT NULL,
  property_address TEXT NOT NULL,
  property_city TEXT,
  property_state TEXT,
  property_zip TEXT,
  deal_type TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  contract_price DECIMAL(12, 2),
  closing_date DATE,
  key_dates JSONB,
  checklist JSONB,
  parties JSONB,
  commission_gross DECIMAL(12, 2),
  commission_broker_split DECIMAL(5, 4),
  commission_net DECIMAL(12, 2),
  notes JSONB,
  document_ids UUID[],
  docusign_envelope_ids TEXT[],
  mls_listing_id TEXT,
  mls_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can manage own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- DOCUMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  category document_category NOT NULL DEFAULT 'other',
  docusign_envelope_id TEXT,
  docusign_status docusign_status,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can manage own documents" ON documents FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- SOCIAL POSTS
-- ============================================

CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform social_platform NOT NULL,
  content_pillar content_pillar NOT NULL,
  caption TEXT NOT NULL,
  media_urls TEXT[],
  canva_design_id TEXT,
  scheduled_time TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  approval_queue_id UUID REFERENCES approval_queue(id) ON DELETE SET NULL,
  hashtags TEXT[],
  is_bilingual BOOLEAN NOT NULL DEFAULT FALSE,
  language language_preference NOT NULL DEFAULT 'en',
  reach INTEGER,
  impressions INTEGER,
  engagement_rate DECIMAL(5, 4),
  likes INTEGER,
  comments INTEGER,
  saves INTEGER,
  shares INTEGER,
  profile_visits INTEGER,
  link_clicks INTEGER,
  lead_captures INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can manage own social posts" ON social_posts FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- SOCIAL ANALYTICS
-- ============================================

CREATE TABLE IF NOT EXISTS social_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform social_platform NOT NULL,
  date DATE NOT NULL,
  followers INTEGER NOT NULL DEFAULT 0,
  follower_growth INTEGER NOT NULL DEFAULT 0,
  total_reach INTEGER NOT NULL DEFAULT 0,
  total_impressions INTEGER NOT NULL DEFAULT 0,
  total_engagement INTEGER NOT NULL DEFAULT 0,
  best_post_id UUID REFERENCES social_posts(id) ON DELETE SET NULL,
  pillar_performance JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE social_analytics ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can manage own social analytics" ON social_analytics FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- CANVA ASSETS
-- ============================================

CREATE TABLE IF NOT EXISTS canva_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  canva_design_id TEXT NOT NULL,
  template_type TEXT NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE canva_assets ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can manage own canva assets" ON canva_assets FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- TESTIMONIALS
-- ============================================

CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  star_rating INTEGER NOT NULL CHECK (star_rating >= 1 AND star_rating <= 5),
  review_text TEXT NOT NULL,
  client_first_name TEXT NOT NULL,
  client_city TEXT NOT NULL,
  transaction_type track_type NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  google_review_synced BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can manage own testimonials" ON testimonials FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Public can view published testimonials" ON testimonials FOR SELECT USING (is_published = TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- SEO ANALYTICS
-- ============================================

CREATE TABLE IF NOT EXISTS seo_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  estimated_position INTEGER,
  page_url TEXT NOT NULL,
  organic_visits INTEGER NOT NULL DEFAULT 0,
  lead_captures INTEGER NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE seo_analytics ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can manage own seo analytics" ON seo_analytics FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- MORTGAGE SUBMISSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS mortgage_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  annual_income_encrypted BYTEA NOT NULL,
  monthly_debts_encrypted BYTEA NOT NULL,
  down_payment_encrypted BYTEA NOT NULL,
  desired_location TEXT,
  affordability_estimate DECIMAL(12, 2),
  monthly_payment_estimate DECIMAL(12, 2),
  cash_to_close_estimate DECIMAL(12, 2),
  preapproval_readiness_score INTEGER CHECK (preapproval_readiness_score >= 0 AND preapproval_readiness_score <= 100),
  language language_preference NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE mortgage_submissions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can manage own mortgage submissions" ON mortgage_submissions FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- VOICE PROFILES
-- ============================================

CREATE TABLE IF NOT EXISTS voice_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tone_mode voice_tone_mode NOT NULL,
  approved_unchanged_count INTEGER NOT NULL DEFAULT 0,
  light_edit_count INTEGER NOT NULL DEFAULT 0,
  heavy_edit_count INTEGER NOT NULL DEFAULT 0,
  full_rewrite_count INTEGER NOT NULL DEFAULT 0,
  accuracy_score DECIMAL(5, 2),
  style_patterns JSONB,
  banned_phrases_triggered TEXT[],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, tone_mode)
);

ALTER TABLE voice_profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can manage own voice profiles" ON voice_profiles FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- INTELLIGENCE LOGS
-- ============================================

CREATE TABLE IF NOT EXISTS intelligence_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'urgent')),
  action_path TEXT,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE intelligence_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can manage own intelligence logs" ON intelligence_logs FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- BOOKINGS
-- ============================================

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  meeting_type booking_meeting_type NOT NULL,
  visitor_name TEXT NOT NULL,
  visitor_email TEXT NOT NULL,
  visitor_phone TEXT NOT NULL,
  visitor_note TEXT,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  google_calendar_event_id TEXT,
  status booking_status NOT NULL DEFAULT 'confirmed',
  pre_meeting_reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
  post_meeting_campaign_surfaced BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can manage own bookings" ON bookings FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- AUDIT LOGS (immutable)
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action audit_action NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details TEXT,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can view own audit logs" ON audit_logs FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Service role inserts audit logs" ON audit_logs FOR INSERT WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- USER INTEGRATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS user_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'docusign', 'canva', 'meta')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],
  provider_account_id TEXT,
  provider_email TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can manage own integrations" ON user_integrations FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- AGENT SETTINGS
-- ============================================

CREATE TABLE IF NOT EXISTS agent_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_name TEXT,
  profile_phone TEXT,
  profile_email TEXT,
  profile_bio TEXT,
  profile_tagline TEXT,
  profile_title TEXT,
  profile_brokerage TEXT,
  profile_license TEXT,
  profile_website TEXT,
  profile_instagram TEXT,
  brand_logo_url TEXT,
  brand_headshot_url TEXT,
  notification_preferences JSONB DEFAULT '{}',
  campaign_preferences JSONB DEFAULT '{}',
  platform_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT agent_settings_user_unique UNIQUE (user_id)
);

ALTER TABLE agent_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can read own settings" ON agent_settings FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own settings" ON agent_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own settings" ON agent_settings FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- STORAGE BUCKETS
-- ============================================

INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('imports', 'imports', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('canva-assets', 'canva-assets', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('social-media', 'social-media', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-assets', 'profile-assets', true) ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies (wrapped in exception handlers for idempotency)
DO $$ BEGIN
  CREATE POLICY "Users can upload documents" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own documents" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own documents" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can upload imports" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'imports' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own imports" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'imports' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own imports" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'imports' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can upload canva assets" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'canva-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own canva assets" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'canva-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can upload social media assets" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'social-media' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own social media assets" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'social-media' AND (storage.foldername(name))[1] = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Anyone can view profile assets" ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'profile-assets');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload profile assets" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'profile-assets');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Auto-purge function for audit logs
CREATE OR REPLACE FUNCTION purge_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs WHERE timestamp < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DONE - All tables, RLS policies, storage buckets, and indexes created.
-- ============================================
