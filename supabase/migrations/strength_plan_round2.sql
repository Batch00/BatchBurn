-- Strength plan round 2: Stretching becomes a cross-training type, routines and
-- sessions get an activity type, and add-ons are replaced by plain routines.
-- Run once in the Supabase SQL editor, after add_strength_plan.sql.

begin;

-- 1. Stretching activity type. Both CHECK constraints must list it.
alter table batchburn.cross_training drop constraint if exists cross_training_activity_type_check;
alter table batchburn.cross_training add constraint cross_training_activity_type_check
  check (activity_type in ('Bike','Walk','Stair Master','Swim','Strength','Stretching','Yoga',
    'Soccer','Tennis','Pickleball','Basketball','Hiking','Treadmill',
    'Elliptical','Rowing','Climbing','Ultimate Frisbee','Other'));

alter table batchburn.goals drop constraint if exists goals_scope_check;
alter table batchburn.goals add constraint goals_scope_check
  check (scope in ('all', 'runs', 'Bike', 'Walk', 'Stair Master', 'Swim',
    'Strength', 'Stretching', 'Yoga', 'Soccer', 'Tennis', 'Pickleball', 'Basketball',
    'Hiking', 'Treadmill', 'Elliptical', 'Rowing', 'Climbing',
    'Ultimate Frisbee', 'Other'));

-- 2. Activity type on routines, snapshotted onto sessions.
alter table batchburn.routines add column activity_type text not null default 'Strength';
alter table batchburn.planned_sessions add column activity_type text not null default 'Strength';

-- 3. Add-on routines become normal Stretching routines with no default days.
update batchburn.routines
set weekdays = '{}', activity_type = 'Stretching'
where kind = 'addon';

-- 4. Done sessions keep their full length: fold ticked add-on minutes into minutes.
update batchburn.planned_sessions ps
set minutes = ps.minutes + (
  select coalesce(sum((a ->> 'minutes')::int), 0)
  from jsonb_array_elements(ps.addons) a
)
where ps.status = 'done' and jsonb_array_length(ps.addons) > 0;

-- 5. Drop the add-on columns.
alter table batchburn.routines drop column kind, drop column addon_default;
alter table batchburn.planned_sessions drop column addons;

commit;
