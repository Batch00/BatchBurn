ALTER TABLE batchburn.runs ADD COLUMN IF NOT EXISTS calories integer;
ALTER TABLE batchburn.cross_training ADD COLUMN IF NOT EXISTS calories integer;
