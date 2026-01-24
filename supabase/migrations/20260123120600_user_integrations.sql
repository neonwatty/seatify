-- User Integrations table for storing OAuth tokens (Google Sheets, etc.)
-- Note: In production, consider encrypting token columns or using a secrets manager

CREATE TABLE IF NOT EXISTS user_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'google_sheets', 'eventbrite', etc.
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- One connection per provider per user
  UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own integrations
CREATE POLICY "Users can view own integrations"
  ON user_integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own integrations"
  ON user_integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own integrations"
  ON user_integrations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own integrations"
  ON user_integrations FOR DELETE
  USING (auth.uid() = user_id);

-- Index for quick lookups
CREATE INDEX idx_user_integrations_user_provider
  ON user_integrations(user_id, provider);

-- Update timestamp trigger
DROP TRIGGER IF EXISTS set_updated_at ON public.user_integrations;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions
GRANT ALL ON user_integrations TO authenticated;
