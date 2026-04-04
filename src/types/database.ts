/**
 * Licona Realty Platform - Supabase Database Types
 *
 * Complete type definitions for every table in the platform.
 * All PII fields are marked for encryption at rest.
 * MLS and SMS placeholder fields included from day one.
 */

// ============================================
// Enums
// ============================================

export type TrackType = 'buyer' | 'seller' | 'landlord' | 'tenant' | 'investor' | 'sphere';
export type SphereRelationshipType = 'personal_friend' | 'past_client' | 'family' | 'professional_connection' | 'referral_partner';
export type RelationshipTier = 'tier_1' | 'tier_2' | 'tier_3';
export type LanguagePreference = 'en' | 'es' | 'bilingual';
export type ApprovalStatus = 'pending' | 'approved' | 'edited_approved' | 'discarded';
export type ApprovalItemType = 'campaign_email' | 'social_post' | 'docusign' | 'scheduling_confirmation' | 'testimonial_request' | 'holiday_message' | 'birthday_message' | 'anniversary_message' | 'referral_ask' | 'gbp_post' | 'mortgage_results_email' | 'auto_response' | 'review_response';
export type PipelineStage = 'new' | 'contacted' | 'qualifying' | 'nurturing' | 'showing' | 'offer' | 'under_contract' | 'closing' | 'closed' | 'lost' | 'on_hold';
export type VoiceToneMode = 'casual_friend' | 'professional_personal' | 'bilingual_casual' | 'bilingual_professional' | 'celebratory' | 'empathetic' | 'investor_analytical';
export type CampaignTone = 'warm_relationship' | 'direct_action' | 'educational' | 'soft_touch' | 'high_frequency' | 'bilingual_mixed' | 'bilingual_professional' | 'investor_analytical' | 'empathetic' | 'celebratory';
export type ContentPillar = 'market_intelligence' | 'client_wins' | 'local_dfw' | 'education' | 'behind_scenes' | 'personal_brand';
export type SocialPlatform = 'instagram' | 'facebook';
export type DocuSignStatus = 'draft' | 'sent' | 'viewed' | 'signed' | 'declined' | 'expired';
export type AuditAction = 'login' | 'login_failed' | 'logout' | 'data_access' | 'data_export' | 'document_send' | 'approval_action' | 'record_create' | 'record_update' | 'record_delete' | 'mfa_setup' | 'mfa_verify' | 'mfa_failed' | 'settings_change' | 'bulk_action';

// ============================================
// Core Contact Table
// ============================================

export interface Contact {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string; // RLS: agent who owns this contact

  // PII Fields - encrypted at rest
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;        // E.164 format
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;

  // Track and Pipeline
  track_type: TrackType;
  pipeline_stage: PipelineStage;
  lead_source: string | null;
  lead_score: number;          // 1-100 continuous scale

  // Extended CRM fields
  budget: string | null;
  location_preference: string | null;
  notes: string | null;
  referral_partner_id: string | null;
  next_follow_up_date: string | null;
  last_contact_date: string | null;
  follow_up_notes: string | null;

  // Preferences
  language_preference: LanguagePreference;
  disc_type: 'D' | 'I' | 'S' | 'C' | null;
  disc_secondary: 'D' | 'I' | 'S' | 'C' | null;
  disc_confidence: 'high' | 'medium' | 'low' | null;
  engagement_temperature: 'hot' | 'warm' | 'cool' | 'cold' | null;
  personality_brief: string | null;
  communication_tips: string | null;
  buying_motivation: string | null;
  silence_meaning: string | null;
  last_enriched_at: string | null;

  // Location for Google Maps
  latitude: number | null;
  longitude: number | null;
  neighborhood: string | null;
  county: string | null;

  // Campaign
  campaign_enrollment_status: string | null;
  assigned_drip_campaign_options: string[] | null;
  selected_drip_campaign: string | null;

  // Intelligence Layer
  optimization_flag_status: string | null;
  system_health_notes: string | null;
  last_contacted_at: string | null;

  // Social Media
  social_media_source: string | null;
  social_media_engagement_history: Record<string, unknown> | null;

  // SEO
  seo_interaction_tracking: Record<string, unknown> | null;

  // Voice Profile
  voice_profile_interaction_history: Record<string, unknown> | null;

  // Scheduling
  scheduling_link_interactions: Record<string, unknown> | null;

  // Approval Queue
  approval_queue_interaction_history: Record<string, unknown> | null;

  // Canva
  canva_asset_links: string[] | null;

  // Document References
  document_references: string[] | null;

  // MLS Placeholder
  mls_agent_id: string | null;
  mls_listing_ids: string[] | null;

  // SMS Placeholder
  sms_opt_in: boolean;
  sms_consent_date: string | null;

  // Birthday (split for easy querying by month/day)
  birthday_month: number | null;
  birthday_day: number | null;
  birthday_year: number | null;

  // Professional
  company: string | null;
  job_title: string | null;

  // Import tracking
  import_source: string | null;

