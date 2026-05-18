-- Adds extra Strava-sourced metrics for the activity detail page.
ALTER TABLE batchburn.runs
  ADD COLUMN IF NOT EXISTS elevation_gain_m numeric,
  ADD COLUMN IF NOT EXISTS heart_rate_avg integer,
  ADD COLUMN IF NOT EXISTS heart_rate_max integer,
  ADD COLUMN IF NOT EXISTS cadence_avg numeric,
  ADD COLUMN IF NOT EXISTS map_polyline text;

ALTER TABLE batchburn.cross_training
  ADD COLUMN IF NOT EXISTS elevation_gain_m numeric,
  ADD COLUMN IF NOT EXISTS heart_rate_avg integer,
  ADD COLUMN IF NOT EXISTS heart_rate_max integer,
  ADD COLUMN IF NOT EXISTS map_polyline text;
