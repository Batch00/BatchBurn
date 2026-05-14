ALTER TABLE batchburn.profiles
ADD COLUMN IF NOT EXISTS hidden_activity_types text[] DEFAULT '{}';
