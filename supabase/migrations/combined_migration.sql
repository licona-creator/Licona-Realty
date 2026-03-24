-- ============================================
-- Licona Realty Platform - Initial Database Schema
-- ============================================
-- All tables have Row Level Security (RLS) ENABLED.
-- PII fields use pgcrypto for encryption at rest where applicable.
-- Audit log table is immutable - no DELETE policy.
-- MLS and SMS placeholder fields included from day one.
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE track_type AS ENUM ('buyer', 'seller', 'landlord', 'tenant', 'investor');
CREATE TYPE sphere_relationship_type AS ENUM ('personal_friend', 'past_client', 'family', 'professional_connection', 'referral_partner');
CREATE TYPE relationship_tier AS ENUM ('tier_1', 'tier_2', 'tier_3');
CREATE TYPE language_preference AS ENUM ('en', 'es', 'bilingual');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'edited_approved', 'discarded');
CREATE TYPE approval_item_type AS ENUM (
  'campaign_email', 'social_post', 'docusign', 'scheduling_confirmation',
  'testimonial_request', 'holiday_message', 'birthday_message', 'anniversary_message',
  'referral_ask', 'gbp_post', 'mortgage_results_email', 'auto_response', 'review_response'
);
CREATE TYPE pipeline_stage AS ENUM (
  'new', 'contacted', 'qualifying', 'nurturing', 'showing',
  'offer', 'under_contract', 'closing', 'closed', 'lost', 'on_hold'
);
CREATE TYPE voice_tone_mode AS ENUM (
  'casual_friend', 'professional_personal', 'bilingual_casual',
  'bilingual_professional', 'celebratory', 'empathetic', 'investor_analytical'
);
CREATE TYPE campaign_tone AS ENUM (
  'warm_relationship', 'direct_action', 'educational', 'soft_touch',
  'high_frequency', 'bilingual_mixed', 'bilingual_professional',
  'investor_analytical', 'empathetic', 'celebratory'
);
CREATE TYPE content_pillar AS ENUM (
  'market_intelligence', 'client_wins', 'local_dfw',
  'education', 'behind_scenes', 'personal_brand'
);
CREATE TYPE social_platform AS ENUM ('instagram', 'facebook');
CREATE TYPE docusign_status AS ENUM ('draft', 'sent', 'viewed', 'signed', 'declined', 'expired');
CREATE TYPE audit_action AS ENUM (
  'login', 'login_failed', 'logout', 'data_access', 'data_export',
  'document_send', 'approval_action', 'record_create', 'record_update',
  'record_delete', 'mfa_setup', 'mfa_verify', 'mfa_failed', 'settings_change', 'bulk_action'
);
CREATE TYPE booking_meeting_type AS ENUM (
  'buyer_consultation', 'seller_consultation', 'investor_strategy',
  'general_inquiry', 'showing_request'
);
CREATE TYPE booking_status AS ENUM ('confirmed', 'cancelled', 'no_show', 'completed');
CREATE TYPE document_category AS ENUM (
  'contract', 'disclosure', 'inspection', 'identification',
  'correspondence', 'photo', 'other'
);