  // Soft delete
  is_deleted: boolean;
  deleted_at: string | null;
}

// ============================================
// Sphere and Referral Contact (extends Contact)
// ============================================

export interface SphereContact {
  id: string;
  contact_id: string;         // FK to contacts table
  user_id: string;            // RLS

  relationship_type: SphereRelationshipType;
  relationship_tier: RelationshipTier;
  how_they_know_agent: string | null;
  referral_potential_score: number;
  last_personal_touchpoint: string | null;

  // Milestone Dates
  birthday: string | null;
  home_purchase_anniversary: string | null;
  business_anniversary: string | null;

  created_at: string;
  updated_at: string;
}

// ============================================
// Referral Tracking
// ============================================

export interface Referral {
  id: string;
  user_id: string;
  referrer_contact_id: string;    // Who referred
  referred_contact_id: string;    // Who was referred
  referral_date: string;
  deal_resulted: boolean;
  outcome: string | null;
  commission_generated: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Activity Timeline
// ============================================

export interface ActivityEntry {
  id: string;
  user_id: string;
  contact_id: string;
  activity_type: string;
  direction: 'outbound' | 'inbound' | null;
  subject: string | null;
  description: string;
  activity_date: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ============================================
// Campaign
// ============================================

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  track_type: TrackType;
  tone: CampaignTone;
  description: string | null;
  steps: CampaignStep[];
  is_active: boolean;
  is_system_template: boolean;
  performance_metrics: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignStep {
  id: string;
  campaign_id: string;
  step_number: number;
  delay_days: number;
  subject: string | null;
  body_template: string;
  tone_mode: VoiceToneMode;
  channel: 'email' | 'sms_placeholder';
  created_at: string;
}

export interface CampaignEnrollment {
  id: string;
  user_id: string;
  contact_id: string;
  campaign_id: string;
  current_step: number;
  is_paused: boolean;
  is_completed: boolean;
  enrolled_at: string;
  last_step_sent_at: string | null;
  next_step_due_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Approval Queue
// ============================================

export interface ApprovalQueueItem {
  id: string;
  user_id: string;
  item_type: ApprovalItemType;
  recipient_contact_id: string | null;
  subject: string | null;
  content: string;
  content_html: string | null;
  scheduled_time: string | null;
  trigger_source: string | null;
  tone_mode: VoiceToneMode;
  status: ApprovalStatus;
  is_overdue: boolean;
  urgency_level: number;         // 1 = highest (DocuSign), 4 = lowest (relationship)
  edit_history: Record<string, unknown>[] | null;
  discard_reason: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Transactions
// ============================================

export interface Transaction {
  id: string;
  user_id: string;
  contact_id: string;
  track_type: TrackType;
  property_address: string;         // PII - encrypted
  property_city: string | null;
  property_state: string | null;
  property_zip: string | null;
  deal_type: string | null;
  status: string;
  contract_price: number | null;
  closing_date: string | null;
  key_dates: Record<string, string> | null;
  checklist: TransactionChecklistItem[] | null;
  parties: TransactionParty[] | null;
  commission_gross: number | null;
  commission_broker_split: number | null;
  commission_net: number | null;
  notes: TransactionNote[] | null;
  document_ids: string[] | null;
  docusign_envelope_ids: string[] | null;

  // MLS Placeholder
  mls_listing_id: string | null;
  mls_data: Record<string, unknown> | null;

  created_at: string;
  updated_at: string;
}

export interface TransactionChecklistItem {
  id: string;
  label: string;
  is_completed: boolean;
  due_date: string | null;
  completed_at: string | null;
}

export interface TransactionParty {
  id: string;
  role: string;           // title, lender, co-agent, inspector
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
}

export interface TransactionNote {
  id: string;
  content: string;
  created_at: string;
}

// ============================================
// Documents
// ============================================

export interface Document {
  id: string;
  user_id: string;
  contact_id: string | null;
  transaction_id: string | null;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;          // Supabase Storage path - private access only
  category: 'contract' | 'disclosure' | 'inspection' | 'identification' | 'correspondence' | 'photo' | 'other';
  docusign_envelope_id: string | null;
  docusign_status: DocuSignStatus | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Social Media Content Calendar
// ============================================

export interface SocialPost {
  id: string;
  user_id: string;
  platform: SocialPlatform;
  content_pillar: ContentPillar;
  caption: string;
  media_urls: string[] | null;
  canva_design_id: string | null;
  scheduled_time: string | null;
  published_at: string | null;
  approval_queue_id: string | null;
  hashtags: string[] | null;
  is_bilingual: boolean;
  language: LanguagePreference;

  // Performance Metrics (populated after publish)
  reach: number | null;
  impressions: number | null;
  engagement_rate: number | null;
  likes: number | null;
  comments: number | null;
  saves: number | null;
  shares: number | null;
  profile_visits: number | null;
  link_clicks: number | null;
  lead_captures: number | null;

