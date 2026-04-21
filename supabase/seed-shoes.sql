-- Replace <USER_UUID> with your actual user UUID before running

-- Insert shoes
INSERT INTO batchburn.shoes (id, user_id, name, price, initial_miles, purchase_date, is_active, created_at)
VALUES
  (gen_random_uuid(), '<USER_UUID>', 'Shitters', 0, 0, '2025-01-01', true, now()),
  (gen_random_uuid(), '<USER_UUID>', 'Saucony Cohesion', 30, 0, '2025-11-03', true, now()),
  (gen_random_uuid(), '<USER_UUID>', 'Hoka', 150, 0, '2025-12-25', true, now());

-- Link runs to shoes by date range
-- First run on 2025-11-03 -> Shitters
UPDATE batchburn.runs
SET shoe_id = (SELECT id FROM batchburn.shoes WHERE user_id = '<USER_UUID>' AND name = 'Shitters' LIMIT 1)
WHERE user_id = '<USER_UUID>'
  AND source = 'import'
  AND date = '2025-11-03';

-- Runs 2025-11-07 to 2025-12-24 -> Saucony Cohesion
UPDATE batchburn.runs
SET shoe_id = (SELECT id FROM batchburn.shoes WHERE user_id = '<USER_UUID>' AND name = 'Saucony Cohesion' LIMIT 1)
WHERE user_id = '<USER_UUID>'
  AND source = 'import'
  AND date BETWEEN '2025-11-07' AND '2025-12-24';

-- Runs 2025-12-26 onwards -> Hoka
UPDATE batchburn.runs
SET shoe_id = (SELECT id FROM batchburn.shoes WHERE user_id = '<USER_UUID>' AND name = 'Hoka' LIMIT 1)
WHERE user_id = '<USER_UUID>'
  AND source = 'import'
  AND date >= '2025-12-26';