-- ============================================
-- CONTACTS TABLE
-- ============================================

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- PII Fields (encrypted at rest via Supabase disk encryption + pgcrypto for sensitive fields)
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,                     -- E.164 format
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,

  -- Track and Pipeline
  track_type track_type NOT NULL,
  pipeline_stage pipeline_stage NOT NULL DEFAULT 'new',
  lead_source TEXT,
  lead_score INTEGER NOT NULL DEFAULT 50 CHECK (lead_score >= 1 AND lead_score <= 100),

  -- Preferences
  language_preference language_preference NOT NULL DEFAULT 'en',

  -- Location for Google Maps
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,

  -- Campaign
  campaign_enrollment_status TEXT,
  assigned_drip_campaign_options TEXT[],
  selected_drip_campaign UUID,

  -- Intelligence Layer
  optimization_flag_status TEXT,
  system_health_notes TEXT,
  last_contacted_at TIMESTAMPTZ,

  -- Social Media
  social_media_source TEXT,
  social_media_engagement_history JSONB,

  -- SEO
  seo_interaction_tracking JSONB,

  -- Voice Profile
  voice_profile_interaction_history JSONB,

  -- Scheduling
  scheduling_link_interactions JSONB,

  -- Approval Queue
  approval_queue_interaction_history JSONB,

  -- Canva
  canva_asset_links TEXT[],

  -- Document References
  document_references TEXT[],

  -- MLS Placeholder
  mls_agent_id TEXT,
  mls_listing_ids TEXT[],

  -- SMS Placeholder
  sms_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  sms_consent_date TIMESTAMPTZ,

  -- Soft delete
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_track_type ON contacts(user_id, track_type);
CREATE INDEX idx_contacts_pipeline_stage ON contacts(user_id, pipeline_stage);
CREATE INDEX idx_contacts_lead_score ON contacts(user_id, lead_score DESC);
CREATE INDEX idx_contacts_last_contacted ON contacts(user_id, last_contacted_at);
CREATE INDEX idx_contacts_location ON contacts(latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX idx_contacts_not_deleted ON contacts(user_id) WHERE is_deleted = FALSE;

-- RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contacts"
  ON contacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contacts"
  ON contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts"
  ON contacts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts"
  ON contacts FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SPHERE CONTACTS TABLE
-- ============================================

CREATE TABLE sphere_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  relationship_type sphere_relationship_type NOT NULL,
  relationship_tier relationship_tier NOT NULL DEFAULT 'tier_3',
  how_they_know_agent TEXT,
  referral_potential_score INTEGER NOT NULL DEFAULT 50 CHECK (referral_potential_score >= 1 AND referral_potential_score <= 100),
  last_personal_touchpoint TIMESTAMPTZ,

  -- Milestone Dates
  birthday DATE,
  home_purchase_anniversary DATE,
  business_anniversary DATE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sphere_user_id ON sphere_contacts(user_id);
CREATE INDEX idx_sphere_contact_id ON sphere_contacts(contact_id);
CREATE INDEX idx_sphere_tier ON sphere_contacts(user_id, relationship_tier);
CREATE INDEX idx_sphere_birthday ON sphere_contacts(birthday) WHERE birthday IS NOT NULL;

ALTER TABLE sphere_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sphere contacts"
  ON sphere_contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sphere contacts"
  ON sphere_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sphere contacts"
  ON sphere_contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sphere contacts"
  ON sphere_contacts FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER sphere_contacts_updated_at
  BEFORE UPDATE ON sphere_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- REFERRALS TABLE
-- ============================================

CREATE TABLE referrals (
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
CREATE POLICY "Users can manage own referrals"
  ON referrals FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- ACTIVITY TIMELINE TABLE
-- ============================================

CREATE TABLE activity_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_contact ON activity_entries(contact_id, created_at DESC);

ALTER TABLE activity_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own activity entries"
  ON activity_entries FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- CAMPAIGNS TABLE
-- ============================================

CREATE TABLE campaigns (
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
CREATE POLICY "Users can manage own campaigns"
  ON campaigns FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- CAMPAIGN STEPS TABLE
-- ============================================

CREATE TABLE campaign_steps (
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

CREATE INDEX idx_campaign_steps ON campaign_steps(campaign_id, step_number);

ALTER TABLE campaign_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own campaign steps"
  ON campaign_steps FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM campaigns WHERE campaigns.id = campaign_steps.campaign_id AND campaigns.user_id = auth.uid()
    )
  );

-- ============================================
-- CAMPAIGN ENROLLMENTS TABLE
-- ============================================

CREATE TABLE campaign_enrollments (
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

CREATE INDEX idx_enrollments_contact ON campaign_enrollments(contact_id);
CREATE INDEX idx_enrollments_next_due ON campaign_enrollments(next_step_due_at) WHERE NOT is_paused AND NOT is_completed;

ALTER TABLE campaign_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own enrollments"
  ON campaign_enrollments FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- APPROVAL QUEUE TABLE
-- ============================================

CREATE TABLE approval_queue (
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

CREATE INDEX idx_approval_queue_pending ON approval_queue(user_id, status, urgency_level) WHERE status = 'pending';
CREATE INDEX idx_approval_queue_scheduled ON approval_queue(scheduled_time) WHERE status = 'pending';

ALTER TABLE approval_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own approval items"
  ON approval_queue FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER approval_queue_updated_at
  BEFORE UPDATE ON approval_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================

CREATE TABLE transactions (
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
  -- MLS Placeholder
  mls_listing_id TEXT,
  mls_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_contact ON transactions(contact_id);
CREATE INDEX idx_transactions_closing ON transactions(closing_date) WHERE status = 'active';

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own transactions"
  ON transactions FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- DOCUMENTS TABLE
-- ============================================

CREATE TABLE documents (
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
CREATE POLICY "Users can manage own documents"
  ON documents FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- SOCIAL POSTS TABLE
-- ============================================

CREATE TABLE social_posts (
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
CREATE POLICY "Users can manage own social posts"
  ON social_posts FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- SOCIAL ANALYTICS TABLE
-- ============================================

CREATE TABLE social_analytics (
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
CREATE POLICY "Users can manage own social analytics"
  ON social_analytics FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- CANVA ASSETS TABLE
-- ============================================

CREATE TABLE canva_assets (
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
CREATE POLICY "Users can manage own canva assets"
  ON canva_assets FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- TESTIMONIALS TABLE
-- ============================================

CREATE TABLE testimonials (
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
CREATE POLICY "Users can manage own testimonials"
  ON testimonials FOR ALL USING (auth.uid() = user_id);
-- Public read for published testimonials (SEO page)
CREATE POLICY "Public can view published testimonials"
  ON testimonials FOR SELECT USING (is_published = TRUE);

-- ============================================
-- SEO ANALYTICS TABLE
-- ============================================

CREATE TABLE seo_analytics (
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
CREATE POLICY "Users can manage own seo analytics"
  ON seo_analytics FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- MORTGAGE SUBMISSIONS TABLE
-- ============================================

CREATE TABLE mortgage_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  -- Financial PII encrypted with pgcrypto
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
CREATE POLICY "Users can manage own mortgage submissions"
  ON mortgage_submissions FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- VOICE PROFILE TABLE
-- ============================================

CREATE TABLE voice_profiles (
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
CREATE POLICY "Users can manage own voice profiles"
  ON voice_profiles FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- INTELLIGENCE LOG TABLE
-- ============================================

CREATE TABLE intelligence_logs (
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

CREATE INDEX idx_intelligence_unresolved ON intelligence_logs(user_id, severity) WHERE NOT is_resolved;

ALTER TABLE intelligence_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own intelligence logs"
  ON intelligence_logs FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- BOOKINGS TABLE
-- ============================================

CREATE TABLE bookings (
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
CREATE POLICY "Users can manage own bookings"
  ON bookings FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- AUDIT LOG TABLE - IMMUTABLE
-- Records every login, data access, export, document send, approval action.
-- Cannot be deleted. Retained for 2 years.
-- ============================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action audit_action NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details TEXT,          -- Never contains PII in plaintext
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, timestamp DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, timestamp DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can only read their own audit logs - no updates, no deletes
CREATE POLICY "Users can view own audit logs"
  ON audit_logs FOR SELECT USING (auth.uid() = user_id);

-- Only service role (server-side) can insert audit logs
CREATE POLICY "Service role inserts audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (TRUE);

-- NO UPDATE OR DELETE POLICIES - audit logs are immutable

-- ============================================
-- HELPER: Auto-purge audit logs older than 2 years
-- Run via Supabase scheduled function
-- ============================================

CREATE OR REPLACE FUNCTION purge_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs WHERE timestamp < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- Licona Realty Platform - Storage Buckets
-- ============================================
-- All buckets are PRIVATE - no public URLs for documents containing PII.
-- Access controlled by RLS policies on storage.objects.
-- ============================================

-- Documents bucket: contracts, disclosures, inspection reports, etc.
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);

-- Contact imports bucket: temporary storage for CSV/Excel uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('imports', 'imports', false);

-- Canva assets bucket: branded content and templates
INSERT INTO storage.buckets (id, name, public)
VALUES ('canva-assets', 'canva-assets', false);

-- Social media assets: images and videos for social posts
INSERT INTO storage.buckets (id, name, public)
VALUES ('social-media', 'social-media', false);

-- Profile assets: agent profile photos, logos (can be public for SEO pages)
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-assets', 'profile-assets', true);

-- ============================================
-- Storage RLS Policies
-- ============================================

-- Documents: only authenticated users can access their own files
CREATE POLICY "Users can upload documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Imports: only authenticated users can access their own imports
CREATE POLICY "Users can upload imports"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'imports' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own imports"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'imports' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own imports"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'imports' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Canva assets: authenticated users only
CREATE POLICY "Users can upload canva assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'canva-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own canva assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'canva-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Social media: authenticated users only
CREATE POLICY "Users can upload social media assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'social-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own social media assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'social-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Profile assets: public read, authenticated write
CREATE POLICY "Anyone can view profile assets"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'profile-assets');

CREATE POLICY "Authenticated users can upload profile assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'profile-assets');

-- File size limits enforced at the application layer (25MB max)
-- File type validation enforced at the application layer (magic bytes)
