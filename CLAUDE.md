# BatchBurn

## Project Overview
BatchBurn is a personal workout tracking and analytics web app. It supports 
manual activity logging (runs and cross training), Strava OAuth sync, shoe 
mileage tracking, race logging with PR detection, goal setting, and rich 
analytics dashboards. Built for mobile-first use with a dark athletic design.

Deployed at: https://batchburn.batch-apps.com
Part of the Batch app ecosystem alongside BatchFlow and BatchFolio.
All three apps share the same Supabase project (BatchFlow project ID: ywfgskwofxxlmrtjzzcg).

---

## Tech Stack
- **Framework**: Next.js 15.5.14 (App Router, TypeScript) — pinned to 15.x, do NOT upgrade to 16
- **Database & Auth**: Supabase (PostgreSQL, RLS, Edge Functions) — shared project with BatchFlow/BatchFolio
- **Styling**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod
- **Data Fetching**: TanStack Query (client), React Server Components (server)
- **Deployment**: Vercel (auto-deploys on push to main)

---

## App Structure
/app/(auth)/login        → login page with demo mode
/app/(auth)/signup       → invite-code gated signup
/app/(auth)/layout.tsx   → centered dark auth layout
/app/(app)/dashboard     → KPI cards, weekly chart, activity feed
/app/(app)/log           → log run + cross training forms
/app/(app)/history       → filterable activity list with edit/delete
/app/(app)/analytics     → pace trend, mileage by type, donut, personal bests
/app/(app)/races         → race log with PR detection
/app/(app)/shoes         → shoe tracker with mileage and lifespan
/app/(app)/goals         → mileage goals with progress rings
/app/(app)/settings      → profile, account, Strava integration, danger zone
/app/(app)/admin         → invite management (carsonb1723@gmail.com only)
/app/api/import          → one-time historical data import endpoint
/app/api/strava          → OAuth callback + webhook handler (to be built)
/app/auth/callback       → Supabase PKCE callback
/components/ui           → shadcn base components
/components/charts       → Recharts wrappers (PaceTrendChart, WeeklyMileageChart, etc.)
/components/activity     → LogActivityClient, activity cards
/components/dashboard    → DashboardClient, KpiCard, ActivityFeed, ShoeHealthWidget, GoalProgress
/components/analytics    → AnalyticsClient and chart components
/lib/supabase/client.ts  → browser Supabase client (schema: batchburn)
/lib/supabase/server.ts  → server Supabase client (schema: batchburn)
/lib/supabase/admin.ts   → service role client — bypasses RLS, server only
/lib/actions.ts          → server actions for revalidating paths after mutations
/lib/utils/pace.ts       → formatPace(seconds), formatDuration(seconds)
/middleware.ts           → protects all /dashboard, /log, /history etc routes
/supabase/migrations     → schema migration files
/public/manifest.json    → PWA manifest
/public/icons            → PWA icons (192, 512)

---

## Database — Supabase Project: ywfgskwofxxlmrtjzzcg
BatchBurn uses the 'batchburn' schema. Never use the public schema.
BatchFlow uses 'public', BatchFolio uses 'batchfolio' — do not touch those.

Tables in batchburn schema:
- profiles (user_id, display_name, invite_code_used, is_demo, strava_*)
- runs (date, distance_miles, distance_km, duration_seconds, pace_per_mile_seconds, run_type, shoe_id, notes, strava_activity_id, source)
- cross_training (date, activity_type, distance_miles, distance_km, steps, duration_seconds, pace_per_mile_seconds, notes, strava_activity_id, source)
- races (event_name, date, distance_miles, duration_seconds, is_pr, pace_per_mile_seconds, overall_place, overall_competitors, age_group_place, age_group_competitors, shoe_id, notes)
- shoes (name, price_usd, initial_miles, purchase_date, retired_date, is_active, notes)
- goals (goal_type, period, target_value, target_date, is_active)
- invites (code, created_by, used_by, used_at)

RLS is enabled on every table — users can only access their own rows.
All tables include: id (uuid), user_id (uuid FK to auth.users), created_at.

---

