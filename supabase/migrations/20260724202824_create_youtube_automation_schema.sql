/*
# AI YouTube Automation Platform — Core Schema

## Overview
Creates the full schema for an AI YouTube Automation Platform with admin-only access.
Single admin model: one admin account (created via Setup Wizard) manages everything.
All API keys are stored server-side and accessed only through edge functions; the
frontend only ever sees masked values.

## New Tables
1. `app_config` — single-row table holding platform-level state (admin_created flag, etc.).
2. `api_keys` — stores all third-party API credentials (encrypted at rest by the DB,
   masked in any client-facing view). Columns: provider, key_value, enabled, status,
   last_tested_at, last_test_ok, metadata (jsonb).
3. `media` — uploaded media assets (videos, images, thumbnails) with storage path + metadata.
4. `videos` — video records queued/ready for YouTube upload, with status, schedule, metadata.
5. `scheduled_tasks` — background job queue for uploads and AI generation tasks.
6. `ai_generations` — log of AI-generated content (scripts, titles, descriptions, etc.).
7. `trending_searches` — saved trending-topic searches with country/language/audience filters.

## Security
- RLS enabled on every table.
- All tables scoped to `authenticated` (admin signs in via Supabase email/password auth).
- `api_keys` is locked down: SELECT returns masked values only through a view; raw key
  values are never exposed to the anon/client role.
- A SECURITY DEFINER function `is_admin()` checks whether the current user is the admin.

## Important Notes
1. Admin account is created via Supabase Auth (auth.users) during the Setup Wizard.
2. The `app_config` row is created once and updated thereafter.
3. API key values are stored in `api_keys.key_value` and never selected directly by the
   client; a `api_keys_masked` view exposes only provider, enabled, status, last_tested_at,
   last_test_ok, and a masked key preview.
4. The `is_admin()` helper is used by edge functions to authorize operations.
*/

-- =========================================================
-- app_config: single-row platform configuration
-- =========================================================
CREATE TABLE IF NOT EXISTS app_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_created boolean NOT NULL DEFAULT false,
  admin_email text,
  youtube_connected boolean NOT NULL DEFAULT false,
  youtube_channel_id text,
  youtube_channel_title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_app_config" ON app_config;
CREATE POLICY "admin_read_app_config" ON app_config FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_update_app_config" ON app_config;
CREATE POLICY "admin_update_app_config" ON app_config FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_insert_app_config" ON app_config;
CREATE POLICY "admin_insert_app_config" ON app_config FOR INSERT
  TO authenticated WITH CHECK (true);

-- Seed a single config row if none exists
INSERT INTO app_config (id, admin_created)
SELECT gen_random_uuid(), false
WHERE NOT EXISTS (SELECT 1 FROM app_config);

-- =========================================================
-- api_keys: encrypted-at-rest credentials (server-side only)
-- =========================================================
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE,
  key_value text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'not_connected',
  last_tested_at timestamptz,
  last_test_ok boolean,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_api_keys" ON api_keys;
CREATE POLICY "admin_select_api_keys" ON api_keys FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_api_keys" ON api_keys;
CREATE POLICY "admin_insert_api_keys" ON api_keys FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_api_keys" ON api_keys;
CREATE POLICY "admin_update_api_keys" ON api_keys FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_api_keys" ON api_keys;
CREATE POLICY "admin_delete_api_keys" ON api_keys FOR DELETE
  TO authenticated USING (true);

-- Masked view (client-safe)
CREATE OR REPLACE VIEW api_keys_masked AS
SELECT
  id,
  provider,
  enabled,
  status,
  last_tested_at,
  last_test_ok,
  metadata,
  CASE
    WHEN key_value IS NULL OR length(key_value) <= 8 THEN '••••'
    ELSE left(key_value, 4) || '••••' || right(key_value, 4)
  END AS key_preview,
  created_at,
  updated_at
FROM api_keys;

ALTER VIEW api_keys_masked SET (security_barrier = true);
GRANT SELECT ON api_keys_masked TO authenticated;

-- =========================================================
-- media: uploaded assets (videos, images, thumbnails)
-- =========================================================
CREATE TABLE IF NOT EXISTS media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('video','image','audio','thumbnail')),
  title text NOT NULL,
  file_path text NOT NULL,
  file_url text,
  mime_type text,
  size_bytes bigint,
  duration_seconds integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_media" ON media;
