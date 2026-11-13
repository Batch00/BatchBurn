# BatchBurn strength plan: spec

Written Nov 12 2026 against `main` at `60b8add`. Build with Claude Code CLI on Opus 5.5. This doc is self-contained and lives on the `feat/strength-plan` branch.

## Goal

Strength training follows a regular weekly schedule but is not recorded, so BatchBurn (and BatchBrain, the recaps, and later BatchQuest) has no strength data. This feature lets the owner save routines once, see them laid out for the week, and confirm each one with a tap. A confirmed session becomes a normal Strength activity.

## Decisions already made

| Topic | Decision |
|---|---|
| Detail level | Session level only: a routine is a name and a typical length in minutes. No exercises, sets, reps or weights |
| Logging | Never automatic. The plan creates planned sessions; a workout is recorded only when confirmed |
| Catch-up | Sessions can be confirmed on the day or later, for the current and previous week |
| Unconfirmed | A planned session older than the previous week is shown as missed and never counts |
| Flexibility | A session can be moved to another day, skipped, or added ad hoc on any day (Fridays and weekends have no default) |
| Add-ons | Short extras such as a 10 minute stretch can be ticked onto a session and add to its length |
| Cardio | Not part of the plan. Cardio arrives from the Garmin import |
| Calendar | Week view only in this version. No month calendar |
| Goals | No new goal type in this version |

## What the code looks like today (verified at `60b8add`)

- `Strength` is already a cross-training activity type everywhere: the `cross_training_activity_type_check` constraint, the log and edit forms, History filters, the activity feed colors, goal scopes, and the Analytics cross-training chart. **No activity type work is needed.**
- A cross-training row is inserted from the browser client under RLS with: `user_id, date, activity_type, duration_seconds, distance_miles, distance_km, steps, notes, source` (see `CrossTrainingForm` in `components/activity/LogActivityClient.tsx`). `source` must be one of `manual, strava, import, garmin_csv`.
- The dashboard is mileage based. KPI cards, the weekly chart, and goal rings all sum miles, so Strength rows (no distance) change none of them. The only places that include their time are the "Total Time" card in All Active mode and the per-type cross-training breakdown in Analytics. Both are correct as they are. **No chart changes are needed.**
- The Garmin import maps Garmin's "Strength Training" to `Strength` and treats a distanceless activity as a duplicate when the same date already has a row of the same type (`app/api/import/garmin/route.ts`). So if a lift is ever recorded on the watch as well, the import skips it and nothing double counts.
- Demo mode is read-only and is detected with `user.email === 'demo@batchburn.app'`, passed down as `isDemoUser`.
- After any write, call `revalidateAll()` from `lib/actions.ts`.
- Client code gets today's date with a local-time helper (`todayStr()` in `LogActivityClient.tsx`). Server components use `toISOString()`, which is UTC.
- BatchBrain's `brain.fit_workouts` reads `batchburn.runs` and `batchburn.cross_training`. Confirmed sessions will appear there as `subtype = 'Strength'` with no BatchBrain change.

## Data model

One new migration file, `supabase/migrations/add_strength_plan.sql`, run by hand in the Supabase SQL editor. Draft below. Confirm column types and policy style against the existing tables before finalizing; the repo has no base schema file.

```sql
create table batchburn.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  default_minutes integer not null check (default_minutes between 1 and 600),
  kind text not null default 'session' check (kind in ('session', 'addon')),
  weekdays smallint[] not null default '{}',   -- ISO days, 1 = Monday. Empty = no default day
  addon_default boolean not null default false, -- for kind = addon: pre-ticked on new sessions
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table batchburn.planned_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid references batchburn.routines(id) on delete set null,
  routine_name text not null,                  -- snapshot, survives routine edits
  week_start date not null,                    -- Monday of the week it was generated for
  slot_weekday smallint,                       -- weekday it was generated from; null for ad hoc
  date date not null,                          -- current planned or actual date (changes on move)
  minutes integer not null,
  addons jsonb not null default '[]',          -- [{ "name": "Stretch", "minutes": 10 }]
  status text not null default 'planned' check (status in ('planned', 'done', 'skipped')),
  cross_training_id uuid references batchburn.cross_training(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, routine_id, week_start, slot_weekday)
);

alter table batchburn.routines enable row level security;
alter table batchburn.planned_sessions enable row level security;

create policy "users own routines" on batchburn.routines
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own planned sessions" on batchburn.planned_sessions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on batchburn.routines, batchburn.planned_sessions to authenticated;
```

No grant to `anon`. No new functions.

## Behavior

**Generating the week.** When the plan loads, for the current week and the previous week, make sure one `planned_sessions` row exists for each active `session` routine and each of its `weekdays`. Use an upsert that ignores conflicts on the unique key, so reloading never duplicates and a moved or skipped session is never recreated. New rows copy the routine's name and minutes and pre-tick add-ons where `addon_default` is true. There is no scheduled job.

**Dates.** Work out "today" and the Monday of the week in the browser's local time, the same way `todayStr()` does. Do not use `toISOString()` for this.

