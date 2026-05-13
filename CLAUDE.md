# BatchBurn

## Behavioral Guidelines

1. **Think Before Coding** - State assumptions explicitly before implementing. If multiple interpretations exist, present them. If a simpler approach exists, say so. If something is unclear, stop and ask.

2. **Simplicity First** - Write the minimum code that solves the problem. No features beyond what was asked. No abstractions for single-use code. No speculative flexibility or configurability. If you write 200 lines and it could be 50, rewrite it.

3. **Surgical Changes** - Touch only what you must. Do not improve adjacent code that was not asked about. Do not refactor things that are not broken. Match existing style even if you would do it differently. If you notice unrelated dead code, mention it but do not delete it. Remove imports/variables/functions that YOUR changes made unused - do not remove pre-existing dead code unless asked. Every changed line should trace directly to the user's request.

4. **Goal-Driven Execution** - Transform tasks into verifiable goals. For multi-step tasks, state a brief plan with verify steps. Strong success criteria let you loop independently. Clarifying questions should come before implementation.

## Project Overview
BatchBurn is a personal workout tracking and analytics web app. It supports 
manual activity logging (runs and cross training), Strava OAuth sync with 
automatic Garmin passthrough, shoe mileage tracking with primary shoe 
auto-assignment, race logging with PR detection, goal setting, and rich 
analytics dashboards. Built for mobile-first use with a dark athletic design.

Deployed at: https://batchburn.batch-apps.com
Part of the Batch app ecosystem alongside BatchFlow and BatchFolio.
All three apps share the same Supabase project.

---

## Tech Stack
- **Framework**: Next.js 15.5.14 (App Router, TypeScript) — pinned to 15.x, 
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
/app/(auth)/login        → login page with demo mode and invite-only notice
/app/(auth)/signup       → invite-code gated signup
/app/(auth)/layout.tsx   → centered dark auth layout
/app/(app)/dashboard     → KPI cards (runs only), weekly chart, activity feed,
                           shoe health widget, goal progress rings
/app/(app)/log           → log run + cross training forms (demo: read-only)
/app/(app)/history       → filterable unified activity list, edit/delete, 
                           Strava source filter
/app/(app)/analytics     → pace trend, mileage by type, run type donut, 
                           personal bests, cross training breakdown
/app/(app)/races         → race log with PR detection, edit/delete
/app/(app)/shoes         → shoe tracker, primary shoe, mileage ordering, 
                           edit/delete
/app/(app)/goals         → mileage goals with progress rings, edit/delete
/app/(app)/settings      → profile, Strava connect/disconnect/sync, 
                           primary shoe, danger zone
/app/(app)/admin         → invite management (carsonb1723@gmail.com only)
/app/api/import          → one-time historical data import endpoint
/app/api/strava/callback → OAuth callback, saves tokens, redirects to settings
/app/api/strava/webhook  → Strava webhook: GET verification + POST new activity
/app/api/strava/import   → client-triggered import endpoint (protected)
/app/auth/callback       → Supabase PKCE callback
/components/ui           → shadcn base components
/components/charts       → Recharts wrappers
/components/activity     → LogActivityClient
/components/dashboard    → DashboardClient, KpiCard, ActivityFeed, 
                           ShoeHealthWidget, GoalProgress, WeeklyMileageChart
/components/analytics    → AnalyticsClient and chart components
/components/history      → HistoryClient
/components/settings     → SettingsClient
/components/shoes        → ShoesClient
/lib/supabase/client.ts  → browser client (schema: batchburn)
/lib/supabase/server.ts  → server client (schema: batchburn)
/lib/supabase/admin.ts   → service role client, bypasses RLS, server only
/lib/strava/config.ts    → Strava OAuth config constants
/lib/strava/token.ts     → getValidToken(), saveStravaTokens() with upsert
/lib/strava/mapper.ts    → maps Strava activity types to BatchBurn schema,
                           accepts optional primaryShoeId
/lib/strava/import.ts    → importStravaHistory(), dedup by strava_activity_id,
                           updates existing manual runs with strava_activity_id
/lib/actions.ts          → revalidateAll() server action
/lib/utils/pace.ts       → formatPace(seconds), formatDuration(seconds)
/middleware.ts           → protects app routes, allows /api/strava/* and 
                           /auth/callback through
/supabase/migrations     → schema migration SQL files
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
- **Strava import dedup**: Match by strava_activity_id first; if not found,
  match by same date + distance within 0.1 miles to update existing 
  manual runs instead of duplicating.

---

## Auth & Access Control
- Supabase Auth (email/password), invite-only
- Demo: demo@batchburn.app — read-only, shows amber banner
- Demo restrictions: no log, no edit/delete, no add, no settings changes
- Admin page (/admin) gated to carsonb1723@gmail.com
- Middleware allows /api/strava/webhook, /api/strava/callback, 
  /auth/callback through without auth

---

## Strava Integration
- OAuth 2.0: webhook subscription active
- Callback: /api/strava/callback — saves tokens, redirects to settings
- Import: /api/strava/import — client-triggered, protected route
- Webhook: /api/strava/webhook — real-time new activity push from Strava
- Token refresh: checked before every API call, upserted to profiles
- Primary shoe: fetched from profiles.primary_shoe_id, auto-assigned 
  to Strava runs on import and webhook
- Garmin activities flow through Strava automatically — no separate 
  Garmin integration needed

---

## Component & Styling Conventions
- Background: #0D1117, accent: #C41230, hover: #A10F29
- Amber for PR/goal highlights
- Activity type colors:
  Easy=#3B82F6, Tempo=#F97316, Long=#16A34A, Fartlek=#EAB308
  Hill=#EF4444, Interval=#EC4899
  Bike=#3B82F6, Walk=#16A34A, Stair Master=#F97316
  Swim=#06B6D4, Strength=#9333EA, Yoga=#EC4899, Other=#6B7280
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
- Always push to main branch — never create feature branches

---

## Sibling Apps (same Supabase project)
- BatchFlow: business tracker — public schema
- BatchFolio: portfolio tracker — batchfolio schema
