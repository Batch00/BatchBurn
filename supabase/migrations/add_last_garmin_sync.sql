-- Set by /api/import/garmin on every successful upload, even when every row
-- is a duplicate, so the dashboard banner reflects the last sync rather than
-- the last new activity.
ALTER TABLE batchburn.profiles
  ADD COLUMN IF NOT EXISTS last_garmin_sync_at timestamptz;
