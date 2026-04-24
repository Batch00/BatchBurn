ALTER TABLE batchburn.profiles
ADD COLUMN IF NOT EXISTS primary_shoe_id uuid
REFERENCES batchburn.shoes(id) ON DELETE SET NULL;
