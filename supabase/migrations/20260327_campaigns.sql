-- Campaign Templates and Enrollments
-- Build 2: Text-based campaign system with message sequences

CREATE TABLE IF NOT EXISTS campaign_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  name text NOT NULL,
  description text,
  track_type text NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  messages jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE campaign_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own campaigns" ON campaign_templates FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS campaign_enrollments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  campaign_id uuid REFERENCES campaign_templates(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  current_step integer DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'stopped')),
  next_message_date date,
  enrolled_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE campaign_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own enrollments" ON campaign_enrollments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
