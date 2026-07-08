ALTER TABLE batchburn.runs DROP CONSTRAINT IF EXISTS runs_source_check;
ALTER TABLE batchburn.runs ADD CONSTRAINT runs_source_check
  CHECK (source IN ('manual','strava','import','garmin_csv'));

ALTER TABLE batchburn.cross_training DROP CONSTRAINT IF EXISTS cross_training_source_check;
ALTER TABLE batchburn.cross_training ADD CONSTRAINT cross_training_source_check
  CHECK (source IN ('manual','strava','import','garmin_csv'));