  created_at: string;
  updated_at: string;
}

// ============================================
// Social Media Analytics
// ============================================

export interface SocialAnalytics {
  id: string;
  user_id: string;
  platform: SocialPlatform;
  date: string;
  followers: number;
  follower_growth: number;
  total_reach: number;
  total_impressions: number;
  total_engagement: number;
  best_post_id: string | null;
  pillar_performance: Record<ContentPillar, number> | null;
  created_at: string;
}

// ============================================
// Canva Assets
// ============================================

export interface CanvaAsset {
  id: string;
  user_id: string;
  canva_design_id: string;
  template_type: string;
  contact_id: string | null;
  transaction_id: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Testimonials
// ============================================

export interface Testimonial {
  id: string;
  user_id: string;
  contact_id: string;
  transaction_id: string | null;
  star_rating: number;
  review_text: string;
  client_first_name: string;
  client_city: string;
  transaction_type: TrackType;
  is_approved: boolean;
  is_published: boolean;
  google_review_synced: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// SEO Analytics
// ============================================

export interface SEOAnalytics {
  id: string;
  user_id: string;
  keyword: string;
  estimated_position: number | null;
  page_url: string;
  organic_visits: number;
  lead_captures: number;
  date: string;
  created_at: string;
}

// ============================================
// Mortgage Calculator Submissions
// ============================================

export interface MortgageSubmission {
  id: string;
  user_id: string;
  contact_id: string;

  // Financial PII - encrypted at rest, never logged in plaintext
  annual_income_encrypted: string;
  monthly_debts_encrypted: string;
  down_payment_encrypted: string;

  desired_location: string | null;
  affordability_estimate: number | null;
  monthly_payment_estimate: number | null;
  cash_to_close_estimate: number | null;
  preapproval_readiness_score: number | null;
  language: LanguagePreference;
  created_at: string;
}

// ============================================
// Voice Profile Learning
// ============================================

export interface VoiceProfile {
  id: string;
  user_id: string;
  tone_mode: VoiceToneMode;
  approved_unchanged_count: number;
  light_edit_count: number;
  heavy_edit_count: number;
  full_rewrite_count: number;
  accuracy_score: number | null;
  style_patterns: Record<string, unknown> | null;
  banned_phrases_triggered: string[] | null;
  updated_at: string;
}

// ============================================
// System Intelligence Log
// ============================================

export interface IntelligenceLog {
  id: string;
  user_id: string;
  category: string;
  message: string;
  severity: 'info' | 'warning' | 'urgent';
  action_path: string | null;
  is_resolved: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ============================================
// Scheduling / Bookings
// ============================================

export interface Booking {
  id: string;
  user_id: string;
  contact_id: string | null;
  meeting_type: 'buyer_consultation' | 'seller_consultation' | 'investor_strategy' | 'general_inquiry' | 'showing_request';
  visitor_name: string;           // PII
  visitor_email: string;          // PII
  visitor_phone: string;          // PII
  visitor_note: string | null;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  google_calendar_event_id: string | null;
  status: 'confirmed' | 'cancelled' | 'no_show' | 'completed';
  pre_meeting_reminder_sent: boolean;
  post_meeting_campaign_surfaced: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// Audit Log - Immutable, cannot be deleted
// ============================================

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: AuditAction;
  resource_type: string | null;
  resource_id: string | null;
  details: string | null;        // Never contains PII in plaintext
  ip_address: string | null;
  user_agent: string | null;
  timestamp: string;
}

// ============================================
// User Integrations
// ============================================

export type IntegrationProvider = 'google' | 'docusign' | 'canva' | 'meta';

// ============================================
// Campaign Templates (Build 2)
// ============================================

export interface CampaignTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  track_type: string;
  status: 'active' | 'paused' | 'archived';
  messages: CampaignTemplateMessage[];
  created_at: string;
  updated_at: string;
}

export interface CampaignTemplateMessage {
  day: number;
  type: 'text';
  content: string;
}

export interface CampaignEnrollmentV2 {
  id: string;
  user_id: string;
  campaign_id: string;
  contact_id: string;
  current_step: number;
  status: 'active' | 'paused' | 'completed' | 'stopped';
  next_message_date: string | null;
  enrolled_at: string;
  completed_at: string | null;
}

// ============================================
// Notifications
// ============================================

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

// ============================================
// User Integrations
// ============================================

// ============================================
// Market Data Cache
// ============================================

export interface MarketDataCache {
  id: string;
  zip_code: string;
  median_price: number | null;
  avg_dom: number | null;
  homes_sold: number | null;
  new_listings: number | null;
  inventory_level: number | null;
  list_to_sale_ratio: number | null;
  market_summary: string | null;
  data_source: string | null;
  fetched_at: string;
  created_at: string;
  updated_at: string;
}

export interface UserIntegration {
  id: string;
  user_id: string;
  provider: IntegrationProvider;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  scopes: string[] | null;
  provider_account_id: string | null;
  provider_email: string | null;
  metadata: Record<string, unknown>;
  connected_at: string;
  updated_at: string;
}
