# BatchBurn

## Project Overview
BatchBurn is a full-stack workout tracking app built with Next.js 15 (App Router),
Supabase, and Tailwind CSS. It supports manual activity logging, Strava OAuth sync,
shoe tracking, race logging, and analytics dashboards. Deployed on Vercel at
batchburn.batch-apps.com. Part of the Batch app ecosystem alongside BatchFlow and
BatchFolio.

---

## Tech Stack
- **Framework**: Next.js 15 (App Router, TypeScript)
- **Database & Auth**: Supabase (PostgreSQL, RLS, Edge Functions)
- **Styling**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod
- **Data Fetching**: TanStack Query (client), React Server Components (server)
- **Deployment**: Vercel

---

## App Structure
/app/(auth)          → login, signup, invite
/app/(app)           → protected routes (dashboard, log, history, analytics,
                       races, shoes, goals, settings)
/app/api/strava      → OAuth callback + webhook handler
/app/api/import      → Excel historical data import
/components/ui       → shadcn base components
/components/charts   → Recharts wrappers
/components/activity → ActivityCard, RunForm, CrossTrainingForm
/components/dashboard → KPI rings, activity feed, widgets
/lib/supabase        → client, server, middleware helpers
/lib/strava          → OAuth flow, API client, token refresh
/lib/utils           → pace calculations, unit conversions, date helpers
/supabase/migrations → all schema changes as versioned migration files
/supabase/functions  → strava-sync edge function

---

## Database Conventions
- All tables include: id (uuid), user_id (uuid, FK to auth.users), created_at
- RLS enabled on every table — users can only access their own rows
- Never store raw Strava tokens in the client — server-side only via
  Supabase service role
- WTD/MTD/YTD mileage is computed on read via query aggregation —
  not stored as columns (exception: historical import rows)
- Pace values stored as integers (seconds) — formatted to mm:ss in the UI layer
- Distance stored in both miles and km — miles is source of truth for display
- All schema changes go through /supabase/migrations — never alter tables
  directly in the Supabase dashboard
- All tables live in the 'batchburn' schema — never use public schema

---

## Auth & Access Control
- Supabase Auth (email/password)
- Invite-only: new signups require a valid invite code
- Demo mode: seeded read-only account available without invite
- Middleware protects all /app routes — redirect unauthenticated users to /login
- Strava tokens stored encrypted in profiles table, refreshed server-side only

---

## Component & Styling Conventions
- Dark-first design — base background #0D1117 (deep navy),
  primary accent #00D4AA (electric teal), PR/goal highlights in amber
- Use shadcn/ui components as the base — extend via Tailwind,
  never override shadcn internals directly
- Activity type color coding: Easy = blue, Tempo = orange,
  Long = deep green, Cross Training = purple
- Charts use Recharts — wrap all chart components in /components/charts
  with consistent theme tokens
- All forms use React Hook Form + Zod schema validation
- No inline styles — Tailwind utility classes only

---

## Data & Calculation Rules
- Pace = duration_seconds / distance_miles → format as mm:ss for display
- WTD = sum of miles from Monday of current week through today
- MTD = sum of miles from 1st of current month through today
- YTD = sum of miles from Jan 1 of current year through today
- Shoe mileage = sum of all run miles where shoe_id matches
- Run type options: Easy, Tempo, Long, Fartlek, Hill, Interval
- Cross training types: Bike, Walk, Stair Master, Swim, Strength, Yoga, Other

---

## Strava Integration
- OAuth 2.0 flow via /app/api/strava/callback
- Access tokens expire every 6 hours — always check expiry and refresh
  before API calls
- On first connect: pull last 200 activities and import as source='strava'
- Webhook at /app/api/strava/webhook handles new activity pushes in real time
- Deduplication: check strava_activity_id before inserting — never double log
- Only import activity types: Run, Walk, Ride, StairStepper, WeightTraining
- Garmin data comes through Strava automatically — no separate Garmin integration

---

## Key Business Rules
- A run must have: date, distance, duration (pace is always derived)
- Shoes have a soft recommended lifespan of 400 miles — show warning at 350
- PR detection on races: flag is_pr = true if distance + time beats any prior
  race of the same distance
- Goals are per period (week/month/year) — only one active goal per
  period type at a time
- Invite codes are single-use — mark used_at and used_by on redemption

---

## Environment Variables
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY       ← server only, never expose to client
STRAVA_CLIENT_ID
STRAVA_CLIENT_SECRET
STRAVA_WEBHOOK_VERIFY_TOKEN
NEXT_PUBLIC_APP_URL             ← used for Strava OAuth redirect URI

---

## Other Projects for Reference
BatchFlow and BatchFolio are sibling apps in this Batch ecosystem sharing
the same Supabase project. BatchFlow uses the 'public' schema, BatchFolio
uses the 'batchfolio' schema, BatchBurn uses the 'batchburn' schema.
BatchBurn has a completely distinct visual identity — dark athletic theme
inspired by Whoop and Strava. Do not replicate BatchFlow or BatchFolio's
color palette or layout patterns.
