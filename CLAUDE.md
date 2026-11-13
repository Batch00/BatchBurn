# BatchBurn

## Behavioral Guidelines

1. **Think Before Coding** - State assumptions explicitly before implementing. If multiple interpretations exist, present them. If a simpler approach exists, say so. If something is unclear, stop and ask.

2. **Simplicity First** - Write the minimum code that solves the problem. No features beyond what was asked. No abstractions for single-use code. No speculative flexibility or configurability. If you write 200 lines and it could be 50, rewrite it.

3. **Surgical Changes** - Touch only what you must. Do not improve adjacent code that was not asked about. Do not refactor things that are not broken. Match existing style even if you would do it differently. If you notice unrelated dead code, mention it but do not delete it. Remove imports/variables/functions that YOUR changes made unused - do not remove pre-existing dead code unless asked. Every changed line should trace directly to the user's request.

4. **Goal-Driven Execution** - Transform tasks into verifiable goals. For multi-step tasks, state a brief plan with verify steps. Strong success criteria let you loop independently. Clarifying questions should come before implementation.

## Project Overview
BatchBurn is a personal workout tracking and analytics web app. It supports 
manual activity logging (runs and cross training), Garmin CSV import 
(manual upload + automated local sync), shoe mileage tracking with primary 
shoe auto-assignment, race logging with PR detection, goal setting, and rich 
analytics dashboards. Built for mobile-first use with a dark athletic design.

Deployed at: https://batchburn.batch-apps.com
Part of the Batch app ecosystem alongside BatchFlow and BatchFolio.
All three apps share the same Supabase project.

---

## Tech Stack
- **Framework**: Next.js 15.5.29 (App Router, TypeScript), pinned to 15.x, 
  do NOT upgrade to 16 (known /_global-error prerender bug)
- **Database & Auth**: Supabase (PostgreSQL, RLS, Edge Functions) — shared 
  project with BatchFlow/BatchFolio
- **Styling**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod
- **Data Fetching**: TanStack Query (client), React Server Components (server)
- **Deployment**: Vercel (auto-deploys on push to main)

---

## App Structure
/app/(auth)/login        → login page with demo mode and request-access notice
/app/(auth)/layout.tsx   → centered dark auth layout
/app/(app)/dashboard     → plan week card, KPI cards (runs only), weekly chart,
                           activity feed, shoe health widget, goal progress rings
/app/(app)/log           → log run + cross training forms (demo: read-only)
/app/(app)/history       → filterable unified activity list, edit/delete, 
                           Strava source filter
/app/(app)/analytics     → pace trend, mileage by type, run type donut, 
                           personal bests, cross training breakdown
/app/(app)/races         → race log with PR detection, edit/delete
/app/(app)/shoes         → shoe tracker, primary shoe, mileage ordering, 
                           edit/delete
/app/(app)/goals         → mileage goals with progress rings, edit/delete
/app/(app)/plan          → strength plan: week view (confirm, move, skip) and
                           routine management
/app/(app)/settings      → profile, Garmin CSV upload, Strava-retired
                           notice, primary shoe, danger zone
/app/api/import/garmin   → Garmin CSV import (session auth or 
                           x-batchburn-sync-key header)
/app/auth/callback       → Supabase PKCE callback
/components/ui           → shadcn base components
/components/charts       → Recharts wrappers
/components/activity     → LogActivityClient
/components/dashboard    → DashboardClient, KpiCard, ActivityFeed, 
                           ShoeHealthWidget, GoalProgress, WeeklyMileageChart
/components/analytics    → AnalyticsClient and chart components
/components/history      → HistoryClient
/components/plan         → WeekPlan (also the dashboard week card),
                           RoutinesManager, PlanClient
/components/settings     → SettingsClient
/components/shoes        → ShoesClient
/lib/supabase/client.ts  → browser client (schema: batchburn)
/lib/supabase/server.ts  → server client (schema: batchburn)
/lib/supabase/admin.ts   → service role client, bypasses RLS, server only
/lib/actions.ts          → revalidateAll() server action
/lib/utils/pace.ts       → formatPace(seconds), formatDuration(seconds)
/middleware.ts           → protects app routes, allows /login and 
                           /auth/callback through
