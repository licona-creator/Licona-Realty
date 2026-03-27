CREATE TABLE IF NOT EXISTS ai_insights (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  insight_type text NOT NULL CHECK (insight_type IN ('suggestion', 'analysis', 'market_data', 'strategy', 'warning', 'milestone', 'objection_response')),
  content text NOT NULL,
  source text DEFAULT 'ai_assistant',
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own insights" ON ai_insights
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_insights_contact ON ai_insights(contact_id, created_at DESC);
CREATE INDEX idx_insights_user ON ai_insights(user_id, created_at DESC);
