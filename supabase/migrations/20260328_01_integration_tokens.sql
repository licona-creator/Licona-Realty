CREATE TABLE IF NOT EXISTS integration_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  token_type text DEFAULT 'Bearer',
  expires_at timestamptz,
  scopes text[],
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider)
);

ALTER TABLE integration_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tokens"
  ON integration_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS sync_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  sync_type text NOT NULL,
  status text NOT NULL DEFAULT 'success',
  items_synced integer DEFAULT 0,
  error_message text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sync logs"
  ON sync_log FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add metadata column to activities for deduplication
ALTER TABLE activities ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