/supabase/migrations     → schema migration SQL files
/scripts/garmin-sync     → automated Garmin sync (Playwright + Task Scheduler)
/public/manifest.json    → PWA manifest (theme: #C41230)
/public/icons            → PWA icons (192, 512) — crimson flame
/public/favicon.ico      → crimson flame favicon

---

## Database Schema (batchburn)
BatchBurn uses the 'batchburn' schema. Never use the public schema.
BatchFlow uses 'public', BatchFolio uses 'batchfolio' — do not touch those.

Tables:
- profiles (user_id, display_name, invite_code_used, is_demo, 
    strava_athlete_id, strava_access_token, strava_refresh_token,
    strava_token_expires_at, primary_shoe_id)
- runs (date, distance_miles, distance_km, duration_seconds, 
    pace_per_mile_seconds, run_type, shoe_id, notes, 
    strava_activity_id, source)
- cross_training (date, activity_type, distance_miles, distance_km, 
    steps, duration_seconds, pace_per_mile_seconds, notes, 
    strava_activity_id, source)
- races (event_name, date, distance_miles, duration_seconds, is_pr,
    pace_per_mile_seconds, overall_place, overall_competitors,
    age_group_place, age_group_competitors, shoe_id, notes)
- shoes (name, price_usd, initial_miles, purchase_date, retired_date, 
    is_active, notes)
- goals (goal_type, period, target_value, target_date, is_active)
- invites (code, created_by, used_by, used_at)
- routines (name, default_minutes, activity_type, weekdays, is_active,
    sort_order)
- planned_sessions (routine_id, routine_name, activity_type, week_start,
    slot_weekday, date, minutes, status, cross_training_id)

RLS enabled on every table. All tables have id (uuid) + user_id + created_at.

---

## Critical Lessons Learned
- **Next.js version**: ALWAYS stay on 15.x. Never upgrade to 16.
- **React Hook Form + Zod**: Never use useForm<Type> explicit generic.
  Always useForm() and z.coerce.number() for numeric fields.
- **Supabase schema exposure**: Manage ONLY via Integrations → Data API → 
  Settings → Exposed schemas UI. Never run ALTER ROLE authenticator SET 
  pgrst.db_schemas — it overrides the UI and breaks all schemas.
- **Strava bigint**: strava_activity_id must be Number() not String() — 
  PostgreSQL rejects string literals for bigint columns.
- **Strava pace**: pace_per_mile_seconds must use Math.round() — integer 
  column rejects floats.
- **Server actions after mutations**: Always call revalidateAll() from 
  lib/actions.ts after any database write to refresh server components.
- **Adding an activity type**: Two CHECK constraints must BOTH be updated 
  in the migration — cross_training.activity_type 
  (cross_training_activity_type_check) and goals.scope (goals_scope_check, 
  auto-named from the inline CHECK in add_goal_scope.sql).

---

## Environment Variables (names only)
Vercel / .env.local:
- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- GARMIN_SYNC_API_KEY — shared secret for x-batchburn-sync-key header on 
  /api/import/garmin (automated Garmin sync)
- GARMIN_SYNC_USER_ID — user the automated Garmin sync imports as

scripts/garmin-sync/.env (local only, gitignored):
- BATCHBURN_URL, GARMIN_SYNC_API_KEY, SYNC_INTERVAL_DAYS

---

## Auth & Access Control
- Supabase Auth (email/password), no self-signup; access is by request at 
  batch-apps.com
- Demo: demo@batchburn.app — read-only, shows amber banner
- Demo restrictions: no log, no edit/delete, no add, no settings changes
- Demo data, including plan routines and sessions, is wiped and re-seeded
  nightly by supabase/functions/reset-demo-batchburn
- Middleware allows /login and /auth/callback through without auth

---

## Garmin Integration (primary data source)
- Manual: CSV upload in Settings → POST /api/import/garmin (session auth)
- Automated: scripts/garmin-sync (Playwright + Windows Task Scheduler) 
  exports the CSV from Garmin Connect using a dedicated browser profile at 
  %LOCALAPPDATA%\BatchBurn\garmin-profile and uploads it with the 
  x-batchburn-sync-key header
  - Triggers: log on, workstation unlock (2-min delay), daily 6 PM local
  - Self-throttled: sync.mjs skips unless SYNC_INTERVAL_DAYS have passed 
    since the last success (--force bypasses)
  - Logs: %LOCALAPPDATA%\BatchBurn\sync.log
- Import endpoint auth: session cookie, OR x-batchburn-sync-key matching 
  GARMIN_SYNC_API_KEY (constant-time compare) → acts as GARMIN_SYNC_USER_ID 
  via the admin client
- Dedup: same date + distance within 0.15 mi; distanceless activities 
  match on date + activity type
- Primary shoe: profiles.primary_shoe_id auto-assigned to imported runs 
  (not cross training)
- Dashboard banner shows when the last Garmin import is 5+ days old

---

## Strength Plan
- Purpose: record workouts that are not tracked on the watch (lifting,
  stretching). A routine is a name, typical minutes, an activity type and
  default weekdays. No exercises, sets or reps.
- Plan weeks run Sunday to Saturday. This applies to the plan only: KPIs,
  goals and charts still use Monday weeks. routines.weekdays and
  planned_sessions.slot_weekday are ISO days (1 = Monday, 7 = Sunday).
- Sessions are created in the browser when the plan loads, for the current
  and previous week, with an upsert that ignores conflicts on
  (user_id, routine_id, week_start, slot_weekday). There is no scheduled job.
- Nothing is logged automatically. Confirming a session inserts one
  cross_training row (the session's activity type, source = 'manual', routine
  name as the note) and links it through planned_sessions.cross_training_id.
  If an unclaimed garmin_csv row of the same type exists on that date, the
  session links to it instead of inserting.
- Undo deletes only rows with source = 'manual'. A linked Garmin row is just
  unlinked. A done session whose activity was deleted shows as planned again.
- Only the current and previous week can be edited. Older weeks are read
  only, and their unconfirmed sessions show as missed.
- Generated sessions can be skipped; sessions added by hand can be removed.
  Editing a routine's days deletes its unmoved, still-planned sessions on the
  removed days.
- Work out "today" and the week start in the browser's local time (see
  currentSunday() in WeekPlan.tsx). Do not use toISOString() for this.
