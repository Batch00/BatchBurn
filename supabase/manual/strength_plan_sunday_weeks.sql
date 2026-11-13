-- One-time fix: plan weeks now run Sunday to Saturday.
-- Re-keys sessions created under Monday-start weeks to the Sunday on or before their date.
-- Run once, before opening the app on the new build.
update batchburn.planned_sessions
set week_start = date - extract(dow from date)::int
where extract(isodow from week_start) = 1;
