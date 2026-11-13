-- The nightly demo reset runs as service_role and now wipes and re-seeds the
-- strength plan tables. Run once in the Supabase SQL editor before deploying
-- the updated reset-demo-batchburn function. Safe to run more than once.
grant select, insert, update, delete on batchburn.routines, batchburn.planned_sessions to service_role;