- The demo account never writes; its plan data comes from the nightly reset.
- Logged runs and cross training show on the week view as read-only chips.

---

## Strava Integration (RETIRED)
- Retired: Strava's API now requires a paid subscription. The Strava routes 
  and lib/strava were deleted; Settings shows a "retired" notice. Do NOT 
  re-enable without asking.
- Past activities keep source = 'strava' and strava_activity_id; History 
  keeps the Strava source filter and "Synced from Strava" badges
- profiles keeps its strava_* columns; supabase/manual/retire_strava_tokens.sql 
  clears the stored tokens

---

## Component & Styling Conventions
- Background: #0D1117, accent: #C41230, hover: #A10F29
- Amber for PR/goal highlights
- Activity type colors:
  Easy=#3B82F6, Tempo=#F97316, Long=#16A34A, Fartlek=#EAB308
  Hill=#EF4444, Interval=#EC4899
  Bike=#3B82F6, Walk=#16A34A, Stair Master=#F97316
  Swim=#06B6D4, Strength=#9333EA, Stretching=#14B8A6, Yoga=#EC4899,
  Other=#6B7280
- Strava source indicator: orange Zap icon (#FC4C02)
- No inline styles — Tailwind only
- Flame icon (lucide-react) as app logo mark

---

## Data & Calculation Rules
- Pace = Math.round(duration_seconds / distance_miles) → mm:ss format
- Shoe mileage = initial_miles + SUM(runs.distance_miles where shoe_id matches)
- Shoe warning at 350 miles, critical at 400 miles
- WTD = Monday to today, MTD = 1st to today, YTD = Jan 1 to today
- KPI cards (WTD/MTD/YTD/pace) = runs only, not cross training
- PR: is_pr = true if pace beats all prior races at same distance ±0.1 mi

---

## Development Workflow
- npm run dev — local dev
- npx tsc --noEmit — TypeScript check (npm run build has a Windows path casing issue locally, non-blocking on Vercel)
- git push to main → Vercel auto-deploys
- Database changes: SQL editor in Supabase, save as .sql in /supabase/migrations
- Never alter tables in Supabase dashboard table editor directly
- Feature work goes on a branch and is tested on its Vercel preview before
  merging to main
- npm run lint must pass: lint errors fail the Vercel build

---

## Sibling Apps (same Supabase project)
- BatchFlow: business tracker — public schema
- BatchFolio: portfolio tracker — batchfolio schema
