-- Retire Strava: clear stored OAuth tokens. Run by hand in the Supabase SQL editor.
-- Columns are kept and strava_athlete_id is not touched.

update batchburn.profiles
set
  strava_access_token = null,
  strava_refresh_token = null,
  strava_token_expires_at = null
where strava_access_token is not null
   or strava_refresh_token is not null
   or strava_token_expires_at is not null;

-- Expect 0.
select count(*) as rows_with_strava_token
from batchburn.profiles
where strava_access_token is not null
   or strava_refresh_token is not null
   or strava_token_expires_at is not null;