**Confirm.** Insert one `cross_training` row, then mark the session done:

- `activity_type = 'Strength'`, `source = 'manual'`, `date` = the session date
- `duration_seconds` = (minutes + ticked add-on minutes) x 60
- `notes` = routine name plus add-ons, for example `Back and biceps + Stretch`
- distance and steps null

Then set `status = 'done'` and `cross_training_id` on the session. If the second write fails, delete the row just inserted and show the error. Before inserting, if a `garmin_csv` Strength row already exists on that date, link the session to it and do not insert. Minutes can be edited at confirm time; the routine's length is only the default.

**Undo.** Delete the linked `cross_training` row and set the session back to `planned`. A session whose linked row was deleted from History (link now null, status still done) is shown as planned.

**Move.** Change `date` to another day in the same week. `slot_weekday` and `week_start` stay as they are.

**Skip.** Set `status = 'skipped'`. Can be reversed.

**Add.** Any day can get an ad hoc session picked from the routine list (`slot_weekday` null).

**Missed.** A session still `planned` after its week and the following week is shown as missed in muted style. Do not change its status and never create an activity for it.

## Screens

1. **Dashboard card, "This week".** Placed above the KPI cards. Seven day columns (stacked on mobile), each showing that day's sessions with name, minutes and state. Tap a planned session to confirm; a small menu offers move, skip, edit minutes and add-ons. A header line shows progress such as "2 of 4 done". Collapsed to a one-line prompt when no routines exist yet, linking to the plan page.
2. **Plan page, `/plan`.** Two parts: the same week view with a previous-week switch for catch-up, and routine management (add, rename, minutes, default weekdays, session or add-on, active toggle, order). Add "Plan" to the desktop sidebar and the mobile "more" menu in `AppShell.tsx`.
3. **Demo user.** Read-only: the card and page render, with no confirm, move, skip, add or edit controls. No demo seed data is required.

Styling follows the existing conventions in `CLAUDE.md` (dark background, crimson accent, purple for Strength, Tailwind only, no inline styles).

## Out of scope

Month calendar, session-count goals, exercise or set tracking, cardio in the plan, any change to charts, KPIs, goals, the Garmin import, or BatchBrain.

## Acceptance checks

- With three routines set to Tuesday, Wednesday, Thursday, opening the dashboard shows three planned sessions this week. Reloading does not add more.
- Confirming one creates exactly one Strength activity of the routine's length on that date. It appears in History and the activity feed, and under Strength in Analytics.
- Confirming a 45 minute routine with a 10 minute Stretch add-on ticked creates one 55 minute activity whose note names both.
- Moving Wednesday's session to Friday shows it on Friday, and reloading does not bring Wednesday back.
- Undo removes the activity and the session shows as planned again.
- Deleting the activity from History also returns the session to planned.
- Mileage KPIs, the weekly chart and goal rings are unchanged before and after.
- The demo account sees the plan and has no write controls.
- `npm run lint` and `npx tsc --noEmit` pass.

## Notes

- **Recaps will show a step up.** BatchBurn's own charts will not move, but BatchBrain's active minutes will rise from the first confirmed week. That is real, not a bug.
- **Stale lines in `CLAUDE.md`.** It still says to always push to main and never create feature branches, which conflicts with the branch workflow now in use, and it still contains em dashes. This work happens on `feat/strength-plan`.
- **Pre-existing, not fixed here.** `app/(app)/dashboard/page.tsx` works out "this week" on the server in UTC, so the week-to-date numbers likely reset on Sunday evening Central time. Fix separately.
- **Next 16 migration.** Do not run it while this branch is open.

## How to run it

1. `git fetch origin` then `git checkout feat/strength-plan`.
2. Start Claude Code on Opus 5.5 and paste the kickoff prompt.
3. Run the SQL in the Supabase SQL editor when asked, then test on the Vercel preview.
4. First use: add routines on the Plan page (for example three 45 minute sessions on Tuesday, Wednesday and Thursday, a 10 minute Abs session on Monday, and Stretch as a 10 minute add-on).

## Kickoff prompt

```
You are on the feat/strength-plan branch. Read docs/strength-plan-spec.md and CLAUDE.md, then build the strength plan feature exactly as the spec describes.

Rules:
- First confirm the "What the code looks like today" section of the spec against the current code. If anything there is no longer true, stop and tell me before building.
- Start in plan mode and show me the plan before writing code.
- Stay on feat/strength-plan. Commit locally as you go, but do not push; I handle that. This overrides the "always push to main" line in CLAUDE.md for this task.
- Put the SQL in supabase/migrations/add_strength_plan.sql for me to run by hand. Do not connect to the database. Tell me when I need to run it.
- Follow the spec's scope. No changes to charts, KPIs, goals, the Garmin import, or existing tables. No new dependencies.
- No em dashes anywhere in code, comments or copy.
- Never commit secrets or env files.
- Lint gates the Vercel build. Run npm run lint and npx tsc --noEmit before you finish.
- When done, list what changed, how you verified it, and each acceptance check with pass or fail.
```
