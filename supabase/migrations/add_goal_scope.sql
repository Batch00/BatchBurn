-- Add activity scope + optional custom name to goals.
-- Existing rows default to scope 'runs' to preserve current runs-only behavior.

ALTER TABLE batchburn.goals
  ADD COLUMN IF NOT EXISTS scope text DEFAULT 'runs'
  CHECK (scope IN ('all', 'runs', 'Bike', 'Walk', 'Stair Master', 'Swim',
    'Strength', 'Yoga', 'Soccer', 'Tennis', 'Pickleball', 'Basketball',
    'Hiking', 'Treadmill', 'Elliptical', 'Rowing', 'Climbing',
    'Ultimate Frisbee', 'Other'));

ALTER TABLE batchburn.goals ADD COLUMN IF NOT EXISTS name text;

-- "Only one active goal per period" is now "one active goal per period + scope".
-- This app has never enforced the single-active-goal rule with a DB constraint or
-- unique index (it is validated in application logic in AddGoalForm), so there is
-- no old constraint to drop. The uniqueness check remains in the application layer,
-- now keyed on (period, scope) instead of period alone.
