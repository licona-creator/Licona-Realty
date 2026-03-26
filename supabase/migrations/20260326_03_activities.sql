-- Migration: Create activities table for contact interaction timeline

CREATE TABLE IF NOT EXISTS activities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  activity_type text NOT NULL CHECK (activity_type IN ('call', 'text', 'email', 'note', 'showing', 'meeting', 'status_change', 'document', 'other')),
  direction text CHECK (direction IN ('outbound', 'inbound', null)),
  subject text,
  description text NOT NULL,
  activity_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own activities" ON activities FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_activities_contact ON activities(contact_id, activity_date DESC);
