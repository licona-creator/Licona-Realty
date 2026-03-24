-- ============================================
-- User Integrations Table
-- ============================================
-- Stores OAuth tokens and connection metadata for third-party integrations.
-- Tokens encrypted at rest via Supabase's built-in encryption.
-- RLS: users can only access their own integration records.

CREATE TABLE IF NOT EXISTS user_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN (
    'google', 'docusign', 'canva', 'meta'
  )),
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

CREATE INDEX idx_user_integrations_user ON user_integrations(user_id);

ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own integrations"
  ON user_integrations FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER user_integrations_updated_at
  BEFORE UPDATE ON user_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