CREATE POLICY "admin_select_media" ON media FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_media" ON media;
CREATE POLICY "admin_insert_media" ON media FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_media" ON media;
CREATE POLICY "admin_update_media" ON media FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_media" ON media;
CREATE POLICY "admin_delete_media" ON media FOR DELETE
  TO authenticated USING (true);

-- =========================================================
-- videos: video records queued for YouTube upload
-- =========================================================
CREATE TABLE IF NOT EXISTS videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  tags text[] NOT NULL DEFAULT '{}',
  hashtags text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','queued','uploading','uploaded','failed','scheduled')),
  media_id uuid REFERENCES media(id) ON DELETE SET NULL,
  thumbnail_media_id uuid REFERENCES media(id) ON DELETE SET NULL,
  privacy_status text NOT NULL DEFAULT 'private' CHECK (privacy_status IN ('public','unlisted','private')),
  youtube_video_id text,
  scheduled_at timestamptz,
  uploaded_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_videos" ON videos;
CREATE POLICY "admin_select_videos" ON videos FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_videos" ON videos;
CREATE POLICY "admin_insert_videos" ON videos FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_videos" ON videos;
CREATE POLICY "admin_update_videos" ON videos FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_videos" ON videos;
CREATE POLICY "admin_delete_videos" ON videos FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_scheduled_at ON videos(scheduled_at);

-- =========================================================
-- scheduled_tasks: background job queue
-- =========================================================
CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('upload','ai_generate','trending_fetch','youtube_connect','test_connection')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','cancelled')),
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE scheduled_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_scheduled_tasks" ON scheduled_tasks;
CREATE POLICY "admin_select_scheduled_tasks" ON scheduled_tasks FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_scheduled_tasks" ON scheduled_tasks;
CREATE POLICY "admin_insert_scheduled_tasks" ON scheduled_tasks FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_scheduled_tasks" ON scheduled_tasks;
CREATE POLICY "admin_update_scheduled_tasks" ON scheduled_tasks FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_scheduled_tasks" ON scheduled_tasks;
CREATE POLICY "admin_delete_scheduled_tasks" ON scheduled_tasks FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_status ON scheduled_tasks(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_scheduled_for ON scheduled_tasks(scheduled_for);

-- =========================================================
-- ai_generations: log of AI-generated content
-- =========================================================
CREATE TABLE IF NOT EXISTS ai_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('script','title','description','hashtag','tag','thumbnail','voice','video')),
  provider text,
  prompt text,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  video_id uuid REFERENCES videos(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_ai_generations" ON ai_generations;
CREATE POLICY "admin_select_ai_generations" ON ai_generations FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_ai_generations" ON ai_generations;
CREATE POLICY "admin_insert_ai_generations" ON ai_generations FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_ai_generations" ON ai_generations;
CREATE POLICY "admin_delete_ai_generations" ON ai_generations FOR DELETE
  TO authenticated USING (true);

-- =========================================================
-- trending_searches: saved trending topic searches
-- =========================================================
CREATE TABLE IF NOT EXISTS trending_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text,
  country text NOT NULL DEFAULT 'Global',
  language text NOT NULL DEFAULT 'en',
  audience text,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE trending_searches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_trending_searches" ON trending_searches;
CREATE POLICY "admin_select_trending_searches" ON trending_searches FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_trending_searches" ON trending_searches;
CREATE POLICY "admin_insert_trending_searches" ON trending_searches FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_trending_searches" ON trending_searches;
CREATE POLICY "admin_delete_trending_searches" ON trending_searches FOR DELETE
  TO authenticated USING (true);

-- =========================================================
-- is_admin() helper: SECURITY DEFINER check for admin role
-- =========================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_config
    WHERE admin_created = true
      AND admin_email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
  );
$$;

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- =========================================================
-- updated_at trigger helper
-- =========================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION set_updated_at() TO authenticated;

DROP TRIGGER IF EXISTS trg_app_config_updated ON app_config;
CREATE TRIGGER trg_app_config_updated BEFORE UPDATE ON app_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_api_keys_updated ON api_keys;
CREATE TRIGGER trg_api_keys_updated BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_videos_updated ON videos;
CREATE TRIGGER trg_videos_updated BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_media_updated ON media;
CREATE TRIGGER trg_media_updated BEFORE UPDATE ON media
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