## Critical Lessons Learned
- **Next.js version**: ALWAYS stay on 15.x. Next.js 16 has a known 
  /_global-error prerender bug that breaks builds. Never upgrade beyond 15.x.
- **React Hook Form + Zod**: Never use useForm<Type> with explicit generic. 
  Always use useForm() with no generic and let TypeScript infer from zodResolver.
  Always use z.coerce.number() for numeric fields, never z.number().
- **Supabase schema**: The batchburn schema is exposed via the Data API UI 
  (Integrations → Data API → Settings → Exposed schemas). Never run 
  ALTER ROLE authenticator SET pgrst.db_schemas via SQL — this overrides 
  the UI and breaks all schemas. Always manage schema exposure through 
  the UI only.
- **Server actions**: After any database mutation use revalidateAll() from 
  lib/actions.ts to refresh server component data across pages.

---

## Auth & Access Control
- Supabase Auth (email/password)
- Invite-only: new signups require a valid invite code from batchburn.invites
- Demo mode: demo@batchburn.app / demo1234 — read-only account
- Demo restrictions: cannot log activities, edit/delete, add shoes/races/goals,
  or change settings. Shows amber demo banner on all pages.
- Admin page (/admin) gated to carsonb1723@gmail.com
- Middleware protects all /app routes

---

## Component & Styling Conventions
- Dark-first design: background #0D1117, primary accent #C41230 (crimson),
  hover #A10F29, amber for PR/goal highlights
- Activity type colors:
  Easy = #3B82F6, Tempo = #F97316, Long = #16A34A
  Fartlek = #EAB308, Hill = #EF4444, Interval = #EC4899
  Bike = #3B82F6, Walk = #16A34A, Stair Master = #F97316
  Swim = #06B6D4, Strength = #9333EA, Yoga = #EC4899, Other = #6B7280
- shadcn/ui components as base — extend via Tailwind only
- No inline styles — Tailwind utility classes only
- Flame icon (lucide-react) used as app logo mark

---

## Data & Calculation Rules
- Pace = duration_seconds / distance_miles → format as mm:ss
- WTD = sum of miles from Monday of current week through today
- MTD = sum of miles from 1st of current month through today
- YTD = sum of miles from Jan 1 of current year through today
- Shoe mileage = initial_miles + SUM(runs.distance_miles where shoe_id matches)
- Shoe lifespan warning at 350 miles, critical at 400 miles
- PR detection: is_pr = true if pace beats all prior races at same distance
- Goals: only one active goal per period type at a time

---

## Strava Integration (Planned — Not Yet Built)
- OAuth 2.0 flow via /app/api/strava/callback
- Access tokens expire every 6 hours — always refresh before API calls
- On first connect: pull last 200 activities, import as source='strava'
- Webhook at /app/api/strava/webhook for real-time new activity sync
- Deduplication: check strava_activity_id before inserting
- Garmin data syncs through Strava automatically
- Strava tokens stored in batchburn.profiles, server-side only

---

## Environment Variables
NEXT_PUBLIC_SUPABASE_URL=https://ywfgskwofxxlmrtjzzcg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_BTr5L3hcM4gks1lN8l64Cg_26uzzuCy
SUPABASE_SERVICE_ROLE_KEY= (server only, never expose to client)
STRAVA_CLIENT_ID= (not yet configured)
STRAVA_CLIENT_SECRET= (not yet configured)
STRAVA_WEBHOOK_VERIFY_TOKEN= (not yet configured)
NEXT_PUBLIC_APP_URL=https://batchburn.batch-apps.com

---

## Development Workflow
- Local dev: npm run dev
- Build check: npm run build (must pass before committing)
- Deploy: git push to main → Vercel auto-deploys
- Database changes: use Supabase SQL editor directly, 
  document changes in /supabase/migrations as .sql files
- Never alter tables directly in Supabase dashboard table editor

---

## Sibling Apps
- BatchFlow: business project tracker — public schema — batchflow.batch-apps.com
- BatchFolio: portfolio tracker — batchfolio schema — batchfolio.batch-apps.com
- All three share Supabase project ywfgskwofxxlmrtjzzcg and auth.users
