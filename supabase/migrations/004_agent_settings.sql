-- Agent Settings table
-- Stores per-user profile info, notification prefs, campaign defaults,
-- platform preferences, and brand asset URLs.

CREATE TABLE IF NOT EXISTS agent_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Profile
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

  -- Brand assets (Supabase Storage public URLs)
  brand_logo_url TEXT,
  brand_headshot_url TEXT,

  -- JSON preferences
  notification_preferences JSONB DEFAULT '{}',
  campaign_preferences JSONB DEFAULT '{}',
  platform_preferences JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT agent_settings_user_unique UNIQUE (user_id)
);

ALTER TABLE agent_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own settings"
  ON agent_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON agent_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON agent_settings FOR UPDATE
  USING (auth.uid() = user_id);
